import type { JudicialGrade, DocumentStatus, Role } from "@prisma/client";

// The 12 judge-data categories (Section 4.2). `key` maps to related models.
export const JUDGE_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "personal", label: "البيانات الشخصية", icon: "user" },
  { key: "qualifications", label: "المؤهلات العلمية", icon: "graduation" },
  { key: "addresses", label: "بيانات الإقامة والعنوان", icon: "home" },
  { key: "languages", label: "اللغات", icon: "globe" },
  { key: "complaints", label: "الشكاوى", icon: "alert" },
  { key: "sanctions", label: "الجزاءات", icon: "gavel" },
  { key: "inspectionReports", label: "تقارير التفتيش", icon: "eye" },
  { key: "secondments", label: "الانتدابات والإعارات", icon: "briefcase" },
  { key: "medicalExcuses", label: "الأعذار الطبية", icon: "heart" },
  { key: "trainings", label: "الدورات والتدريب", icon: "book" },
  { key: "extraDuties", label: "المهام والأعمال الإضافية", icon: "scale" },
  { key: "careerHistory", label: "المسار الوظيفي", icon: "route" },
];

export const GRADE_LABELS: Record<JudicialGrade, string> = {
  PRESIDENT_COURT: "رئيس محكمة النقض",
  VICE_PRESIDENT: "نائب رئيس",
  COUNSELOR: "مستشار",
  ASSISTANT_COUNSELOR: "مستشار مساعد",
  JUDGE: "قاضٍ",
};

export const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
  RECEIVED: "وارد جديد",
  DISTRIBUTED: "موزَّع",
  UNDER_STUDY: "قيد الدراسة",
  UNDER_REVIEW: "قيد المراجعة",
  IN_VOTING: "قيد التصويت",
  IN_EXECUTION: "قيد التنفيذ",
  CLOSED: "مغلق",
};

export const DOC_STATUS_ORDER: DocumentStatus[] = [
  "RECEIVED", "DISTRIBUTED", "UNDER_STUDY", "UNDER_REVIEW",
  "IN_VOTING", "IN_EXECUTION", "CLOSED",
];

export const VOTE_LABELS = {
  APPROVE: "موافقة",
  REJECT: "رفض",
  ABSTAIN: "امتناع",
};

export const APP_NAME = "نظام الأمانة العامة لمجلس القضاء الأعلى بمحكمة النقض";
export const APP_SHORT = "محكمة النقض";
