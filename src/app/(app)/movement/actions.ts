"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { runAllocation, persistAllocation } from "@/lib/allocation";

// Judge submits/updates ranked wishes (Section 6.2.2).
export async function saveWishes(formData: FormData) {
  const session = (await getSession())!;
  if (!can(session.role, "movement.enterWishes") || !session.judgeId) throw new Error("غير مصرح");
  const cycleId = String(formData.get("cycleId"));

  const cycle = await prisma.movementCycle.findUniqueOrThrow({ where: { id: cycleId } });
  if (cycle.status !== "wishes_open") throw new Error("فترة إدخال الرغبات مغلقة");

  const picks: string[] = [];
  for (let r = 1; r <= cycle.maxWishes; r++) {
    const courtId = String(formData.get(`wish_${r}`) || "");
    if (courtId) picks.push(courtId);
  }

  await prisma.$transaction([
    prisma.movementWish.deleteMany({ where: { cycleId, judgeId: session.judgeId! } }),
    ...picks.map((courtId, i) =>
      prisma.movementWish.create({
        data: { cycleId, judgeId: session.judgeId!, courtId, rank: i + 1 },
      })
    ),
  ]);
  await writeAudit({ actorId: session.id, action: "SAVE_WISHES", entity: "MovementCycle", entityId: cycleId });
  revalidatePath("/movement");
}

// Secretary General / admin runs the automatic allocation (Section 6.2.3).
export async function runAllocationAction(cycleId: string) {
  const session = (await getSession())!;
  if (!can(session.role, "movement.manage")) throw new Error("غير مصرح");
  const results = await runAllocation(cycleId);
  await persistAllocation(cycleId, results);
  await prisma.movementCycle.update({ where: { id: cycleId }, data: { status: "allocated" } });
  await writeAudit({ actorId: session.id, action: "RUN_ALLOCATION", entity: "MovementCycle", entityId: cycleId, detail: `${results.length} judges` });
  revalidatePath("/movement");
}

// Manual override of a placement (Section 6.2.4 / 6.2.5).
export async function overrideAllocation(formData: FormData) {
  const session = (await getSession())!;
  if (!can(session.role, "movement.manage")) throw new Error("غير مصرح");
  const cycleId = String(formData.get("cycleId"));
  const judgeId = String(formData.get("judgeId"));
  const courtId = String(formData.get("courtId"));
  const reason = String(formData.get("reason") || "");

  await prisma.movementAllocation.upsert({
    where: { cycleId_judgeId: { cycleId, judgeId } },
    update: { courtId, isManual: true, isLocked: true, overrideReason: reason },
    create: { cycleId, judgeId, courtId, isManual: true, isLocked: true, overrideReason: reason, score: 0 },
  });
  await writeAudit({ actorId: session.id, action: "OVERRIDE_ALLOCATION", entity: "MovementCycle", entityId: cycleId, detail: `judge ${judgeId} → court ${courtId}` });
  revalidatePath("/movement");
}

// Approve the cycle and update judges' current court (Section 6.2.5).
export async function approveCycle(cycleId: string) {
  const session = (await getSession())!;
  if (!can(session.role, "movement.approve")) throw new Error("غير مصرح");
  const allocations = await prisma.movementAllocation.findMany({ where: { cycleId } });
  await prisma.$transaction([
    ...allocations
      .filter((a) => a.courtId)
      .map((a) =>
        prisma.judge.update({ where: { id: a.judgeId }, data: { currentCourtId: a.courtId } })
      ),
    prisma.movementCycle.update({ where: { id: cycleId }, data: { status: "approved", approvedAt: new Date() } }),
  ]);
  await writeAudit({ actorId: session.id, action: "APPROVE_CYCLE", entity: "MovementCycle", entityId: cycleId });
  revalidatePath("/movement");
}

export async function setCycleStatus(cycleId: string, status: string) {
  const session = (await getSession())!;
  if (!can(session.role, "movement.manage")) throw new Error("غير مصرح");
  await prisma.movementCycle.update({ where: { id: cycleId }, data: { status } });
  revalidatePath("/movement");
}
