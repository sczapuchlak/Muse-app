import {Suspense} from "react";
import type {Metadata} from "next";
import {connection} from "next/server";
import {redirect} from "next/navigation";
import {requireUser} from "@/lib/auth/user";
import {createMuseServerClient} from "@/lib/supabase/server";
import {needsOnboarding} from "@/lib/onboarding";
import {MuseWelcome} from "@/components/auth/MuseWelcome";

export const metadata:Metadata={title:"Welcome to Muse.",description:"A little universe for everything that makes you, you."};

/** Only accounts that still need setup can stay here; everyone else goes straight to Muse. */
async function Welcome(){
 await connection();
 const user=await requireUser(),client=await createMuseServerClient();
 const {data:profile,error}=await client.from("profiles").select("*").eq("id",user.id).single();
 if(error||!profile)throw new Error("Your private profile could not be loaded. Please retry.");
 if(!needsOnboarding(profile))redirect("/");
 return <MuseWelcome profile={{firstName:profile.first_name,timeZone:profile.time_zone,timeZoneConfirmed:!!profile.time_zone_confirmed_at,revision:profile.revision}}/>;
}
export default function Page(){return <Suspense fallback={<main className="muse-page" role="status" aria-busy="true">Opening your universe…</main>}><Welcome/></Suspense>;}
