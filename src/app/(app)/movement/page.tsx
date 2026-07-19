import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { GRADE_LABELS } from "@/lib/constants";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import {
  runAllocationAction, approveCycle, setCycleStatus, saveWishes, overrideAllocation,
} from "./actions";

const CYCLE_STATUS: Record<string, string> = {
  draft: "مسودة", needs: "تحديد الاحتياجات", wishes_open: "إدخال الرغبات مفتوح",
  wishes_closed: "الرغبات مغلقة", allocated: "تم التوزيع", approved: "معتمد",
};

export default async function MovementPage() {
  const session = (await getSession())!;
  const cycle = await prisma.movementCycle.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      rules: true,
      needs: { include: { court: true } },
      allocations: { include: { judge: true, court: true } },
      _count: { select: { wishes: true } },
    },
  });

  if (!cycle) return <EmptyState>لا توجد دورة حركة قضائية.</EmptyState>;

  const courts = await prisma.court.findMany({ orderBy: { name: "asc" } });
  const totalRequired = cycle.needs.reduce((s, n) => s + n.required, 0);
  const satisfied = cycle.allocations.filter((a) => a.wishRankMet === 1).length;

  // Judge's own wishes for the entry form.
  const myWishes = session.judgeId
    ? await prisma.movementWish.findMany({
        where: { cycleId: cycle.id, judgeId: session.judgeId },
        orderBy: { rank: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="الحركة القضائية"
        subtitle={`الوحدة الثالثة — دورة ${cycle.judicialYear} (${CYCLE_STATUS[cycle.status] ?? cycle.status})`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="إجمالي الاحتياج" value={totalRequired} hint="عبر جميع المحاكم" />
        <StatCard label="عدد الرغبات المدخلة" value={cycle._count.wishes} />
        <StatCard label="تم تسكينهم" value={cycle.allocations.length} />
        <StatCard label="تحقيق الرغبة الأولى" value={satisfied} hint="من إجمالي المسكّنين" />
      </div>

      {/* Judge wish entry */}
      {can(session.role, "movement.enterWishes") && cycle.status === "wishes_open" && (
        <form action={saveWishes} className="card p-6 mb-6 max-w-xl">
          <h3 className="font-bold text-foreground mb-3">إدخال الرغبات (مرتبة حسب الأولوية)</h3>
          <input type="hidden" name="cycleId" value={cycle.id} />
          <div className="space-y-3">
            {Array.from({ length: cycle.maxWishes }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-16 text-sm text-muted-foreground">الرغبة {i + 1}</span>
                <select name={`wish_${i + 1}`} defaultValue={myWishes[i]?.courtId ?? ""} className="input">
                  <option value="">—</option>
                  {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button className="btn-primary mt-4" type="submit">حفظ الرغبات</button>
        </form>
      )}

      {/* Admin controls */}
      {can(session.role, "movement.manage") && (
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-foreground mb-3">إدارة الدورة</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <form action={setCycleStatus.bind(null, cycle.id, "wishes_closed")}>
              <button className="btn-ghost" type="submit">إغلاق الرغبات</button>
            </form>
            <form action={runAllocationAction.bind(null, cycle.id)}>
              <button className="btn-primary" type="submit">تشغيل التوزيع التلقائي</button>
            </form>
            {can(session.role, "movement.approve") && (
              <form action={approveCycle.bind(null, cycle.id)}>
                <button className="btn-gold" type="submit">اعتماد الحركة</button>
              </form>
            )}
          </div>

          {/* Weighting rules (configurable) */}
          <div className="text-sm">
            <div className="font-semibold text-muted-foreground mb-2">قواعد التوزيع (الأوزان)</div>
            <div className="flex flex-wrap gap-2">
              {cycle.rules.map((r) => (
                <span key={r.id} className="badge bg-brand-50 text-primary">
                  {r.description}: {r.isHardConstraint ? "قيد صارم" : `${r.weight}%`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Allocation results */}
      {cycle.allocations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/50 font-bold text-foreground">نتيجة التوزيع</div>
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="th">القاضي</th>
                <th className="th">الدرجة</th>
                <th className="th">المحكمة المسكّن بها</th>
                <th className="th">الرغبة المحققة</th>
                <th className="th">الدرجة الحسابية</th>
                <th className="th">النوع</th>
                {can(session.role, "movement.manage") && <th className="th">تعديل</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cycle.allocations.map((a) => (
                <tr key={a.id} className="hover:bg-muted/40">
                  <td className="td font-medium">{a.judge.fullNameAr}</td>
                  <td className="td">{GRADE_LABELS[a.judge.grade]}</td>
                  <td className="td">{a.court.name}</td>
                  <td className="td">{a.wishRankMet ? `الرغبة ${a.wishRankMet}` : "لم تتحقق"}</td>
                  <td className="td">{a.score.toFixed(2)}</td>
                  <td className="td">
                    {a.isLocked ? <span className="badge bg-primary/10 text-primary">يدوي مثبّت</span>
                      : <span className="badge bg-muted text-muted-foreground">تلقائي</span>}
                  </td>
                  {can(session.role, "movement.manage") && (
                    <td className="td">
                      <form action={overrideAllocation} className="flex items-center gap-1">
                        <input type="hidden" name="cycleId" value={cycle.id} />
                        <input type="hidden" name="judgeId" value={a.judgeId} />
                        <select name="courtId" defaultValue={a.courtId} className="input !py-1 !text-xs w-32">
                          {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input name="reason" placeholder="السبب" className="input !py-1 !text-xs w-24" />
                        <button className="btn-ghost !py-1 !text-xs" type="submit">تثبيت</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
