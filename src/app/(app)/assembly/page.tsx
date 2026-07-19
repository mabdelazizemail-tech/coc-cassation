import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADE_LABELS } from "@/lib/constants";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function AssemblyPage() {
  await getSession();
  const cycle = await prisma.assemblyCycle.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      candidates: { include: { judge: { include: { currentCourt: true } } } },
    },
  });

  if (!cycle) return <EmptyState>لا توجد دورة جمعية عامة.</EmptyState>;

  return (
    <div>
      <PageHeader
        title="الجمعية العامة لمحكمة النقض"
        subtitle={`الوحدة الرابعة — دورة ${cycle.judicialYear} — ${cycle.candidates.length} مرشح`}
      />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="th">#</th>
              <th className="th">الاسم</th>
              <th className="th">الدرجة</th>
              <th className="th">المحكمة</th>
              <th className="th">السيرة الذاتية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cycle.candidates.map((c, i) => (
              <tr key={c.id} className="hover:bg-muted/40">
                <td className="td">{i + 1}</td>
                <td className="td font-medium">{c.judge?.fullNameAr ?? c.manualName}</td>
                <td className="td">{c.judge ? GRADE_LABELS[c.judge.grade] : "—"}</td>
                <td className="td">{c.judge?.currentCourt?.name ?? "—"}</td>
                <td className="td">
                  {c.judge && (
                    <Link href={`/assembly/${c.id}`} className="text-primary hover:underline">عرض السيرة</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
