import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { DOC_STATUS_LABELS, DOC_STATUS_ORDER, VOTE_LABELS } from "@/lib/constants";
import { PageHeader, StatusBadge } from "@/components/ui";
import {
  assignDocument, submitRecommendation, reviewDocument,
  castVote, createExecution, closeDocument,
} from "../actions";

function d(x?: Date | null) {
  return x ? x.toLocaleDateString("ar-EG") : "—";
}

export default async function CouncilDoc({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const doc = await prisma.councilDocument.findUnique({
    where: { id: params.id },
    include: {
      judge: true, assignedTo: true, executionForm: true,
      votes: { include: { member: true } },
      history: { orderBy: { createdAt: "asc" }, },
    },
  });
  if (!doc) notFound();

  const members = await prisma.user.findMany({ where: { role: "COUNCIL_MEMBER" } });
  const isMine = doc.assignedToId === session.id;

  // Vote tally (secrecy: individual choices only visible to full-authority — M2-4).
  const tally = {
    APPROVE: doc.votes.filter((v) => v.choice === "APPROVE").length,
    REJECT: doc.votes.filter((v) => v.choice === "REJECT").length,
    ABSTAIN: doc.votes.filter((v) => v.choice === "ABSTAIN").length,
  };
  const canSeeIndividualVotes = can(session.role, "audit.view");

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={doc.title}
        subtitle={`${doc.reference} — ${doc.type ?? ""}`}
        action={<Link href="/council" className="btn-ghost">← عودة</Link>}
      />

      {/* Workflow progress */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between overflow-x-auto gap-1">
          {DOC_STATUS_ORDER.map((s, i) => {
            const done = DOC_STATUS_ORDER.indexOf(doc.status) >= i;
            return (
              <div key={s} className="flex items-center gap-1 shrink-0">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                <span className={`text-xs ${done ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>{DOC_STATUS_LABELS[s]}</span>
                {i < DOC_STATUS_ORDER.length - 1 && <span className="text-muted-foreground/60">—</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={doc.status} label={DOC_STATUS_LABELS[doc.status]} />
              {doc.dueDate && <span className="text-xs text-muted-foreground">المهلة: {d(doc.dueDate)}</span>}
            </div>
            <p className="text-foreground/80 text-sm leading-relaxed">{doc.summary}</p>
            <div className="mt-3 text-sm text-muted-foreground">
              القاضي المرتبط: {doc.judge ? <Link href={`/judges/${doc.judgeId}`} className="text-primary hover:underline">{doc.judge.fullNameAr}</Link> : "—"}
            </div>
            {doc.recommendation && (
              <div className="mt-4 bg-warning/10 rounded-lg p-3 text-sm">
                <div className="font-semibold text-gold-dark mb-1">توصية العضو</div>
                {doc.recommendation}
              </div>
            )}
            {doc.reviewNotes && (
              <div className="mt-2 bg-muted rounded-lg p-3 text-sm">
                <div className="font-semibold text-primary mb-1">ملاحظات المراجعة</div>
                {doc.reviewNotes}
              </div>
            )}
          </div>

          {/* Action panels by stage + role */}
          {can(session.role, "council.manage") && doc.status === "RECEIVED" && (
            <form action={assignDocument} className="card p-6 space-y-3">
              <h3 className="font-bold text-foreground">إسناد المستند (الأمين العام)</h3>
              <input type="hidden" name="documentId" value={doc.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">العضو</label>
                  <select name="memberId" className="input" required>
                    <option value="">اختر عضواً</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">المهلة (أيام)</label>
                  <input name="dueDays" type="number" defaultValue={7} className="input" />
                </div>
              </div>
              <button className="btn-primary" type="submit">إسناد ومنح صلاحية الاطلاع</button>
            </form>
          )}

          {can(session.role, "council.decide") && isMine && (doc.status === "DISTRIBUTED" || doc.status === "UNDER_STUDY") && (
            <form action={submitRecommendation} className="card p-6 space-y-3">
              <h3 className="font-bold text-foreground">تقديم التوصية (عضو المجلس)</h3>
              <input type="hidden" name="documentId" value={doc.id} />
              <textarea name="recommendation" className="input" rows={4} required defaultValue={doc.recommendation ?? ""} placeholder="اكتب توصيتك..." />
              <button className="btn-primary" type="submit">إرسال للمراجعة</button>
            </form>
          )}

          {can(session.role, "council.review") && doc.status === "UNDER_REVIEW" && (
            <form action={reviewDocument} className="card p-6 space-y-3">
              <h3 className="font-bold text-foreground">مراجعة التوصية (الأمين العام المساعد)</h3>
              <input type="hidden" name="documentId" value={doc.id} />
              <textarea name="reviewNotes" className="input" rows={3} placeholder="ملاحظات المراجعة (اختياري)" />
              <div className="flex gap-2">
                <button className="btn-primary" name="decision" value="to_voting" type="submit">إحالة للتصويت</button>
                <button className="btn-ghost" name="decision" value="return" type="submit">إعادة للعضو</button>
              </div>
            </form>
          )}

          {can(session.role, "council.decide") && doc.status === "IN_VOTING" && (
            <form action={castVote} className="card p-6 space-y-3">
              <h3 className="font-bold text-foreground">التصويت</h3>
              <input type="hidden" name="documentId" value={doc.id} />
              <div className="flex gap-2">
                <button className="btn bg-success text-success-foreground hover:bg-success/90" name="choice" value="APPROVE" type="submit">موافقة</button>
                <button className="btn bg-destructive text-destructive-foreground hover:bg-destructive/90" name="choice" value="REJECT" type="submit">رفض</button>
                <button className="btn-ghost" name="choice" value="ABSTAIN" type="submit">امتناع</button>
              </div>
            </form>
          )}

          {can(session.role, "council.manage") && doc.status === "IN_VOTING" && (
            <form action={createExecution} className="card p-6 space-y-3">
              <h3 className="font-bold text-foreground">نموذج التنفيذ (الأمين العام)</h3>
              <input type="hidden" name="documentId" value={doc.id} />
              <div>
                <label className="label">الإجراء المطلوب</label>
                <input name="actionRequired" className="input" required />
              </div>
              <div>
                <label className="label">الجهة المرسل إليها</label>
                <input name="targetEntity" className="input" required />
              </div>
              <button className="btn-primary" type="submit">إنشاء وإرسال نموذج التنفيذ</button>
            </form>
          )}

          {can(session.role, "council.manage") && doc.status === "IN_EXECUTION" && (
            <form action={closeDocument.bind(null, doc.id)} className="card p-6">
              <button className="btn-primary" type="submit">تأكيد الاستلام وإغلاق الملف</button>
            </form>
          )}

          {doc.executionForm && (
            <div className="card p-6">
              <h3 className="font-bold text-foreground mb-2">نموذج التنفيذ</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>رقم القرار: {doc.executionForm.decisionNo}</div>
                <div>التاريخ: {d(doc.executionForm.decisionDate)}</div>
                <div>الإجراء: {doc.executionForm.actionRequired}</div>
                <div>الجهة: {doc.executionForm.targetEntity}</div>
                <div>التوقيع: {doc.executionForm.signedBy}</div>
              </div>
            </div>
          )}
        </div>

        {/* Side column: votes + history */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold text-foreground mb-3">نتيجة التصويت</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-success">موافقة</span><span className="font-bold">{tally.APPROVE}</span></div>
              <div className="flex justify-between"><span className="text-destructive">رفض</span><span className="font-bold">{tally.REJECT}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">امتناع</span><span className="font-bold">{tally.ABSTAIN}</span></div>
            </div>
            {canSeeIndividualVotes && doc.votes.length > 0 && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
                <div className="font-semibold">تفصيل (للتدقيق فقط):</div>
                {doc.votes.map((v) => (
                  <div key={v.id} className="flex justify-between">
                    <span>{v.member.fullName}</span>
                    <span>{VOTE_LABELS[v.choice]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-foreground mb-3">سجل المستند</h3>
            <ol className="space-y-2 text-xs text-muted-foreground">
              {doc.history.map((h) => (
                <li key={h.id} className="flex gap-2">
                  <span className="text-muted-foreground/60">•</span>
                  <div>
                    <div className="text-foreground/80">{DOC_STATUS_LABELS[h.toStatus]}</div>
                    <div>{h.note} — {d(h.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
