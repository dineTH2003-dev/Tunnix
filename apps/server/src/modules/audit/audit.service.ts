import { getDb } from "../../core/db/db";

export type AuditLogInput = {
  actorUserId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Write an immutable audit log entry.
 * Fire-and-forget — errors are swallowed to never break the main request flow.
 */
export function writeAuditLog(input: AuditLogInput): void {
  try {
    const db = getDb();
    db.query(
      `INSERT INTO audit_logs
         (id, actor_user_id, action, entity_type, entity_id, ip_address, user_agent, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).run(
      crypto.randomUUID(),
      input.actorUserId ?? null,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    );
  } catch {
    // Audit log must never crash the application
  }
}
