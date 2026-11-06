"use client";
import {useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore,type FormEvent,type ReactNode} from "react";
import {useRouter} from "next/navigation";
import {readThemePreference,serverThemePreference,subscribeThemePreference} from "@/lib/theme-preference";
import {readMaterial,serverMaterial,subscribeMaterial} from "@/lib/material-preference";
import {createMuseBrowserClient} from "@/lib/supabase/client";
import {writePreferences} from "@/lib/data/account";
import {detectedTimeZone,displayNameError,DISPLAY_NAME_MAX,timeZoneOptions} from "@/lib/onboarding";
import {MuseMagicBridge} from "../MuseMagic";
import {MuseStar} from "../MuseStar";
import {MuseStarCluster} from "../MuseStarCluster";
import {MuseChoiceMenu} from "../MuseChoiceMenu";
import {ThemeChoices,MaterialChoices} from "../AppearanceChoices";
import {LoginAtmosphere} from "./LoginAtmosphere";
import {TakeMuseWithYou} from "./TakeMuseWithYou";
import "../AppShell.css";
import "../LoginPreview.css";
import "./MuseWelcome.css";

type Step="hello"|"personalize"|"done";
type Profile={firstName:string;timeZone:string;timeZoneConfirmed:boolean;revision:number};

/** The live theme and glass, so each choice in onboarding previews the real Muse atmosphere immediately. */
function WelcomeAtmosphere({children}:{children:ReactNode}){
 const theme=useSyncExternalStore(subscribeThemePreference,readThemePreference,serverThemePreference),material=useSyncExternalStore(subscribeMaterial,readMaterial,serverMaterial);
 useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.material=material;},[theme,material]);
 return <div className="muse-app-shell" data-module="welcome" data-rail="expanded"><MuseMagicBridge/><LoginAtmosphere neon={theme==="disco-damage"}/><div className="muse-app-main"><div className="muse-app-content">{children}</div></div></div>;
}

/**
 * First-run setup for an invited account: welcome, personalize (name, timezone, theme, glass), done.
 * Nothing is saved until "Finish setup", so refreshing or leaving midway leaves the profile untouched.
 * The finish save is one idempotent command; a retry after an uncertain failure cannot apply it twice.
 */
