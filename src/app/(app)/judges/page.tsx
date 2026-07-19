import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { GRADE_LABELS, JUDGE_CATEGORIES } from "@/lib/constants";
import { fmtNum, fmtDateShort } from "@/lib/format";
import { PageHeader, EmptyState, ProgressBar, InfoBanner, Avatar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import type { Prisma } from "@prisma/client";

// Relations counted per judge to compute file completion (11 relational
// categories; "personal" is intrinsic to the Judge row itself).
const RELATION_KEYS = [
  "qualifications", "addresses", "languages", "complaints", "sanctions",
  "inspectionReports", "secondments", "medicalExcuses", "trainings",
  "extraDuties", "careerHistory",
] as const;

export default async function JudgesPage({
  searchParams,
}: {
  searchParams: { q?: string; grade?: string };
}) {
  const session = (await getSession())!;
  const q = searchParams.q?.trim();
  const grade = searchParams.grade;

  // Access scoping (Section 4.5): judges see only their own file; council members
  // are limited to assigned/granted files; roles with viewAll see everything.
  const where: Prisma.JudgeWhereInput = {};
  if (session.role === "JUDGE") {
    where.id = session.judgeId ?? "__none__";
  } else if (session.role === "COUNCIL_MEMBER") {
    where.OR = [
      { temporaryAccess: { some: { userId: session.id, isActive: true } } },
      { councilDocuments: { some: { assignedToId: session.id } } },
    ];
  }
  if (q) {
    where.AND = [
      {
        OR: [
          { fullNameAr: { contains: q, mode: "insensitive" } },
          { fileNumber: { contains: q } },
          { nationalId: { contains: q } },
        ],
      },
    ];
  }
  if (grade) where.grade = grade as any;

  const judges = await prisma.judge.findMany({
    where,
    include: {
      currentCourt: true,
      _count: { select: Object.fromEntries(RELATION_KEYS.map((k) => [k, true])) as any },
    },
    orderBy: { fullNameAr: "asc" },
    take: 100,
  });

  // Per-category record counts + coverage (visible only within the user's scope).
  const scopedIds = judges.map((j) => j.id);
  const categoryStats = JUDGE_CATEGORIES.map((cat) => {
    if (cat.key === "personal") {
      return { ...cat, records: judges.length, coverage: judges.length ? 1 : 0 };
    }
    const key = cat.key as (typeof RELATION_KEYS)[number];
    const withData = judges.filter((j) => (j._count as any)[key] > 0).length;
    const records = judges.reduce((s, j) => s + ((j._count as any)[key] ?? 0), 0);
    return { ...cat, records, coverage: scopedIds.length ? withData / scopedIds.length : 0 };
  });

  const completion = (j: (typeof judges)[number]) => {
    const filled = 1 + RELATION_KEYS.filter((k) => (j._count as any)[k] > 0).length;
    return filled / 12;
  };

  const canEdit = can(session.role, "judges.edit") || can(session.role, "judges.create");

  const gradeFilters = [
    { value: "", label: "كل السجلات" },
    ...Object.entries(GRADE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div>
      <PageHeader
        breadcrumb={["الرئيسية", "السجل الرقمي للقضاة"]}
        title="السجل الرقمي للقضاة"
        subtitle={`إدارة موحّدة لملفات القضاة عبر ١٢ فئة معيارية · ${fmtNum(judges.length)} سجل ضمن نطاقك`}
        action={
          can(session.role, "judges.create") ? (
            <>
              <button className="btn-ghost"><Icon name="file" className="h-4 w-4" /> تصدير</button>
              <Link href="/judges/new" className="btn-primary">
                <Icon name="users" className="h-4 w-4" /> إضافة قاضٍ
              </Link>
            </>
          ) : null
        }
      />

      {/* 12-category grid (BID §4.2 — structure preserved) */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-foreground">فئات الملف القضائي</h2>
            <p className="text-xs text-muted-foreground mt-0.5">اختر فئة لعرض بياناتها ووثائقها لكل قاضٍ</p>
          </div>
          <span className="badge bg-muted text-muted-foreground">١٢ / ١٢ فئة نشطة</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {categoryStats.map((c) => (
            <div key={c.key} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="icon-tile !h-10 !w-10">
                  <Icon name={c.icon} className="h-[18px] w-[18px]" />
                </div>
              </div>
              <div className="text-[13px] font-bold text-foreground mt-2 leading-snug">{c.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{fmtNum(c.records)} سجل</div>
              <div className="flex items-center gap-2 mt-2">
                <ProgressBar value={c.coverage} color="bg-primary" className="flex-1" />
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                  {Math.round(c.coverage * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <form className="card p-4 mb-4 space-y-3">
        <div className="relative">
          <Icon name="search" className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            name="q" defaultValue={q} className="input !pr-9"
            placeholder="بحث بالاسم، رقم الملف، أو الرقم القومي..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {gradeFilters.map((f) => (
            <button
              key={f.value} type="submit" name="grade" value={f.value}
              className={(grade ?? "") === f.value ? "pill-active" : "pill"}
            >
              {f.label}
            </button>
          ))}
        </div>
      </form>

      {/* RBAC read-only notice (BID §4.5) */}
      {!canEdit && (
        <div className="mb-4">
          <InfoBanner>
            عرض للقراءة فقط — التعديل يتطلب صلاحية إدارة بيانات القضاة أو الأمين العام.
          </InfoBanner>
        </div>
      )}

      {judges.length === 0 ? (
        <EmptyState>لا توجد بيانات قضاة مطابقة ضمن نطاق صلاحيتك.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">قائمة القضاة</h3>
            <span className="text-xs text-muted-foreground tabular-nums">{fmtNum(judges.length)} من {fmtNum(judges.length)}</span>
          </div>
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="th">الرقم</th>
                <th className="th">الاسم</th>
                <th className="th">المحكمة</th>
                <th className="th">الدرجة</th>
                <th className="th">تاريخ التعيين</th>
                <th className="th">اكتمال الملف</th>
                <th className="th">الحالة</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {judges.map((j) => {
                const comp = completion(j);
                return (
                  <tr key={j.id} className="hover:bg-muted/40">
                    <td className="td font-mono text-xs text-muted-foreground">{j.fileNumber}</td>
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={j.fullNameAr} src={j.photoUrl} />
                        <span className="font-bold text-foreground">{j.fullNameAr}</span>
                      </div>
                    </td>
                    <td className="td">{j.currentCourt?.name ?? "—"}</td>
                    <td className="td">{GRADE_LABELS[j.grade]}</td>
                    <td className="td tabular-nums">{fmtDateShort(j.appointmentDate)}</td>
                    <td className="td">
                      <div className="flex items-center gap-2 min-w-28">
                        <ProgressBar value={comp} color={comp > 0.7 ? "bg-success" : comp > 0.4 ? "bg-warning" : "bg-destructive"} className="flex-1" />
                        <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                          {Math.round(comp * 12)}/12
                        </span>
                      </div>
                    </td>
                    <td className="td"><span className="badge bg-success/10 text-success">نشط</span></td>
                    <td className="td">
                      <Link href={`/judges/${j.id}`} className="text-primary font-semibold text-xs hover:underline">
                        عرض الملف
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
