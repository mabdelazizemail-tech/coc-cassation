"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { can, type Permission } from "@/lib/rbac";
import { fmtNum } from "@/lib/format";
import { Icon } from "./Icon";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  perms?: Permission[]; // visible if the role holds ANY of these
  countKey?: "judges" | "docs";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Section structure ported from the reference shell (الرئيسية / الوحدات التشغيلية / النظام).
const SECTIONS: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { href: "/dashboard", label: "لوحة المعلومات", icon: "dashboard" },
      { href: "/reports", label: "التقارير و المؤشرات", icon: "chart", perms: ["reports.view"] },
    ],
  },
  {
    title: "الوحدات التشغيلية",
    items: [
      { href: "/judges", label: "السجل الرقمي للقضاة", icon: "users", perms: ["judges.view"], countKey: "judges" },
      { href: "/council", label: "رول المجلس", icon: "clipboard", perms: ["council.decide", "council.manage", "council.review"], countKey: "docs" },
      { href: "/movement", label: "الحركة القضائية", icon: "shuffle", perms: ["movement.enterWishes", "movement.manage", "movement.enterNeeds"] },
      { href: "/assembly", label: "الجمعية العامة", icon: "landmark", perms: ["assembly.view"] },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/users", label: "إدارة المستخدمين", icon: "settings", perms: ["users.manage"] },
      { href: "/audit", label: "سجل التدقيق", icon: "shield", perms: ["audit.view"] },
    ],
  },
];

export function Sidebar({
  role,
  counts,
}: {
  role: Role;
  counts: { judges: number; docs: number };
}) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground min-h-screen flex flex-col print:hidden">
      {/* Brand */}
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.avif"
          alt="شعار مجلس القضاء الأعلى"
          className="h-11 w-11 shrink-0 object-contain"
        />
        <div className="leading-tight">
          <div className="font-bold text-sm">مجلس القضاء الأعلى</div>
          <div className="text-[11px] text-sidebar-muted mt-0.5">نظام أمانة المجلس · محكمة النقض</div>
        </div>
      </div>

      {/* Sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {SECTIONS.map((section) => {
          const visible = section.items.filter(
            (i) => !i.perms || i.perms.some((p) => can(role, p))
          );
          if (visible.length === 0) return null;
          return (
            <div key={section.title}>
              <div className="px-3 mb-1.5 text-[11px] font-semibold text-sidebar-muted tracking-wide">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const count = item.countKey ? counts[item.countKey] : undefined;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                        active
                          ? "bg-sidebar-accent text-white font-semibold"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                      }`}
                    >
                      <Icon
                        name={item.icon}
                        className={`h-[18px] w-[18px] ${active ? "text-gold" : "text-sidebar-muted"}`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {count !== undefined && count > 0 && (
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                          active ? "bg-gold text-gold-foreground" : "bg-sidebar-accent text-sidebar-foreground/90"
                        }`}>
                          {fmtNum(count)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Environment card */}
      <div className="m-3 rounded-lg bg-sidebar-accent/70 border border-sidebar-border p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-gold inline-block" />
          بيئة النموذج الأولي
        </div>
        <p className="text-[11px] text-sidebar-muted mt-1 leading-relaxed">
          الإصدار 0.2 — التحقق الثنائي وتكامل موفّر الهوية في الإصدار القادم.
        </p>
      </div>
    </aside>
  );
}
