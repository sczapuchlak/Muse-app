import {connection} from "next/server";
import {Suspense,type ReactNode} from "react";
import {requireUser} from "@/lib/auth/user";
import {redirect} from "next/navigation";
import {needsOnboarding} from "@/lib/onboarding";
import {createMuseServerClient} from "@/lib/supabase/server";
import {AppShell} from "@/components/AppShell";
import {AuthSessionBoundary} from "@/components/auth/AuthSessionBoundary";
async function PrivateApp({children}:{children:ReactNode}){
  await connection(); // Identity, profile and local Today are request-bound, never prerender-time values.
  const user=await requireUser();
  const client=await createMuseServerClient();
  // The whole row, so a database without the onboarding column (pre-migration) still loads and skips onboarding.
  const {data:profile,error}=await client.from("profiles").select("*").eq("id",user.id).single();
  if(error||!profile)throw new Error("Your private profile could not be loaded. Please retry.");
  // New invited accounts set up their universe first; existing and finished accounts never see this.
  if(needsOnboarding(profile))redirect("/welcome");
  return <AuthSessionBoundary userId={user.id}><AppShell key={user.id} profile={{id:user.id,firstName:profile.first_name,timeZone:profile.time_zone}}>{children}</AppShell></AuthSessionBoundary>;
}
export default function Layout({children}:{children:ReactNode}){
  return <Suspense fallback={<main className="muse-page" role="status" aria-busy="true">Opening your space…</main>}><PrivateApp>{children}</PrivateApp></Suspense>;
}
