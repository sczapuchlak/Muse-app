import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { publicSupabaseConfig } from "./config";

/** Request-scoped. Only Route Handlers/Server Actions may opt into cookie writes. */
export async function createMuseServerClient({ cookieWrites = false } = {}) {
  const { url, key } = publicSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        if (!cookieWrites) return; // The later auth refresh boundary owns writes for RSC reads.
        for (const { name, value, options } of values) cookieStore.set(name, value, options);
      },
    },
  });
}
