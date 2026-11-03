import { navigation } from "@/lib/navigation";
import {whimsyExperiences} from '@/lib/whimsy/models';
const destinations = new Set([...navigation.map(item => item.href),...whimsyExperiences.map(id=>`/whimsy/${id}`)]);
const base = "http://muse.local";
/** Return paths never escape the app, target auth endpoints, or become protocol-relative. */
export function safeReturnPath(input: unknown): string {
  if (typeof input !== "string" || input.length>2048 || !input.startsWith("/") || input.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(input)) return "/";
  try {
    const url = new URL(input, base);
    if (url.origin !== base || !destinations.has(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}
export function isPublicAuthPath(path:string) {
  return path === "/login" || path === "/login-preview" || ["/auth/link","/auth/verify","/auth/confirm","/auth/logout"].includes(path);
}
export function validLoginEmail(input:unknown): input is string {
  return typeof input === "string" && input.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}
export const returnCookie = "muse-auth-return";
export const authMessages:Record<string,string> = {
  "link-expired":"That link has expired or has already been used. Request a fresh one below.",
  "invalid-link":"That sign-in link is incomplete or invalid. Request a fresh one below.",
  "unavailable":"Sign-in is temporarily unavailable. Please try again.",
  "signed-out":"You’re signed out.",
  "account-deleted":"Your account and saved Muse data have been deleted.",
  "signed-out-local":"You’re signed out of this browser. Server session revocation could not be confirmed.",
  "session-expired":"Your session has ended. Sign in again to return to Muse.",
  "sent":"If this address has an invitation, a sign-in link is on its way. Check your email inbox.",
};

export function authNoticeMessage(notice:string):string|undefined{return Object.hasOwn(authMessages,notice)?authMessages[notice]:undefined;}
