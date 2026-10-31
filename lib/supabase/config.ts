import {assertPublicSupabaseKey} from './public-key';
/** Public configuration only; a privileged admin key must never enter this module. */
export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  assertPublicSupabaseKey(key);
  return { url, key };
}
