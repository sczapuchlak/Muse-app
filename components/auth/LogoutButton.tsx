"use client";
import {useState,type FormEvent} from "react";
import {endBrowserSession} from "@/lib/auth/client-session";
import {MuseIcon} from "../MuseIcon";
export function LogoutButton({compact=false}:{compact?:boolean}){
  const [pending,setPending]=useState(false),[error,setError]=useState("");
  async function logout(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(pending)return;setPending(true);setError("");
    try{
      const response=await fetch("/auth/logout",{method:"POST",headers:{Accept:"application/json"}}),result=await response.json();
      if(!response.ok)throw new Error(result.error??"Please try signing out again.");
      endBrowserSession(result.notice==='signed-out-local'?'signed-out-local':'signed-out');
    }catch{setError("Couldn’t finish signing out. Please try again.");setPending(false);}
  }
  return <form className="muse-logout" action="/auth/logout" method="post" onSubmit={logout} aria-busy={pending}><button className="muse-nav-link muse-edge" type="submit" disabled={pending} aria-label="Sign out" title={compact?"Sign out":undefined}><MuseIcon name="logout" size={20}/><span className="muse-nav-label">{pending?"Signing out…":"Sign out"}</span></button>{error&&<p className="small-label" role="alert">{error}</p>}</form>;
}
