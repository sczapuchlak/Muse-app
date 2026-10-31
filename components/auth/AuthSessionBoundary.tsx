"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {createMuseBrowserClient} from "@/lib/supabase/client";
import {logoutSignal,isAccountDeletionPending,sessionExitReleased} from "@/lib/auth/client-session";
export {logoutSignal} from "@/lib/auth/client-session";
/** Full navigation disposes all prototype stores; transient verification failures preserve drafts. */
export function AuthSessionBoundary({userId,children}:{userId:string;children:ReactNode}){
  const leaving=useRef(false),checking=useRef(false),retry=useRef<()=>void>(()=>{}),[state,setState]=useState<"ready"|"checking"|"unavailable"|"leaving">("ready");
  useEffect(()=>{
    const client=createMuseBrowserClient();
    function leave(){if(leaving.current||isAccountDeletionPending())return;leaving.current=true;setState("leaving");window.location.replace("/login?notice=session-expired");}
    async function verify(){
      if(checking.current||leaving.current)return;checking.current=true;
      try{
        const {data,error}=await client.auth.getUser();
        if(error&&(error.name==="AuthRetryableFetchError"||Number(error.status)>=500)){setState("unavailable");return;}
        if(error||data.user?.id!==userId)leave();else setState("ready");
      }catch{setState("unavailable");}finally{checking.current=false;}
    }
    retry.current=()=>{setState("checking");void verify();};
    const {data}=client.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"||(session&&session.user.id!==userId))leave();});
    function stored(event:StorageEvent){if(event.key===logoutSignal&&event.newValue)leave();}
    function restored(event:PageTransitionEvent){if(event.persisted){setState("checking");void verify();}}
    let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(logoutSignal);channel.onmessage=leave;}catch{}
    window.addEventListener(sessionExitReleased,verify);window.addEventListener("focus",verify);window.addEventListener("pageshow",restored);window.addEventListener("storage",stored);
    return()=>{retry.current=()=>{};data.subscription.unsubscribe();channel?.close();window.removeEventListener(sessionExitReleased,verify);window.removeEventListener("focus",verify);window.removeEventListener("pageshow",restored);window.removeEventListener("storage",stored);};
  },[userId]);
  return <>{state!=="ready"&&<main className="muse-page" role="status"><p>{state==="leaving"?"Closing this session…":state==="unavailable"?"Sign-in is unavailable. Your open work is waiting here while we reconnect.":"Checking your session…"}</p>{state==="unavailable"&&<button className="muse-button" type="button" onClick={()=>retry.current()}>Try again</button>}</main>}<div hidden={state!=="ready"}>{children}</div></>;
}
