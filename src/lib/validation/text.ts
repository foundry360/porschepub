/**
 * Input normalisation helpers shared by client and server validation.
 * Client validation is a convenience; the server always re-validates.
 */

/** Remove control characters (keeping \n and \t), normalise to NFC, trim. */
export function cleanText(input: string, { multiline = false } = {}): string {
  const normalised = input
    .normalize("NFC")
     
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/\r\n?/g, "\n");

  if (multiline) {
    return normalised
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .join("\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }
  return normalised.replace(/\s+/g, " ").trim();
}

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** Trim, lowercase and validate an email. Returns null when invalid. */
export function normalizeEmail(input: string): string | null {
  const value = cleanText(input).toLowerCase();
  if (value.length < 3 || value.length > 254) return null;
  if (value.includes("..")) return null;
  if (!EMAIL_PATTERN.test(value)) return null;
  const [local] = value.split("@");
  if (local.startsWith(".") || local.endsWith(".")) return null;
  return value;
}

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * Validate a public http(s) URL. Rejects credentials, non-http protocols,
 * single-label/IP/localhost hosts and absurd lengths. Returns the normalised
 * URL string or null.
 */
export function normalizePublicUrl(input: string): string | null {
  const raw = cleanText(input);
  if (raw.length === 0 || raw.length > 500) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes(".")) return null;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
  if (IPV4_PATTERN.test(host) || host.includes(":") || host.startsWith("[")) return null;

  url.hash = "";
  const out = url.toString();
  return out.length <= 500 ? out : null;
}

/** Count URL-looking tokens, used as a cheap spam heuristic. */
export function countLinks(input: string): number {
  const matches = input.match(/\b(?:https?:\/\/|www\.)\S+/gi);
  return matches ? matches.length : 0;
}

/** Escape text for inclusion in HTML (email templates). */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
