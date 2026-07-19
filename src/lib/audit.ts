import { prisma } from "./prisma";

// Central audit-log writer (Section 9.2 — سجل التدقيق).
export async function writeAudit(params: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        detail: params.detail ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch {
    // Audit logging must never break the primary operation.
  }
}
