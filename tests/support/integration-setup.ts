import { config } from "dotenv";

// Integration tests run against the LOCAL Supabase stack only.
config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error(
    `Refusing to run integration tests: NEXT_PUBLIC_SUPABASE_URL (${url || "unset"}) is not a local address. ` +
      "These tests create and delete data; run them only against `supabase start`.",
  );
}
process.env.SUBMISSION_HASH_SALT ||= "integration-test-salt-not-a-secret";
