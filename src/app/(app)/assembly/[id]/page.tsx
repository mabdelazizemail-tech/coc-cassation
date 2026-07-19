import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADE_LABELS } from "@/lib/constants";
import { fmtNum, fmtDate } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { PrintButton } from "@/components/PrintButton";

function d(x?: Date | null) {
  return x ? x.toLocaleDateString("ar-EG", { month: "short", year: "numeric" }) : "الآن";
}

function durationYears(start?: Date | null, end?: Date | null): string {
  if (!start) return "";
  const ms = (end ?? new Date()).getTime() - start.getTime();
  const years = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25)));
  if (years === 0) return "أقل من سنة";
  if (years === 1) return "سنة واحدة";
  if (years === 2) return "سنتان";
  return `${fmtNum(years)} ${years <= 10 ? "سنوات" : "سنة"}`;
}

// LinkedIn-inspired CV for General Assembly candidates (BID §7.2.2 / §7.3).
// Data is pulled live from the judge's digital registry.
export default async function CandidateCV({ params }: { params: { id: string } }) {
  await getSession();
  const cand = await prisma.assemblyCandidate.findUnique({
    where: { id: params.id },
    include: {
      judge: {
        include: {
          currentCourt: true,
          qualifications: { orderBy: { year: "desc" } },
          languages: true,
          trainings: { orderBy: { startDate: "desc" } },
          careerHistory: { orderBy: { order: "desc" } },
        },
      },
      cycle: true,
    },
  });
  if (!cand || !cand.judge) notFound();
  const j = cand.judge;

  const years = j.appointmentDate
    ? Math.floor((Date.now() - j.appointmentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : 0;

  const langLevel: Record<string, { label: string; dots: number }> = {
    beginner: { label: "مبتدئ", dots: 1 },
    intermediate: { label: "متوسط", dots: 2 },
    advanced: { label: "متقدم", dots: 3 },
    fluent: { label: "متمكن", dots: 4 },
  };

  const about = [
    `${GRADE_LABELS[j.grade]} بمحكمة النقض المصرية`,
    j.currentCourt ? `يعمل حالياً في ${j.currentCourt.name}` : null,
    years > 0 ? `يمتلك خبرة قضائية تمتد لـ${durationYears(j.appointmentDate)}` : null,
    j.qualifications.some((q) => q.degree.includes("دكتوراه"))
      ? "حاصل على درجة الدكتوراه في القانون"
      : null,
    j.languages.length > 1 ? `يجيد ${fmtNum(j.languages.length)} لغات` : null,
  ]
    .filter(Boolean)
    .join("، ") + ".";

  return (
    <div className="max-w-5xl">
      {/* Actions (hidden in print) */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div className="text-xs text-muted-foreground">
          الرئيسية / الجمعية العامة / السيرة الذاتية
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <Link href="/assembly" className="btn-ghost">← عودة للمرشحين</Link>
        </div>
      </div>

      {/* Hero card — cover + overlapping avatar (LinkedIn-style) */}
      <div className="card overflow-hidden mb-4">
        <div className="relative h-36 bg-gradient-to-l from-brand-800 via-brand-900 to-brand-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.avif"
            alt=""
            className="absolute left-6 top-1/2 -translate-y-1/2 h-24 w-24 opacity-25 object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 gold-strip" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={j.photoUrl || "/avatar.svg"}
              alt={`صورة ${j.fullNameAr}`}
              className="relative z-10 h-28 w-28 rounded-full border-4 border-card shadow-card object-cover bg-muted"
            />
            <span className="badge bg-gold/15 text-gold-dark mb-2">
              مرشح الجمعية العامة · دورة {cand.cycle.judicialYear}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mt-3">{j.fullNameAr}</h1>
          <p className="text-[15px] text-foreground/80 mt-0.5">
            {GRADE_LABELS[j.grade]} · محكمة النقض المصرية
          </p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
            <Icon name="landmark" className="h-4 w-4" />
            {j.currentCourt?.name ?? "غير مسكّن"}
            <span className="text-border">•</span>
            خبرة {durationYears(j.appointmentDate)}
            <span className="text-border">•</span>
            رقم الملف {j.fileNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* About */}
          <section className="card p-6">
            <h2 className="font-extrabold text-foreground mb-2">نبذة</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">{about}</p>
          </section>

          {/* Experience */}
          <section className="card p-6">
            <h2 className="font-extrabold text-foreground mb-4">الخبرة القضائية</h2>
            {j.careerHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
            ) : (
              <ul className="space-y-0">
                {j.careerHistory.map((c, i) => (
                  <li key={c.id} className={`flex gap-4 ${i > 0 ? "pt-4 mt-4 border-t border-border" : ""}`}>
                    <div className="icon-tile shrink-0">
                      <Icon name="briefcase" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-[15px]">{c.position}</div>
                      <div className="text-sm text-foreground/70">
                        {c.courtOrEntity ?? "محكمة النقض"}
                        {c.grade ? ` · ${GRADE_LABELS[c.grade]}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {d(c.startDate)} — {d(c.endDate)}
                        {c.startDate ? ` · ${durationYears(c.startDate, c.endDate)}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Education */}
          <section className="card p-6">
            <h2 className="font-extrabold text-foreground mb-4">المؤهلات العلمية</h2>
            {j.qualifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
            ) : (
              <ul>
                {j.qualifications.map((q, i) => (
                  <li key={q.id} className={`flex gap-4 ${i > 0 ? "pt-4 mt-4 border-t border-border" : ""}`}>
                    <div className="icon-tile shrink-0">
                      <Icon name="graduation" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-[15px]">{q.degree}</div>
                      <div className="text-sm text-foreground/70">
                        {[q.institution, q.faculty].filter(Boolean).join(" — ") || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        {q.year && <span className="tabular-nums">{fmtNum(q.year)}</span>}
                        {q.grade && <span className="badge bg-muted text-muted-foreground">{q.grade}</span>}
                        {q.subject && <span>{q.subject}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Courses & certifications */}
          <section className="card p-6">
            <h2 className="font-extrabold text-foreground mb-4">الدورات والشهادات</h2>
            {j.trainings.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
            ) : (
              <ul>
                {j.trainings.map((t, i) => (
                  <li key={t.id} className={`flex gap-4 ${i > 0 ? "pt-4 mt-4 border-t border-border" : ""}`}>
                    <div className="icon-tile shrink-0">
                      <Icon name="book" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-[15px]">{t.name}</div>
                      <div className="text-sm text-foreground/70">
                        {t.organizer ?? "—"}
                        {t.scope === "international" ? " · دولية" : ""}
                      </div>
                      {t.certified && (
                        <span className="badge bg-success/10 text-success mt-1">شهادة إتمام</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Personal card */}
          <section className="card p-5">
            <h3 className="font-bold text-foreground mb-3 text-sm">بيانات أساسية</h3>
            <ul className="text-sm text-foreground/80 space-y-2">
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">تاريخ الميلاد</span>
                <span className="tabular-nums">{fmtDate(j.birthDate)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">الجنسية</span>
                <span>{j.nationality}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">تاريخ التعيين</span>
                <span className="tabular-nums">{fmtDate(j.appointmentDate)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">سنوات الخبرة</span>
                <span>{durationYears(j.appointmentDate)}</span>
              </li>
            </ul>
          </section>

          {/* Languages — LinkedIn-style proficiency dots */}
          <section className="card p-5">
            <h3 className="font-bold text-foreground mb-3 text-sm">اللغات</h3>
            {j.languages.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
            ) : (
              <ul className="space-y-3">
                {j.languages.map((l) => {
                  const lv = langLevel[l.level] ?? { label: l.level, dots: 2 };
                  return (
                    <li key={l.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{l.language}</span>
                        <span className="text-xs text-muted-foreground">{lv.label}</span>
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {[1, 2, 3, 4].map((n) => (
                          <span
                            key={n}
                            className={`h-1.5 flex-1 rounded-full ${n <= lv.dots ? "bg-gold" : "bg-muted"}`}
                          />
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Assembly-only extra info (BID §7.2.2) */}
          {cand.extraInfo && (
            <section className="card p-5">
              <h3 className="font-bold text-foreground mb-2 text-sm">معلومات إضافية</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{cand.extraInfo}</p>
            </section>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
            تُستخرج بيانات هذه السيرة تلقائياً من السجل الرقمي للقاضي (BID §7.2.2)
            وتُعرض لأعضاء محكمة النقض للاطلاع فقط.
          </p>
        </div>
      </div>
    </div>
  );
}
