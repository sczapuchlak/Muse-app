import {Suspense,type ReactNode} from "react";
import {requireUser} from "@/lib/auth/user";
import {AppShell} from "@/components/AppShell";
import {AuthSessionBoundary} from "@/components/auth/AuthSessionBoundary";
async function PrivateApp({children}:{children:ReactNode}){
  const user=await requireUser();
  return <AuthSessionBoundary userId={user.id}><AppShell key={user.id}>{children}</AppShell></AuthSessionBoundary>;
}
export default function Layout({children}:{children:ReactNode}){
  return <Suspense fallback={<main className="muse-page" role="status" aria-busy="true">Opening your space…</main>}><PrivateApp>{children}</PrivateApp></Suspense>;
}
