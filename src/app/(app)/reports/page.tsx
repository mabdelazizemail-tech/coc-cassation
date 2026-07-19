import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADE_LABELS, DOC_STATUS_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import type { JudicialGrade, DocumentStatus } from "@prisma/client";

// Executive dashboards + standard reports (Section 8).
export default async function ReportsPage() {
  await getSession();

  const [byGrade, byStatus, byCourt, sanctions, cycle] = await Promise.all([
    prisma.judge.groupBy({ by: ["grade"], _count: true }),
    prisma.councilDocument.groupBy({ by: ["status"], _count: true }),
    prisma.judge.groupBy({ by: ["currentCourtId"], _count: true }),
    prisma.sanction.count(),
    prisma.movementCycle.findFirst({ orderBy: { createdAt: "desc" }, include: { _count: { select: { allocations: true, wishes: true } } } }),
  ]);

  const courts = await prisma.court.findMany();
  const courtName = (id: string | null) => courts.find((c) => c.id === id)?.name ?? "غير مسكّن";
  const maxGrade = Math.max(1, ...byGrade.map((g) => g._count));

  return (
    <div>
      <PageHeader title="التقارير ولوحات المعلومات" subtitle="القسم الثامن — منظومة التقارير التنفيذية" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-bold text-foreground mb-4">توزيع القضاة حسب الدرجة</h2>
          <div className="space-y-3">
            {byGrade.map((g) => (
              <div key={g.grade}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{GRADE_LABELS[g.grade as JudicialGrade]}</span>
                  <span className="font-bold">{g._count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${(g._count / maxGrade) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-foreground mb-4">مستندات المجلس حسب الحالة</h2>
          <div className="space-y-2 text-sm">
            {byStatus.map((s) => (
              <div key={s.status} className="flex justify-between border-b pb-1">
                <span>{DOC_STATUS_LABELS[s.status as DocumentStatus]}</span>
                <span className="font-bold">{s._count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-foreground mb-4">توزيع القضاة حسب المحكمة</h2>
          <div className="space-y-2 text-sm">
            {byCourt.map((c) => (
              <div key={c.currentCourtId ?? "none"} className="flex justify-between border-b pb-1">
                <span>{courtName(c.currentCourtId)}</span>
                <span className="font-bold">{c._count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-foreground mb-4">مؤشرات عامة</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>إجمالي الجزاءات المسجّلة: <b>{sanctions}</b></li>
            <li>دورة الحركة الحالية: <b>{cycle?.judicialYear ?? "—"}</b></li>
            <li>عدد الرغبات المدخلة: <b>{cycle?._count.wishes ?? 0}</b></li>
            <li>عدد المسكّنين: <b>{cycle?._count.allocations ?? 0}</b></li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            منشئ التقارير المخصصة والتصدير إلى PDF/Excel والجدولة عبر البريد (8.3) مخطط له
            في الإصدار التالي، ويعتمد على تأكيد تكامل بوابة البريد (سؤال الاستيضاح RPT-2).
          </p>
        </div>
      </div>
    </div>
  );
}
