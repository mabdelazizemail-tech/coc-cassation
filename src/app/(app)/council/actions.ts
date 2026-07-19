"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import type { DocumentStatus, VoteChoice } from "@prisma/client";

async function transition(
  documentId: string,
  toStatus: DocumentStatus,
  actorId: string,
  note?: string
) {
  const doc = await prisma.councilDocument.findUniqueOrThrow({ where: { id: documentId } });
  await prisma.$transaction([
    prisma.councilDocument.update({ where: { id: documentId }, data: { status: toStatus } }),
    prisma.documentHistory.create({
      data: { documentId, fromStatus: doc.status, toStatus, actorId, note },
    }),
  ]);
  await writeAudit({ actorId, action: "STATUS_CHANGE", entity: "CouncilDocument", entityId: documentId, detail: `${doc.status} → ${toStatus}` });
}

// Secretary General assigns a document to a council member (Section 5.3.1).
export async function assignDocument(formData: FormData) {
  const session = (await getSession())!;
  if (!can(session.role, "council.manage")) throw new Error("غير مصرح");
  const documentId = String(formData.get("documentId"));
  const memberId = String(formData.get("memberId"));
  const dueDays = Number(formData.get("dueDays") || 7);

  const doc = await prisma.councilDocument.update({
    where: { id: documentId },
    data: { assignedToId: memberId, dueDate: new Date(Date.now() + dueDays * 864e5) },
  });

  // Grant temporary, document-scoped access to the linked judge file (9.3).
  if (doc.judgeId) {
    await prisma.temporaryAccess.create({
      data: { userId: memberId, judgeId: doc.judgeId, documentId, reason: "إسناد مستند", isActive: true },
    });
  }
  await transition(documentId, "DISTRIBUTED", session.id, "إسناد المستند للعضو");
  revalidatePath("/council");
}

// Council member records a recommendation (Section 5.3.2).
export async function submitRecommendation(formData: FormData) {
  const session = (await getSession())!;
  if (!can(session.role, "council.decide")) throw new Error("غير مصرح");
  const documentId = String(formData.get("documentId"));
  const recommendation = String(formData.get("recommendation"));
  await prisma.councilDocument.update({ where: { id: documentId }, data: { recommendation } });
  await transition(documentId, "UNDER_REVIEW", session.id, "تقديم التوصية");
  revalidatePath(`/council/${documentId}`);
}

// Deputy Secretary reviews and sends to voting (Section 5.3.3).
export async function reviewDocument(formData: FormData) {
  const session = (await getSession())!;
  if (!can(session.role, "council.review")) throw new Error("غير مصرح");
  const documentId = String(formData.get("documentId"));
  const reviewNotes = String(formData.get("reviewNotes") || "");
  const action = String(formData.get("decision")); // to_voting | return
  await prisma.councilDocument.update({ where: { id: documentId }, data: { reviewNotes } });
  await transition(
    documentId,
    action === "return" ? "UNDER_STUDY" : "IN_VOTING",
    session.id,
    action === "return" ? "إعادة للعضو للتعديل" : "إحالة للتصويت"
  );
  revalidatePath(`/council/${documentId}`);
}

// Council member casts a vote (Section 5.4).
export async function castVote(formData: FormData) {
  const session = (await getSession())!;
  if (!can(session.role, "council.decide")) throw new Error("غير مصرح");
  const documentId = String(formData.get("documentId"));
  const choice = String(formData.get("choice")) as VoteChoice;
  await prisma.vote.upsert({
    where: { documentId_memberId: { documentId, memberId: session.id } },
    update: { choice },
    create: { documentId, memberId: session.id, choice },
  });
  await writeAudit({ actorId: session.id, action: "VOTE", entity: "CouncilDocument", entityId: documentId });
  revalidatePath(`/council/${documentId}`);
}

// Secretary General creates the execution form and closes the loop (Section 5.3.4).
export async function createExecution(formData: FormData) {
  const session = (await getSession())!;
  if (!can(session.role, "council.manage")) throw new Error("غير مصرح");
  const documentId = String(formData.get("documentId"));
  const doc = await prisma.councilDocument.findUniqueOrThrow({ where: { id: documentId } });

  await prisma.executionForm.upsert({
    where: { documentId },
    update: {},
    create: {
      documentId,
      decisionNo: `DEC-${new Date().getFullYear()}-${doc.reference.split("-").pop()}`,
      decisionDate: new Date(),
      actionRequired: String(formData.get("actionRequired") || ""),
      targetEntity: String(formData.get("targetEntity") || ""),
      sentAt: new Date(),
      signedBy: session.fullName,
    },
  });
  await transition(documentId, "IN_EXECUTION", session.id, "إنشاء نموذج التنفيذ وإرساله");

  // Auto-revoke temporary access tied to this document (9.3).
  await prisma.temporaryAccess.updateMany({
    where: { documentId, isActive: true },
    data: { isActive: false, revokedAt: new Date() },
  });
  revalidatePath(`/council/${documentId}`);
}

export async function closeDocument(documentId: string) {
  const session = (await getSession())!;
  if (!can(session.role, "council.manage")) throw new Error("غير مصرح");
  await transition(documentId, "CLOSED", session.id, "إغلاق الملف");
  revalidatePath("/council");
}
