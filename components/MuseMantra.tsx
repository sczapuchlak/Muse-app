"use client";
import { useSyncExternalStore } from 'react';
import { mantraWindow,nextMantraBoundary,selectMantra,type MantraModule } from '@/lib/mantras';
import './MuseMantra.css';
const listeners=new Set<()=>void>();let timer:ReturnType<typeof setTimeout>|undefined;
function refresh(){listeners.forEach((listener)=>listener());if(timer)clearTimeout(timer);if(listeners.size)timer=setTimeout(refresh,Math.max(100,nextMantraBoundary(new Date()).getTime()-Date.now()+50));}
function subscribe(listener:()=>void){listeners.add(listener);if(listeners.size===1){window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);refresh();}return ()=>{listeners.delete(listener);if(!listeners.size){clearTimeout(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);}};}
function getSnapshot(){return mantraWindow(new Date());}function serverSnapshot(){return null;}
export function MuseMantra({module,variant='standard',editorial=false}:{module:MantraModule;variant?:'compact'|'standard';editorial?:boolean}) {
 const window=useSyncExternalStore(subscribe,getSnapshot,serverSnapshot);
 return <p className={`muse-mantra muse-mantra-${variant}${editorial?' whimsy':''}`}>{selectMantra(module,window)}</p>;
}
