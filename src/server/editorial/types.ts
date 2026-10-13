import "server-only";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): Result<never> {
  return { ok: false, error, fieldErrors };
}

/** Map common Postgres / RLS error codes to messages an editor can act on. */
export function describeDbError(error: { code?: string; message: string } | null | undefined): string {
  if (!error) return "Unknown database error.";
  switch (error.code) {
    case "23505":
      return /slug/i.test(error.message) ? "That URL slug is already in use." : "That value is already in use.";
    case "23503":
      return "A referenced record no longer exists, or this record is still in use elsewhere.";
    case "23514":
      return error.message.replace(/^new row for relation.*$/i, "A value is outside the allowed range.");
    case "42501":
      return "You don’t have permission to do that.";
    case "PGRST116":
      return "That record could not be found.";
    default:
      return "The database rejected the change. Please check the values and try again.";
  }
}
