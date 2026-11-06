"use client";
/**
 * Applies the person's chosen appearance to the real app: base theme, glass material and (optionally) an applied
 * Theme Atelier remix. It also syncs that choice across signed-in devices through appearance_preferences.
 * The newest change wins; this browser's copy keeps first paint instant and works offline.
 */
import {useEffect,useLayoutEffect,useSyncExternalStore} from 'react';
import {readThemePreference,serverThemePreference,subscribeThemePreference,selectTheme} from '@/lib/theme-preference';
import {readMaterial,serverMaterial,subscribeMaterial,selectMaterial} from '@/lib/material-preference';
import {isThemeId} from '@/lib/themes';
import {readApplied,serverApplied,subscribeApplied,applyAtelier,clearApplied} from '@/lib/atelier/applied';
import {compileTheme} from '@/lib/atelier/model';
import {setIconGeometry} from '@/lib/atelier/icon-gradient';
import {readRemoteAppearance,writeRemoteAppearance} from '@/lib/atelier/persistence';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {readThemeOverride,serverThemeOverride,subscribeThemeOverride} from '@/lib/theme-override';

const STAMP_KEY='muse.appearance.updated';
const readStamp=()=>{try{return window.localStorage.getItem(STAMP_KEY);}catch{return null;}};
const writeStamp=(value:string)=>{try{window.localStorage.setItem(STAMP_KEY,value);}catch{/* memory only */}};
let applyingRemote=false;

/** Writes the remix as one scoped stylesheet; removing it returns the page to the pure base theme. */
export function useAtelierStyle(scope:string,definition:Parameters<typeof compileTheme>[0]|null,{publishIcons=true}:{publishIcons?:boolean}={}){
 useLayoutEffect(()=>{
  const root=document.documentElement,id=`muse-atelier-${scope}`;
  let style=document.getElementById(id) as HTMLStyleElement|null;
  if(!definition){style?.remove();if(root.getAttribute('data-atelier')===scope){root.removeAttribute('data-atelier');root.removeAttribute('data-atelier-stars');}if(publishIcons)setIconGeometry(null);return;}
  const compiled=compileTheme(definition,scope);
  if(!style){style=document.createElement('style');style.id=id;document.head.appendChild(style);}
  style.textContent=compiled.css;
  root.setAttribute('data-atelier',scope);
  if(compiled.stars==='normal')root.removeAttribute('data-atelier-stars');else root.setAttribute('data-atelier-stars',compiled.stars);
  if(publishIcons)setIconGeometry({angle:compiled.iconAngle,middle:compiled.iconMiddle});
 },[scope,definition,publishIcons]);
}

export function AppearanceBridge({userId}:{userId:string}){
 const theme=useSyncExternalStore(subscribeThemePreference,readThemePreference,serverThemePreference);
 const material=useSyncExternalStore(subscribeMaterial,readMaterial,serverMaterial);
 const applied=useSyncExternalStore(subscribeApplied,readApplied,serverApplied);
 // A profile on screen may lend the page its theme (lib/theme-override); the person's own appearance returns after.
 const override=useSyncExternalStore(subscribeThemeOverride,readThemeOverride,serverThemeOverride);
 // Write live stored values, never the hydration-time server default (that would flash the default theme).
 useLayoutEffect(()=>{document.documentElement.setAttribute('data-theme',readThemeOverride()??readApplied()?.definition.base??readThemePreference());},[theme,applied,override]);
 useAtelierStyle('applied',override?null:applied?.definition??null);
 useLayoutEffect(()=>{document.documentElement.setAttribute('data-material',readMaterial());},[material]);

 useEffect(()=>{
  const client=createMuseBrowserClient();let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;
  const push=()=>{clearTimeout(timer);timer=setTimeout(()=>{const updatedAt=readStamp()??new Date().toISOString();
   writeRemoteAppearance(client,userId,{theme:readThemePreference(),material:readMaterial(),atelier:readApplied(),updatedAt}).catch(()=>{/* stays local; retried on the next change */});},500);};
  const changed=()=>{if(applyingRemote)return;writeStamp(new Date().toISOString());push();};
  (async()=>{
   try{
    const remote=await readRemoteAppearance(client,userId);if(cancelled)return;
    const local=readStamp();
    if(remote&&(!local||remote.updatedAt>local)){
     applyingRemote=true;
     try{
      if(remote.atelier)applyAtelier(remote.atelier);else{if(isThemeId(remote.theme))selectTheme(remote.theme);clearApplied();}
      selectMaterial(remote.material);writeStamp(remote.updatedAt);
     }finally{applyingRemote=false;}
    }else if(!remote||(local&&local>remote.updatedAt)){if(!local)writeStamp(new Date().toISOString());push();}
   }catch{/* offline or not yet migrated: this browser's appearance still works */}
  })();
  const events=['muse-theme-change','muse-material-change','muse-atelier-change'];
  events.forEach(name=>window.addEventListener(name,changed));
  return()=>{cancelled=true;clearTimeout(timer);events.forEach(name=>window.removeEventListener(name,changed));};
 },[userId]);
 return null;
}
