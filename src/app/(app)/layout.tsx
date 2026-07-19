import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Live counts for sidebar badges + notification bell.
  const [judges, docs, notifications] = await Promise.all([
    prisma.judge.count(),
    prisma.councilDocument.count({ where: { status: { not: "CLOSED" } } }),
    prisma.notification.count({ where: { userId: session.id, isRead: false } }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} counts={{ judges, docs }} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={session} notifications={notifications} />
        <main className="flex-1 p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
