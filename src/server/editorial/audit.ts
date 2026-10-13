import "server-only";
import { logger } from "@/server/logger";
import type { Db } from "@/server/supabase/clients";

/**
 * Append an audit record. Never include submitter personal data or secrets in
 * `details`. Audit failures are logged but never block the editorial action.
 */
export async function writeAudit(
  db: Db,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  const { error } = await db.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
  if (error) logger.error("audit.write_failed", { action, entityType, code: error.code }, error);
}
