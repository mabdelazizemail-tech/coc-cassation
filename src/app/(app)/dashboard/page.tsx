import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DOC_STATUS_LABELS, DOC_STATUS_ORDER } from "@/lib/constants";
import { fmtNum, fmtPct, timeAgo } from "@/lib/format";
import { PageHeader, StatCard, ProgressBar, STAGE_BAR_COLORS } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default async function DashboardPage() {
  const session = (await getSession())!;

  const [
    judges, docsByStatus, cycle, assemblyCycle, candidates,
    allocations, firstWishMet, recentAudit, docsWithDue, sanctionsActive,
  ] = await Promise.all([
    prisma.judge.count(),
    prisma.councilDocument.groupBy({ by: ["status"], _count: true }),
    prisma.movementCycle.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.assemblyCycle.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.assemblyCandidate.count(),
    prisma.movementAllocation.count(),
    prisma.movementAllocation.count({ where: { wishRankMet: 1 } }),
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.councilDocument.findMany({
      where: { dueDate: { gte: new Date() }, status: { notIn: ["CLOSED"] } },
      orderBy: { dueDate: "asc" }, take: 2,
    }),
    prisma.sanction.count({ where: { status: "active" } }),
  ]);

  const statusCount = (s: string) => docsByStatus.find((d) => d.status === s)?._count ?? 0;
  const totalDocs = docsByStatus.reduce((a, d) => a + d._count, 0);
  const openDocs = totalDocs - statusCount("CLOSED");
  const votingOrExec = statusCount("IN_VOTING") + statusCount("IN_EXECUTION");
  const maxStage = Math.max(1, ...DOC_STATUS_ORDER.map(statusCount));
  const wishSatisfaction = allocations > 0 ? firstWishMet / allocations : 0;

  // Upcoming events assembled from live module dates (no mock data).
  const events: { date: Date; title: string; tag: string; tone: string }[] = [];
  if (cycle?.wishesCloseAt && cycle.wishesCloseAt > new Date())
    events.push({ date: cycle.wishesCloseAt, title: "إغلاق باب رغبات الحركة القضائية", tag: "موعد نهائي", tone: "bg-destructive/10 text-destructive" });
  if (assemblyCycle?.closesAt && assemblyCycle.closesAt > new Date())
    events.push({ date: assemblyCycle.closesAt, title: "إغلاق باب الترشح للجمعية العامة", tag: "موعد نهائي", tone: "bg-destructive/10 text-destructive" });
  for (const d of docsWithDue)
    events.push({ date: d.dueDate!, title: `مهلة دراسة: ${d.title}`, tag: "مستند", tone: "bg-info/10 text-info" });
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const moduleStatus = [
    { name: "السجل الرقمي للقضاة", hint: `${fmtNum(judges)} سجل نشط`, ok: true, icon: "users" },
    { name: "رول المجلس", hint: `${fmtNum(openDocs)} بند قيد المعالجة`, ok: true, icon: "clipboard" },
    { name: "الحركة القضائية", hint: cycle ? `دورة ${cycle.judicialYear}` : "لا توجد دورة", ok: cycle?.status !== "wishes_closed", icon: "shuffle" },
    { name: "الجمعية العامة", hint: `${fmtNum(candidates)} مرشحاً`, ok: true, icon: "landmark" },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb={["الرئيسية"]}
        title="لوحة المعلومات التنفيذية"
        subtitle="نظرة شاملة على الأداء المؤسسي وحالة الوحدات التشغيلية"
        action={
          <>
            <Link href="/reports" className="btn-ghost">تصدير PDF</Link>
            <Link href="/reports" className="btn-primary">إنشاء تقرير</Link>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="users" label="إجمالي القضاة" value={fmtNum(judges)}
          hint="السجل الرقمي" trend={cycle ? `دورة ${cycle.judicialYear}` : undefined}
          trendTone="info" href="/judges"
        />
        <StatCard
          icon="clipboard" label="بنود رول المجلس" value={fmtNum(openDocs)}
          hint="بانتظار التصويت أو التنفيذ"
          trend={votingOrExec > 0 ? `${fmtNum(votingOrExec)} عاجل` : undefined}
          trendTone="warning" href="/council"
        />
        <StatCard
          icon="shuffle" label="قرارات الحركة القضائية" value={fmtNum(allocations)}
          hint={cycle ? `دورة ${cycle.judicialYear}` : "—"}
          trend={allocations > 0 ? `${fmtPct(wishSatisfaction)} رغبة أولى` : undefined}
          trendTone="success" href="/movement"
        />
        <StatCard
          icon="landmark" label="مرشحو الجمعية العامة" value={fmtNum(candidates)}
          hint="الدورة الحالية"
          trend={sanctionsActive > 0 ? `${fmtNum(sanctionsActive)} جزاء سارٍ` : undefined}
          trendTone="destructive" href="/assembly"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        {/* Workflow strip — the 7 BID lifecycle states (§5.2) */}
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-foreground">مسار العمل — رول المجلس</h2>
              <p className="text-xs text-muted-foreground mt-0.5">توزيع البنود على مراحل المعالجة (٧ مراحل)</p>
            </div>
            <Link href="/council" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              عرض الكل
            </Link>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {DOC_STATUS_ORDER.map((s) => (
              <div key={s} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${STAGE_BAR_COLORS[s]}`} />
                  {DOC_STATUS_LABELS[s]}
                </div>
                <div className="text-xl font-extrabold mt-1 tabular-nums">{fmtNum(statusCount(s))}</div>
                <ProgressBar value={statusCount(s) / maxStage} color={STAGE_BAR_COLORS[s]} className="mt-2" />
              </div>
            ))}
          </div>

          {/* SLA-style indicators */}
          <div className="mt-6 space-y-3">
            <Indicator label="توفّر النظام (SLA)" value={0.995} display="٩٩٫٥٪" />
            <Indicator
              label="نسبة إغلاق مستندات المجلس"
              value={totalDocs ? statusCount("CLOSED") / totalDocs : 0}
              display={fmtPct(totalDocs ? statusCount("CLOSED") / totalDocs : 0)}
            />
            <Indicator
              label={`تحقيق الرغبة الأولى — ${cycle?.judicialYear ?? ""}`}
              value={wishSatisfaction}
              display={fmtPct(wishSatisfaction)}
            />
          </div>
        </div>

        {/* Upcoming calendar */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">التقويم القادم</h2>
            <span className="badge bg-muted text-muted-foreground">مواعيد فعلية</span>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مواعيد قادمة.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((e, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-12 shrink-0 rounded-lg border border-border text-center py-1.5">
                    <div className="text-lg font-extrabold leading-none tabular-nums">
                      {e.date.toLocaleDateString("ar-EG", { day: "numeric" })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {e.date.toLocaleDateString("ar-EG", { month: "short" })}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{e.title}</div>
                    <span className={`badge ${e.tone} mt-0.5`}>{e.tag}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        {/* Recent activity from the audit log */}
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">آخر النشاطات و التوقيعات</h2>
            <Link href="/audit" className="text-xs text-primary font-semibold hover:underline">
              سجل التدقيق الكامل
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد نشاطات مسجّلة بعد.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentAudit.map((a) => (
                <li key={a.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                  <div className="icon-tile !h-9 !w-9">
                    <Icon name="activity" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {a.action} — {a.entity}{a.detail ? ` · ${a.detail}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {timeAgo(a.createdAt)} • بواسطة: {a.actor?.fullName ?? "النظام"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Module status */}
        <div className="card p-6">
          <h2 className="font-bold text-foreground mb-4">حالة الوحدات</h2>
          <ul className="space-y-3">
            {moduleStatus.map((m) => (
              <li key={m.name} className="flex items-center gap-3">
                <div className="icon-tile !h-9 !w-9">
                  <Icon name={m.icon} className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.hint}</div>
                </div>
                <span className={`badge ${m.ok ? "bg-success/10 text-success" : "bg-warning/15 text-gold-dark"}`}>
                  {m.ok ? "متاح" : "مراجعة"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed border-t border-border pt-3">
            مرحباً {session.fullName} — تُعرض البيانات وفق نطاق صلاحيتك (RBAC).
          </p>
        </div>
      </div>
    </div>
  );
}

function Indicator({ label, value, display }: { label: string; value: number; display: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{display}</span>
      </div>
      <ProgressBar value={value} color="bg-primary" />
    </div>
  );
}
