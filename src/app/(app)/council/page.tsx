import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DOC_STATUS_LABELS, DOC_STATUS_ORDER } from "@/lib/constants";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import type { Prisma } from "@prisma/client";

export default async function CouncilPage() {
  const session = (await getSession())!;

  // Council members see only documents assigned to them (Section 5.3.2).
  const where: Prisma.CouncilDocumentWhereInput =
    session.role === "COUNCIL_MEMBER" ? { assignedToId: session.id } : {};

  const docs = await prisma.councilDocument.findMany({
    where,
    include: { judge: true, assignedTo: true },
    orderBy: { receivedAt: "desc" },
  });

  const counts = DOC_STATUS_ORDER.map((s) => ({
    status: s,
    label: DOC_STATUS_LABELS[s],
    count: docs.filter((d) => d.status === s).length,
  }));

  return (
    <div>
      <PageHeader title="رول المجلس" subtitle="الوحدة الثانية — دورة حياة مستندات مجلس محكمة النقض" />

      <div className="flex flex-wrap gap-2 mb-4">
        {counts.map((c) => (
          <div key={c.status} className="card px-4 py-2 text-sm">
            <StatusBadge status={c.status} label={c.label} /> <span className="font-bold mr-1">{c.count}</span>
          </div>
        ))}
      </div>

      {docs.length === 0 ? (
        <EmptyState>لا توجد مستندات ضمن نطاقك.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="th">المرجع</th>
                <th className="th">العنوان</th>
                <th className="th">القاضي المرتبط</th>
                <th className="th">العضو المسند إليه</th>
                <th className="th">الحالة</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-muted/40">
                  <td className="td font-mono text-xs">{d.reference}</td>
                  <td className="td font-medium text-foreground">{d.title}</td>
                  <td className="td">{d.judge?.fullNameAr ?? "—"}</td>
                  <td className="td">{d.assignedTo?.fullName ?? "—"}</td>
                  <td className="td"><StatusBadge status={d.status} label={DOC_STATUS_LABELS[d.status]} /></td>
                  <td className="td">
                    <Link href={`/council/${d.id}`} className="text-primary hover:underline">فتح</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
