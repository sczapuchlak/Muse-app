import "server-only";
import {authConfig} from "./config";
import {cache} from "react";
import {redirect} from "next/navigation";
import {createMuseServerClient} from "@/lib/supabase/server";
/** Request-scoped identity verification, not a user object trusted from client storage. */
export const verifiedUser=cache(async()=>{
  authConfig();
  const client=await createMuseServerClient();
  const {data,error}=await client.auth.getUser();
  if(error||!data.user)return null;
  return {id:data.user.id};
});
export async function requireUser(){const user=await verifiedUser();if(!user)redirect("/login?notice=session-expired");return user;}
