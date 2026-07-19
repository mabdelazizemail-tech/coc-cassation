import { logoutAction } from "@/app/(app)/actions";
import { ROLE_LABELS } from "@/lib/rbac";
import { fmtNum } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";
import { Icon } from "./Icon";

export function TopBar({
  user,
  notifications = 0,
}: {
  user: SessionUser;
  notifications?: number;
}) {
  return (
    <div className="sticky top-0 z-10 print:hidden">
      <header className="h-16 bg-card border-b border-border flex items-center justify-between gap-4 px-5">
        {/* Global search (reference: Ctrl+K search field) */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Icon
              name="search"
              className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
            />
            <input
              className="input !pr-9 !bg-muted/60 !border-transparent focus:!bg-card"
              placeholder="بحث عن قاضٍ، وثيقة، قرار، أو رقم ملف..."
              aria-label="بحث"
            />
            <kbd className="absolute left-3 top-1/2 -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Ctrl + K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* System availability pill (SLA 99.5% — BID §10.2) */}
          <span className="badge bg-success/10 text-success hidden md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
            النظام متاح ٩٩٫٥٪
          </span>

          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors" aria-label="الإشعارات">
            <Icon name="bell" className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {fmtNum(notifications)}
              </span>
            )}
          </button>

          {/* User chip */}
          <div className="flex items-center gap-2.5 rounded-full border border-border py-1 pr-1 pl-3">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {user.fullName.trim().charAt(0)}
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-[13px] font-bold text-foreground">{user.fullName}</div>
              <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</div>
            </div>
            <form action={logoutAction}>
              <button
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                type="submit"
                title="تسجيل الخروج"
              >
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="gold-strip" />
    </div>
  );
}
