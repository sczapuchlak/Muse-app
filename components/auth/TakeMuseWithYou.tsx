"use client";
/* eslint-disable @next/next/no-img-element -- the bundled app icon, shown at its real home-screen size. */
import {useState,useSyncExternalStore} from "react";
import {detectInstallPlatform,installSteps,phoneGuides,promptInstall,readInstallState,serverInstallState,subscribeInstall,type InstallPlatform} from "@/lib/pwa-install";
import {MuseStar} from "../MuseStar";

const noop=()=>()=>{};
const readPlatform=():InstallPlatform=>detectInstallPlatform({userAgent:navigator.userAgent,maxTouchPoints:navigator.maxTouchPoints,
 standalone:window.matchMedia?.("(display-mode: standalone)").matches||(navigator as Navigator&{standalone?:boolean}).standalone===true});

function Guide({id}:{id:keyof typeof installSteps}){
 const guide=installSteps[id];
 return <div className="muse-take-muse-guide"><p className="small-label">{guide.label}</p><ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol>{guide.note&&<p className="small-label">{guide.note}</p>}</div>;
}

/** Optional: add Muse to a home screen or dock. Platform-aware steps, plus the browser's own prompt when offered. */
export function TakeMuseWithYou(){
 const platform=useSyncExternalStore(noop,readPlatform,()=>"unknown" as InstallPlatform);
 const install=useSyncExternalStore(subscribeInstall,readInstallState,serverInstallState);
 const [asked,setAsked]=useState(false);
 const host=useSyncExternalStore(noop,()=>window.location.host,()=>"");
 const installed=platform==="installed"||install==="installed";
 const own=platform in installSteps?platform as keyof typeof installSteps:null;
 return <section className="muse-take-muse" aria-labelledby="take-muse-title">
  <div className="muse-take-muse-head">
   <span className="muse-take-muse-icon" aria-hidden="true"><img src="/apple-touch-icon.png" width={52} height={52} alt=""/><small>Muse</small></span>
   <div><h3 id="take-muse-title"><MuseStar size={15}/>A little magic, one tap away.</h3>
    <p>Muse is a web app with an app-like experience. Add it to your home screen for quick access to your universe—no app store required.</p></div>
  </div>
  {installed?<p className="muse-take-muse-done">You’re already opening Muse like an app. Lovely.</p>:<>
   {install==="promptable"&&<button type="button" className="muse-button muse-edge" disabled={asked} onClick={async()=>{setAsked(true);await promptInstall();}}>Add Muse to this device</button>}
   <details className="muse-take-muse-how">
    <summary>How to add Muse{host?<span className="small-label"> from {host}</span>:null}</summary>
    {own?<Guide id={own}/>:<><p className="small-label">Muse feels most at home on your phone. Open {host||"Muse"} there, then:</p>{phoneGuides.map(id=><Guide key={id} id={id}/>)}</>}
   </details>
  </>}
  <p className="small-label">Optional. Muse works right here in your browser too.</p>
 </section>;
}
