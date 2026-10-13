import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getHashSalt } from "@/server/env";

/**
 * Best-effort client address. On Vercel the platform sets these headers and
 * strips client-supplied copies; behind other proxies, make sure only your
 * trusted proxy can set `x-forwarded-for`.
 */
export async function getClientAddress(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first || h.get("x-real-ip")?.trim() || "unknown";
}

/** One-way, salted hash so raw addresses and emails are never stored or logged. */
export function hashIdentifier(value: string, namespace: string): string {
  return createHash("sha256").update(`${getHashSalt()}:${namespace}:${value}`).digest("hex").slice(0, 48);
}

export async function getRequestOrigin(): Promise<string | null> {
  const h = await headers();
  return h.get("origin");
}
