import type { Role } from "@prisma/client";

// Human-readable Arabic role labels — used across the UI.
export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: "مسؤول النظام",
  SECRETARY_GENERAL: "الأمين العام",
  DEPUTY_SECRETARY: "الأمين العام المساعد",
  COUNCIL_MEMBER: "عضو المجلس",
  DATA_OFFICER: "مسؤول بيانات القضاة",
  COURT_OFFICER: "مسؤول المحكمة",
  JUDGE: "قاضٍ",
  VIEWER: "مستخدم عرض فقط",
};

// Permission keys used throughout the application.
export type Permission =
  | "judges.view"
  | "judges.viewAll"
  | "judges.create"
  | "judges.edit"
  | "judges.delete"
  | "judges.docs.upload"
  | "judges.docs.delete"
  | "council.manage"        // Secretary General: distribute, execute
  | "council.review"        // Deputy Secretary: review recommendations
  | "council.decide"        // Council members: recommend + vote
  | "movement.manage"       // configure cycle, run allocation
  | "movement.enterNeeds"   // court officers
  | "movement.enterWishes"  // judges
  | "movement.approve"      // Secretary General approves cycle
  | "assembly.manage"
  | "assembly.view"
  | "reports.view"
  | "users.manage"
  | "audit.view";

// Role → permission matrix. Reflects Section 4.5 & 9.1 of the BID, resolving
// the "رئيس المجلس / الأمين العام" naming conflict in favour of SECRETARY_GENERAL
// as the full-authority owner (clarification question M1-1).
const MATRIX: Record<Role, Permission[]> = {
  SYSTEM_ADMIN: [
    "judges.view", "judges.viewAll",
    "users.manage", "audit.view", "reports.view",
    "movement.manage", "assembly.manage", "assembly.view",
  ],
  SECRETARY_GENERAL: [
    "judges.view", "judges.viewAll", "judges.create", "judges.edit", "judges.delete",
    "judges.docs.upload", "judges.docs.delete",
    "council.manage", "council.decide",
    "movement.manage", "movement.approve",
    "assembly.manage", "assembly.view",
    "reports.view", "audit.view",
  ],
  DEPUTY_SECRETARY: [
    "judges.view", "judges.viewAll",
    "council.review",
    "assembly.view", "reports.view",
  ],
  COUNCIL_MEMBER: [
    "judges.view", // limited to assigned files — enforced at query level
    "council.decide",
    "assembly.view", "reports.view",
  ],
  DATA_OFFICER: [
    "judges.view", "judges.viewAll", "judges.create",
    "judges.docs.upload",
    "reports.view",
  ],
  COURT_OFFICER: [
    "movement.enterNeeds",
    "reports.view",
  ],
  JUDGE: [
    "judges.view",          // own file only — enforced at query level
    "movement.enterWishes",
  ],
  VIEWER: [
    "reports.view",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return MATRIX[role] ?? [];
}
