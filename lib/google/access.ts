import "server-only";
import type { createMuseAdminClient } from "@/lib/supabase/admin";
import { open, seal } from "./crypto";
import { refreshAccess } from "./oauth";

/** Server-only Google access shared by the read sync and the writes (#35, #112). Tokens never leave the server. */
type Admin = ReturnType<typeof createMuseAdminClient>;
export class GoogleReconnectError extends Error {}

export async function accessToken(admin: Admin, connectionId: string) {
  const { data, error } = await admin.from("google_tokens").select("*").eq("connection_id", connectionId).maybeSingle();
  if (error) throw error;
  if (!data) throw new GoogleReconnectError("Reconnect Google Calendar to continue.");
  if (data.access_ciphertext && data.access_expires_at && Date.parse(data.access_expires_at) - Date.now() > 60_000) return open(data.access_ciphertext);
  try {
    const t = await refreshAccess(open(data.refresh_ciphertext));
    const patch = { access_ciphertext: seal(t.access_token), access_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(), updated_at: new Date().toISOString(),
      ...(t.refresh_token ? { refresh_ciphertext: seal(t.refresh_token) } : {}) };
    const saved = await admin.from("google_tokens").update(patch).eq("connection_id", connectionId);
    if (saved.error) throw saved.error;
    return t.access_token;
  } catch (e) {
    // invalid_grant: revoked, password change, or the 7-day expiry of a Testing-mode OAuth client.
    if ((e as { revoked?: boolean }).revoked) throw new GoogleReconnectError("Google access expired or was removed. Reconnect to keep seeing your calendars.");
    throw e;
  }
}

export async function profileTimeZone(admin: Admin, userId: string) {
  const { data } = await admin.from("profiles").select("time_zone").eq("id", userId).maybeSingle();
  return data?.time_zone || "UTC";
}
