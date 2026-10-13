import { createClient } from "@supabase/supabase-js";

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Provide it via .env.local or the environment.`);
    process.exit(1);
  }
  return value;
}

export function serviceClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SECRET_KEY");
  return {
    url,
    db: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

export function isLocalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}
