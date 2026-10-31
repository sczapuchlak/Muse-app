"use client";
import {useEffect,useState,type FormEvent} from "react";
import {authMessages,authNoticeMessage,safeReturnPath} from "@/lib/auth/paths";
import {MuseStar} from "../MuseStar";
import {MuseLoginFrame} from "./MuseLoginFrame";
export function MuseLogin({notice="",next="/"}:{notice?:string;next?:string}){
  const [email,setEmail]=useState(""),[state,setState]=useState<"idle"|"sending"|"sent"|"invalid"|"error">("idle"),[error,setError]=useState(""),[cooldown,setCooldown]=useState(0);
  useEffect(()=>{if(cooldown<=0)return;const timer=setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(state==="sending"||cooldown>0)return;
    const form=event.currentTarget,field=form.elements.namedItem("email") as HTMLInputElement;
    if(!field.validity.valid||!email.trim()){setState("invalid");field.focus();return;}
    setState("sending");setError("");
    try{
      const response=await fetch("/auth/link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim(),next:safeReturnPath(next)})});
      const result=await response.json();
      if(!response.ok){setError(result.error??"Your link couldn’t be sent. Please try again.");setState("error");if(response.status===429)setCooldown(60);return;}
      setState("sent");setCooldown(60);
    }catch{setError("Couldn’t reach local sign-in. Check your connection and try again.");setState("error");}
  }
  const feedback=state==="invalid"?"Enter a valid email address.":state==="error"?error:state==="sending"?"Sending your sign-in link…":state==="sent"?authMessages.sent:authNoticeMessage(notice)??"Use the email address that received your invitation.";
  return <MuseLoginFrame><span className="editor-label">YOUR OWN LITTLE CORNER OF THE UNIVERSE <MuseStar size={14}/></span><h2 id="login-preview-title">Welcome to Muse.</h2><p className="card-description">For everything you are and everything you&apos;re becoming.</p>
    <form action="/auth/link" method="post" noValidate onSubmit={submit} aria-busy={state==="sending"}>
      <label className="editor-label" htmlFor="login-email">Email address</label><input name="email" id="login-email" type="email" autoComplete="email" inputMode="email" maxLength={254} required placeholder="you@example.com" value={email} aria-invalid={state==="invalid"} aria-describedby="login-feedback" disabled={state==="sending"} onChange={event=>{setEmail(event.target.value);setState("idle");setError("");}}/>
      <input type="hidden" name="next" value={safeReturnPath(next)}/>
      <button type="submit" className="muse-button button-primary" disabled={state==="sending"||cooldown>0}>{state==="sending"?"Sending your link…":cooldown>0?`Request another link in ${cooldown}s`:state==="sent"?"Send another magic link":"Send me a magic link"}<MuseStar size={15}/></button>
      <p id="login-feedback" role={state==="error"||state==="invalid"?"alert":"status"} className="muse-login-feedback">{feedback}</p>
    </form>
    <p className="small-label">Private, invite-only access. An invitation is required; this form never creates an account.</p>
  </MuseLoginFrame>;
}
