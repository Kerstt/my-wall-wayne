import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browserClient: SupabaseClient | null = null;

function assertEnv() {
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.",
    );
  }
  return { url, key };
}

/** Singleton client for the browser (shares one realtime socket). */
export function getBrowserClient() {
  if (!browserClient) {
    const env = assertEnv();
    browserClient = createClient(env.url, env.key);
  }
  return browserClient;
}

/** Fresh, stateless client for server components. */
export function getServerClient() {
  const env = assertEnv();
  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
