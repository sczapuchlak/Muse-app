import "server-only";
import { publicSupabaseConfig } from "@/lib/supabase/config";
const loopback = new Set(["localhost","127.0.0.1","[::1]"]);
/** Hosted authentication is deliberately outside this local-only stage. */
export function localAuthConfig() {
  const {url,key}=publicSupabaseConfig();
  const site=new URL(process.env.SITE_URL || "http://localhost:3000");
  const api=new URL(url);
  if (!loopback.has(site.hostname) || !loopback.has(api.hostname) || !["http:","https:"].includes(site.protocol) || !["http:","https:"].includes(api.protocol)) throw new Error("This authentication stage requires local endpoints.");
  return {url,key,origin:site.origin};
}
