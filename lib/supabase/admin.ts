import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Reserved for explicitly authorized admin/privacy operations, never ordinary user CRUD. */
export function createMuseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Server-only Supabase administration is not configured.");
  return createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
