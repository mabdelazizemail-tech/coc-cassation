import { redirect } from "next/navigation";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { PageHeader } from "@/components/ui";
import type { Role } from "@prisma/client";

async function createUser(formData: FormData) {
  "use server";
  const session = (await getSession())!;
  if (!can(session.role, "users.manage")) throw new Error("غير مصرح");
  const password = String(formData.get("password"));
  await prisma.user.create({
    data: {
      username: String(formData.get("username")),
      fullName: String(formData.get("fullName")),
      email: (formData.get("email") as string) || null,
      role: formData.get("role") as Role,
      passwordHash: await hashPassword(password),
    },
  });
  await writeAudit({ actorId: session.id, action: "CREATE", entity: "User", detail: String(formData.get("username")) });
  redirect("/users");
}

async function toggleActive(id: string, isActive: boolean) {
  "use server";
  const session = (await getSession())!;
  if (!can(session.role, "users.manage")) throw new Error("غير مصرح");
  await prisma.user.update({ where: { id }, data: { isActive } });
  await writeAudit({ actorId: session.id, action: isActive ? "ENABLE" : "DISABLE", entity: "User", entityId: id });
  redirect("/users");
}

export default async function UsersPage() {
  const session = (await getSession())!;
  if (!can(session.role, "users.manage")) redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <PageHeader title="إدارة المستخدمين والصلاحيات" subtitle="القسم التاسع — الأدوار والصلاحيات (RBAC)" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form action={createUser} className="card p-6 space-y-3 h-fit">
          <h3 className="font-bold text-foreground">إضافة مستخدم</h3>
          <div><label className="label">اسم المستخدم</label><input name="username" className="input" required /></div>
          <div><label className="label">الاسم الكامل</label><input name="fullName" className="input" required /></div>
          <div><label className="label">البريد الإلكتروني</label><input name="email" type="email" className="input" /></div>
          <div>
            <label className="label">الدور</label>
            <select name="role" className="input" required defaultValue="VIEWER">
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">كلمة المرور</label><input name="password" type="password" className="input" required /></div>
          <button className="btn-primary w-full" type="submit">إنشاء</button>
        </form>

        <div className="card overflow-hidden lg:col-span-2 h-fit">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="th">الاسم</th>
                <th className="th">المستخدم</th>
                <th className="th">الدور</th>
                <th className="th">2FA</th>
                <th className="th">الحالة</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40">
                  <td className="td font-medium">{u.fullName}</td>
                  <td className="td font-mono text-xs">{u.username}</td>
                  <td className="td">{ROLE_LABELS[u.role]}</td>
                  <td className="td">{u.twoFactorEnabled ? "✓" : "—"}</td>
                  <td className="td">
                    {u.isActive ? <span className="badge bg-success/10 text-success">نشط</span>
                      : <span className="badge bg-destructive/10 text-destructive">موقوف</span>}
                  </td>
                  <td className="td">
                    <form action={toggleActive.bind(null, u.id, !u.isActive)}>
                      <button className="text-primary hover:underline text-xs" type="submit">
                        {u.isActive ? "إيقاف" : "تفعيل"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
