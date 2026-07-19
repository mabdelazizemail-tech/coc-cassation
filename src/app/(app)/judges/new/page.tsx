import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { GRADE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import type { JudicialGrade } from "@prisma/client";

async function createJudge(formData: FormData) {
  "use server";
  const session = (await getSession())!;
  if (!can(session.role, "judges.create")) throw new Error("غير مصرح");

  const judge = await prisma.judge.create({
    data: {
      fileNumber: String(formData.get("fileNumber")),
      nationalId: String(formData.get("nationalId")),
      fullNameAr: String(formData.get("fullNameAr")),
      fullNameEn: (formData.get("fullNameEn") as string) || null,
      grade: (formData.get("grade") as JudicialGrade) || "JUDGE",
      appointmentDate: formData.get("appointmentDate")
        ? new Date(String(formData.get("appointmentDate")))
        : null,
      currentCourtId: (formData.get("courtId") as string) || null,
    },
  });
  await writeAudit({ actorId: session.id, action: "CREATE", entity: "Judge", entityId: judge.id, detail: judge.fullNameAr });
  redirect(`/judges/${judge.id}`);
}

export default async function NewJudgePage() {
  const session = (await getSession())!;
  if (!can(session.role, "judges.create")) redirect("/judges");
  const courts = await prisma.court.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <PageHeader title="إضافة قاضٍ جديد" subtitle="الوحدة الأولى — السجل الرقمي للقضاة" />
      <form action={createJudge} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">الاسم بالعربية *</label>
            <input name="fullNameAr" className="input" required />
          </div>
          <div>
            <label className="label">الاسم بالإنجليزية</label>
            <input name="fullNameEn" className="input" />
          </div>
          <div>
            <label className="label">رقم الملف *</label>
            <input name="fileNumber" className="input" required />
          </div>
          <div>
            <label className="label">الرقم القومي *</label>
            <input name="nationalId" className="input" required maxLength={14} />
          </div>
          <div>
            <label className="label">الدرجة</label>
            <select name="grade" className="input" defaultValue="JUDGE">
              {Object.entries(GRADE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">تاريخ التعيين</label>
            <input name="appointmentDate" type="date" className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">المحكمة الحالية</label>
            <select name="courtId" className="input" defaultValue="">
              <option value="">— غير مسكّن —</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-primary" type="submit">حفظ</button>
          <Link href="/judges" className="btn-ghost">إلغاء</Link>
        </div>
      </form>
    </div>
  );
}
