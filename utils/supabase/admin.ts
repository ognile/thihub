import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.THIHUB_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.THIHUB_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("missing THIHUB_SUPABASE_URL or THIHUB_SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