export function MuseWelcome({profile}:{profile:Profile}){
 const router=useRouter(),[step,setStep]=useState<Step>("hello"),heading=useRef<HTMLHeadingElement>(null);
 const [name,setName]=useState(profile.firstName),[timeZone,setTimeZone]=useState(()=>profile.timeZoneConfirmed?profile.timeZone:detectedTimeZone());
 const [commandId]=useState(()=>crypto.randomUUID()),[saving,setSaving]=useState(false),[error,setError]=useState(""),[touched,setTouched]=useState(false);
 const options=useMemo(()=>timeZoneOptions([profile.timeZone,timeZone]),[profile.timeZone,timeZone]);
 const nameProblem=displayNameError(name),savedName=name.trim();
 // Move focus to each new step's heading so keyboard and screen-reader users land in the right place.
 useLayoutEffect(()=>{if(step!=="hello")heading.current?.focus();},[step]);

 async function finish(event:FormEvent){
  event.preventDefault();setTouched(true);if(nameProblem||saving)return;
  setSaving(true);setError("");
  try{await writePreferences(createMuseBrowserClient(),profile.revision,commandId,{first_name:savedName,time_zone:timeZone,onboarded:true});setStep("done");}
  catch(failure){
   const code=(failure as {code?:string}).code;
   // Another window already finished setup: the server decides where to go next.
   if(code==="40001"){router.replace("/");return;}
   setError(code==="22023"?"Muse couldn’t accept one of those choices. Check your name and timezone, then try again.":"Your setup isn’t saved yet. Check your connection and try again — your choices are still here.");
  }finally{setSaving(false);}
 }

 return <WelcomeAtmosphere><main className="muse-login-preview muse-welcome" data-step={step}>
  <section className="muse-login-story">
   <span className="muse-login-logo" aria-hidden="true">muse<MuseStar size={32}/></span>
   <MuseStarCluster/>
   <h1 className="whimsy">Welcome to Muse.</h1>
   <p className="muse-welcome-tagline">A little universe for everything that makes you, you.</p>
   <p className="muse-login-invitation">Your plans, rituals, reflections and goals, kept together and kept private. Only you can see what you bring here.</p>
  </section>
  <section className="muse-login-glass muse-welcome-glass" aria-labelledby="welcome-step-title">
   <ol className="muse-welcome-progress" aria-label="Setup progress">{(["hello","personalize","done"] as Step[]).map((s,i)=><li key={s} aria-current={s===step?"step":undefined}><span className="sr-only">Step {i+1} of 3</span></li>)}</ol>
   {step==="hello"&&<div className="muse-welcome-step">
    <h2 id="welcome-step-title" ref={heading} tabIndex={-1}>Your universe is waiting.</h2>
    <p className="card-description">Plan your days, keep your rituals, reflect on how you feel, and track what matters, all in one calm, private place. Let’s make it feel like yours. It takes about a minute.</p>
    <div className="editor-actions"><button type="button" className="muse-button button-primary" onClick={()=>setStep("personalize")}>Personalize my universe</button></div>
   </div>}
   {step==="personalize"&&<form className="muse-welcome-step" onSubmit={finish} noValidate>
    <h2 id="welcome-step-title" ref={heading} tabIndex={-1}>Personalize your universe</h2>
    <label className="editor-label" htmlFor="welcome-name">What should Muse call you?</label>
    <input id="welcome-name" type="text" autoComplete="given-name" maxLength={DISPLAY_NAME_MAX} value={name} aria-invalid={touched&&!!nameProblem} aria-describedby={touched&&nameProblem?"welcome-name-error":undefined} onChange={event=>setName(event.target.value)} onBlur={()=>setTouched(true)}/>
    {touched&&nameProblem&&<p id="welcome-name-error" className="small-label muse-welcome-error" role="alert">{nameProblem}</p>}
    <p className="editor-label">Your timezone</p>
    <MuseChoiceMenu label="Timezone" valueLabel={options.find(option=>option.id===timeZone)?.label??timeZone} options={options} searchable selectedIds={[timeZone]} onSelect={setTimeZone}/>
    <p className="small-label">{profile.timeZoneConfirmed?"Your saved timezone.":"Detected from this device."} Muse uses it for “today” and for dating new entries. Travel won’t change it.</p>
    <fieldset className="muse-welcome-appearance"><legend className="editor-label">Choose your atmosphere</legend><ThemeChoices/></fieldset>
    <fieldset className="muse-welcome-appearance"><legend className="editor-label">Glass</legend><MaterialChoices label="Glass"/><p className="small-label">Theme and glass are saved on this device; you can change them any time in Appearance.</p></fieldset>
    {error&&<p className="muse-welcome-error" role="alert">{error}</p>}
    <div className="editor-actions"><button type="submit" className="muse-button button-primary" disabled={saving}>{saving?"Saving…":"Finish setup"}</button><button type="button" className="text-button" disabled={saving} onClick={()=>setStep("hello")}>Back</button></div>
   </form>}
   {step==="done"&&<div className="muse-welcome-step">
    <h2 id="welcome-step-title" ref={heading} tabIndex={-1}>Welcome home, {savedName}.</h2>
    <p className="card-description">Your universe is ready. You can change your name and timezone in Settings, and your theme in Appearance, whenever you like.</p>
    <TakeMuseWithYou/>
    <div className="editor-actions"><button type="button" className="muse-button button-primary" onClick={()=>router.replace("/?welcome=1")}>Enter Muse</button></div>
   </div>}
  </section>
 </main></WelcomeAtmosphere>;
}
