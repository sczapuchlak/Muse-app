import {connection} from "next/server";
import {Suspense,type ReactNode} from "react";
import {requireUser} from "@/lib/auth/user";
import {createMuseServerClient} from "@/lib/supabase/server";
import {AppShell} from "@/components/AppShell";
import {AuthSessionBoundary} from "@/components/auth/AuthSessionBoundary";
async function PrivateApp({children}:{children:ReactNode}){
  await connection(); // Identity, profile and local Today are request-bound, never prerender-time values.
  const user=await requireUser();
  const client=await createMuseServerClient();
  const {data:profile,error}=await client.from("profiles").select("first_name,time_zone").eq("id",user.id).single();
  if(error||!profile)throw new Error("Your private profile could not be loaded. Please retry.");
  return <AuthSessionBoundary userId={user.id}><AppShell key={user.id} profile={{id:user.id,firstName:profile.first_name,timeZone:profile.time_zone}}>{children}</AppShell></AuthSessionBoundary>;
}
export default function Layout({children}:{children:ReactNode}){
  return <Suspense fallback={<main className="muse-page" role="status" aria-busy="true">Opening your space…</main>}><PrivateApp>{children}</PrivateApp></Suspense>;
}
