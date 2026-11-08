import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
/** AES-256-GCM with GOOGLE_TOKEN_KEY (32 bytes, base64). Output: v1.<iv>.<tag>.<ciphertext>, all base64url. */
function key() {
  const raw = process.env.GOOGLE_TOKEN_KEY, k = raw ? Buffer.from(raw, "base64") : null;
  if (!k || k.length !== 32) throw new Error("Google Calendar is not configured (token key).");
  return k;
}
export function seal(plain: string) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv), body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}
export function open(sealed: string) {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unreadable token.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}
