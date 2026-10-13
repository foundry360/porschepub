// Unit tests must never touch real services. Provide inert, obviously fake config.
process.env.NEXT_PUBLIC_SITE_URL = "https://journal.example.test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
process.env.SUBMISSION_HASH_SALT = "unit-test-salt-not-a-secret";
