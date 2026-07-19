import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  action,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        {breadcrumb && (
          <div className="text-xs text-muted-foreground mb-1.5">
            {breadcrumb.join(" / ")}
          </div>
        )}
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  icon,
  trend,
  trendTone = "success",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  icon?: string;
  trend?: string;
  trendTone?: "success" | "warning" | "destructive" | "info";
}) {
  const toneClass = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  }[trendTone];

  const inner = (
    <div className="card p-5 hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        {icon && (
          <div className="icon-tile">
            <Icon name={icon} />
          </div>
        )}
      </div>
      <div className="text-3xl font-extrabold text-foreground mt-1 tabular-nums">{value}</div>
      <div className="flex items-center gap-2 mt-2">
        {trend && <span className={`badge ${toneClass}`}>{trend}</span>}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-muted text-muted-foreground",
  DISTRIBUTED: "bg-info/10 text-info",
  UNDER_STUDY: "bg-warning/15 text-gold-dark",
  UNDER_REVIEW: "bg-primary/10 text-primary",
  IN_VOTING: "bg-gold/15 text-gold-dark",
  IN_EXECUTION: "bg-info/10 text-info",
  CLOSED: "bg-success/10 text-success",
};

// Bar colors per workflow stage (reference: workflow strip on dashboard).
export const STAGE_BAR_COLORS: Record<string, string> = {
  RECEIVED: "bg-slate-400",
  DISTRIBUTED: "bg-info",
  UNDER_STUDY: "bg-warning",
  UNDER_REVIEW: "bg-primary",
  IN_VOTING: "bg-gold",
  IN_EXECUTION: "bg-info",
  CLOSED: "bg-success",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

export function ProgressBar({
  value,
  color = "bg-primary",
  className = "",
}: {
  value: number; // 0..1
  color?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={`h-1.5 w-full rounded-full bg-muted overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-info/5 border border-info/20 px-3 py-2 text-xs text-muted-foreground">
      <Icon name="eye" className="h-4 w-4 text-info shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Avatar({
  name,
  src,
  className = "h-9 w-9 text-sm",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`صورة ${name}`}
        className={`rounded-full object-cover bg-muted shrink-0 ${className}`}
      />
    );
  }
  return (
    <div className={`rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 ${className}`}>
      {name.trim().charAt(0)}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card p-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
      <Icon name="alert" className="h-8 w-8 text-gold" />
      {children}
    </div>
  );
}
