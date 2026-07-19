import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { GRADE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { JudgeCategories, DataTable } from "@/components/JudgeCategories";

function d(x?: Date | null) {
  return x ? x.toLocaleDateString("ar-EG") : "—";
}

export default async function JudgeProfile({ params }: { params: { id: string } }) {
  const session = (await getSession())!;

  // Enforce access scope.
  if (session.role === "JUDGE" && session.judgeId !== params.id) notFound();

  const judge = await prisma.judge.findUnique({
    where: { id: params.id },
    include: {
      currentCourt: true,
      contacts: true,
      qualifications: true,
      addresses: true,
      languages: true,
      complaints: true,
      sanctions: true,
      inspectionReports: true,
      secondments: true,
      medicalExcuses: true,
      trainings: true,
      extraDuties: true,
      careerHistory: { orderBy: { order: "asc" } },
      documents: true,
    },
  });
  if (!judge) notFound();

  // Medical diagnosis is restricted (clarification M1-4): only full-authority roles.
  const canSeeDiagnosis = can(session.role, "judges.viewAll") && session.role !== "DATA_OFFICER";

  const langLevel: Record<string, string> = {
    beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", fluent: "متمكن",
  };

  const sections: Record<string, React.ReactNode> = {
    personal: (
      <DataTable
        columns={["البند", "القيمة"]}
        rows={[
          ["الاسم بالعربية", judge.fullNameAr],
          ["الاسم بالإنجليزية", judge.fullNameEn],
          ["الرقم القومي", judge.nationalId],
          ["رقم الملف", judge.fileNumber],
          ["تاريخ الميلاد", d(judge.birthDate)],
          ["الجنسية", judge.nationality],
          ["الحالة الاجتماعية", judge.maritalStatus],
          ["عدد الأبناء", judge.childrenCount],
          ["الدرجة", GRADE_LABELS[judge.grade]],
          ["تاريخ التعيين", d(judge.appointmentDate)],
          ...judge.contacts.map((c) => [c.type, c.value] as (string | number)[]),
        ]}
      />
    ),
    qualifications: (
      <DataTable
        columns={["المؤهل", "الجهة", "الكلية", "السنة", "التقدير"]}
        rows={judge.qualifications.map((x) => [x.degree, x.institution, x.faculty, x.year, x.grade])}
      />
    ),
    addresses: (
      <DataTable
        columns={["النوع", "المحافظة", "المركز", "الشارع", "اتصال الطوارئ"]}
        rows={judge.addresses.map((x) => [x.kind, x.governorate, x.district, x.street, x.emergencyContact])}
      />
    ),
    languages: (
      <DataTable
        columns={["اللغة", "المستوى", "شهادة"]}
        rows={judge.languages.map((x) => [x.language, langLevel[x.level] ?? x.level, x.certificate])}
      />
    ),
    complaints: (
      <DataTable
        columns={["رقم", "الموضوع", "مقدِّمها", "الحالة", "النتيجة"]}
        rows={judge.complaints.map((x) => [x.number, x.subject, x.submittedBy, x.status, x.result])}
      />
    ),
    sanctions: (
      <DataTable
        columns={["النوع", "السبب", "الجهة", "الحالة", "التاريخ"]}
        rows={judge.sanctions.map((x) => [x.type, x.reason, x.issuedBy, x.status, d(x.issuedAt)])}
      />
    ),
    inspectionReports: (
      <DataTable
        columns={["رقم التقرير", "العام", "التقدير", "المفتش", "التاريخ"]}
        rows={judge.inspectionReports.map((x) => [x.reportNumber, x.judicialYear, x.rating, x.inspectorName, d(x.inspectedAt)])}
      />
    ),
    secondments: (
      <DataTable
        columns={["النوع", "الجهة", "من", "إلى", "الحالة"]}
        rows={judge.secondments.map((x) => [x.type, x.destination, d(x.startDate), d(x.endDate), x.status])}
      />
    ),
    medicalExcuses: (
      <DataTable
        columns={["النوع", "من", "إلى", "الأيام", "التشخيص", "موثّق"]}
        rows={judge.medicalExcuses.map((x) => [
          x.type, d(x.startDate), d(x.endDate), x.days,
          canSeeDiagnosis ? x.diagnosis : "🔒 مقيّد",
          x.isVerified ? "نعم" : "لا",
        ])}
      />
    ),
    trainings: (
      <DataTable
        columns={["الدورة", "الجهة", "النطاق", "من", "إلى", "شهادة"]}
        rows={judge.trainings.map((x) => [x.name, x.organizer, x.scope, d(x.startDate), d(x.endDate), x.certified ? "نعم" : "لا"])}
      />
    ),
    extraDuties: (
      <DataTable
        columns={["المهمة", "الجهة", "من", "إلى"]}
        rows={judge.extraDuties.map((x) => [x.title, x.entity, d(x.startDate), d(x.endDate)])}
      />
    ),
    careerHistory: (
      <DataTable
        columns={["المنصب", "الجهة", "الدرجة", "من", "إلى"]}
        rows={judge.careerHistory.map((x) => [x.position, x.courtOrEntity, x.grade ? GRADE_LABELS[x.grade] : "—", d(x.startDate), d(x.endDate)])}
      />
    ),
  };

  return (
    <div>
      <PageHeader
        breadcrumb={["الرئيسية", "السجل الرقمي للقضاة", judge.fullNameAr]}
        title="الملف القضائي"
        action={<Link href="/judges" className="btn-ghost">← عودة للقائمة</Link>}
      />

      {/* Profile hero */}
      <div className="card p-6 mb-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={judge.photoUrl || "/avatar.svg"}
          alt={`صورة ${judge.fullNameAr}`}
          className="h-16 w-16 rounded-full object-cover bg-muted shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold text-foreground">{judge.fullNameAr}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {GRADE_LABELS[judge.grade]} · {judge.currentCourt?.name ?? "غير مسكّن"} · رقم الملف {judge.fileNumber}
          </p>
        </div>
        <span className="badge bg-success/10 text-success">نشط</span>
      </div>

      <JudgeCategories sections={sections} />

      <div className="card p-6 mt-4">
        <h2 className="font-bold text-foreground mb-3">المستندات المرتبطة ({judge.documents.length})</h2>
        <DataTable
          columns={["الاسم", "الفئة", "الصيغة", "تاريخ الرفع"]}
          rows={judge.documents.map((x) => [x.name, x.category, x.fileType, d(x.uploadedAt)])}
        />
      </div>
    </div>
  );
}
