"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser client using only the PUBLISHABLE key. It acts as the signed-in
 * editor (session cookie) and is used solely to upload raw files to Storage;
 * Row Level Security / storage policies decide what it may do. No secret or
 * service-role key ever reaches the browser.
 */
export function getBrowserClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return client;
}
