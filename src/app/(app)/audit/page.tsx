import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function AuditPage() {
  const session = (await getSession())!;
  if (!can(session.role, "audit.view")) redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="سجل التدقيق" subtitle="القسم 9.2 — تتبّع جميع الإجراءات على النظام" />
      {logs.length === 0 ? (
        <EmptyState>لا توجد سجلات بعد.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="th">التاريخ</th>
                <th className="th">المستخدم</th>
                <th className="th">الإجراء</th>
                <th className="th">الكيان</th>
                <th className="th">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/40">
                  <td className="td text-xs">{l.createdAt.toLocaleString("ar-EG")}</td>
                  <td className="td">{l.actor?.fullName ?? "—"}</td>
                  <td className="td"><span className="badge bg-muted text-foreground/80">{l.action}</span></td>
                  <td className="td">{l.entity}</td>
                  <td className="td text-muted-foreground">{l.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
