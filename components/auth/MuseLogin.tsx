"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {authMessages,authNoticeMessage,safeReturnPath} from "@/lib/auth/paths";
import {MuseStar} from "../MuseStar";
import {MuseLoginFrame} from "./MuseLoginFrame";
export function MuseLogin({notice="",next="/"}:{notice?:string;next?:string}){
  const [email,setEmail]=useState(''),[method,setMethod]=useState<'code'|'link'>('code'),[step,setStep]=useState<'email'|'code'>('email'),[code,setCode]=useState('');
  const [state,setState]=useState<'idle'|'sending'|'sent'|'verifying'|'invalid'|'error'>('idle'),[error,setError]=useState(''),[cooldown,setCooldown]=useState(0);
  const busy=state==='sending'||state==='verifying',inFlight=useRef(false),codeField=useRef<HTMLInputElement>(null),emailField=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(cooldown<=0)return;const timer=setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
  useEffect(()=>{if(step==='code')codeField.current?.focus();},[step]);
  async function requestCode(){
    if(inFlight.current||cooldown>0)return;
    if(!emailField.current?.validity.valid||!email.trim()){setState('invalid');emailField.current?.focus();return;}
    inFlight.current=true;setState('sending');setError('');
    try{
      const response=await fetch('/auth/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),next:safeReturnPath(next)})});
      const result=await response.json();
      if(!response.ok){setError(result.error??'Your sign-in email couldn’t be sent. Please try again.');setState('error');if(response.status===429)setCooldown(60);return;}
      setState('sent');setCooldown(60);setCode('');if(method==='code')setStep('code');
    }catch{setError('Couldn’t reach sign-in. Check your connection and try again.');setState('error');}finally{inFlight.current=false;}
  }
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();await requestCode();}
  async function verify(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(inFlight.current)return;
    if(!/^\d{6}$/.test(code)){setError('Enter the six-digit code from your email.');setState('error');codeField.current?.focus();return;}
    inFlight.current=true;setState('verifying');setError('');
    try{
      const response=await fetch('/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),code,next:safeReturnPath(next)})});
      const result=await response.json();if(!response.ok||result.ok!==true){setError(result.error??'Your code could not be verified. Please try again.');setState('error');if(response.status===429)setCooldown(60);return;}
      // Full navigation makes the existing server-verified session boundary authoritative.
      window.location.assign(safeReturnPath(result.next));
    }catch{setError('Couldn’t verify your code. Check your connection and try again.');setState('error');}finally{inFlight.current=false;}
  }
  const feedback=state==='invalid'?'Enter a valid email address.':state==='error'?error:state==='sending'?'Sending your sign-in email…':state==='verifying'?'Verifying your code…':state==='sent'?(method==='code'?'If this address has an invitation, a code is on its way. Enter the six digits from the latest email.':authMessages.sent):authNoticeMessage(notice)??'Use the email address that received your invitation.';
  return <MuseLoginFrame><span className="editor-label">YOUR OWN LITTLE CORNER OF THE UNIVERSE <MuseStar size={14}/></span><h2 id="login-preview-title">Welcome to Muse.</h2><p className="card-description">For everything you are and everything you&apos;re becoming.</p>
    <div className="editor-actions" role="group" aria-label="Sign-in method">{(['code','link'] as const).map(value=><button key={value} type="button" className="choice-button" aria-pressed={method===value} disabled={busy} onClick={()=>{setMethod(value);setStep('email');setCode('');setError('');setState('idle');}}>{value==='code'?'Email code (recommended)':'Magic link'}</button>)}</div>
    <form action="/auth/link" method="post" noValidate onSubmit={submit} aria-busy={busy} hidden={step!=='email'}>
      <label className="editor-label" htmlFor="login-email">Email address</label><input ref={emailField} name="email" id="login-email" type="email" autoComplete="email" inputMode="email" maxLength={254} required placeholder="you@example.com" value={email} aria-invalid={state==='invalid'} aria-describedby="login-feedback" disabled={busy} onChange={event=>{setEmail(event.target.value);setState('idle');setError('');}}/>
      <input type="hidden" name="next" value={safeReturnPath(next)}/>
      <button type="submit" className="muse-button button-primary" disabled={busy||cooldown>0}>{state==='sending'?'Sending…':cooldown>0?`Request again in ${cooldown}s`:method==='code'?'Send me a verification code':'Send me a magic link'}<MuseStar size={15}/></button>
    </form>
    {step==='code'&&<form action="/auth/verify" method="post" noValidate onSubmit={verify} aria-busy={busy}>
      <p className="small-label">Code for {email.trim()}</p><label className="editor-label" htmlFor="login-code">Six-digit verification code</label>
      <input ref={codeField} name="code" id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onPaste={event=>{const pasted=event.clipboardData.getData("text").replace(/\D/g,"");if(pasted.length===6){event.preventDefault();setCode(pasted);setError("");setState("idle");}}} placeholder="000000" aria-describedby="login-feedback" aria-invalid={state==='error'} disabled={busy} onChange={event=>{setCode(event.target.value.replace(/\D/g,'').slice(0,6));setError('');setState('idle');}}/>
      <button type="submit" className="muse-button button-primary" disabled={busy}>{state==='verifying'?'Verifying…':'Verify & enter Muse'}<MuseStar size={15}/></button>
      <div className="editor-actions"><button type="button" className="muse-button button-ghost" disabled={busy||cooldown>0} onClick={()=>void requestCode()}>{cooldown>0?`Resend in ${cooldown}s`:'Resend code'}</button><button type="button" className="muse-button button-ghost" disabled={busy} onClick={()=>{setStep('email');setCode('');setError('');setState('idle');setTimeout(()=>emailField.current?.focus(),0);}}>Change email</button></div>
    </form>}
    <p id="login-feedback" role={state==='error'||state==='invalid'?'alert':'status'} className="muse-login-feedback">{feedback}</p>
    <p className="small-label">Private, invite-only access. An invitation is required; this form never creates an account.</p>
  </MuseLoginFrame>;
}
