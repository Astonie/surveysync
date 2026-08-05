import { prisma } from "@/lib/prisma";

export type AuditMetadata = {
  ip?: string;
  sessionId?: string;
  deviceId?: string;
  [key: string]: unknown;
};

export interface AuditEvent {
  action: string;
  entityType: string;
  entityId?: string | null;
  surveyId?: string | null;
  actorId?: string | null;
  metadata?: AuditMetadata;
}

export async function recordAudit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? null,
        surveyId: event.surveyId ?? null,
        actorId: event.actorId ?? null,
        metadata: event.metadata ? (event.metadata as object) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to record audit event:", error);
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
}
