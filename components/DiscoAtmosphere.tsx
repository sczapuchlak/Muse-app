"use client";
import {useLayoutEffect,useRef,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import {readThemePreference,serverThemePreference,subscribeThemePreference} from '@/lib/theme-preference';
import './DiscoAtmosphere.css';
/** Theme artwork stays in the shared atmospheric plane and masks actual header hit/copy regions. */
export function DiscoAtmosphere(){const theme=useSyncExternalStore(subscribeThemePreference,readThemePreference,serverThemePreference),path=usePathname(),ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(theme!=='disco-damage')return;const ball=ref.current;if(!ball)return;ball.style.visibility='hidden';let resize:ResizeObserver|undefined;const root=document.getElementById('muse-main-content');if(!root)return;
 function measure(){if(!ball)return;const box=ball.getBoundingClientRect(),header=Array.from(root!.querySelectorAll<HTMLElement>('.muse-header-layout')).find((item)=>item.getBoundingClientRect().width>0);if(!header){ball.style.visibility='hidden';return;}(['.muse-header-identity','.muse-header-context'] as const).forEach((selector,index)=>{const region=header.querySelector<HTMLElement>(selector)?.getBoundingClientRect();ball.style.setProperty(`--ball-safe-${index}-x`,`${region?region.left-box.left-10:-1000}px`);ball.style.setProperty(`--ball-safe-${index}-y`,`${region?region.top-box.top-10:-1000}px`);ball.style.setProperty(`--ball-safe-${index}-w`,`${region?region.width+20:0}px`);ball.style.setProperty(`--ball-safe-${index}-h`,`${region?region.height+20:0}px`);});ball.style.visibility='visible';}
 function connect(){const header=Array.from(root!.querySelectorAll<HTMLElement>('.muse-header-layout')).find((item)=>item.getBoundingClientRect().width>0);if(!header){ball!.style.visibility='hidden';return;}resize?.disconnect();resize=new ResizeObserver(measure);resize.observe(header);resize.observe(ball!);header.querySelectorAll('.muse-header-identity,.muse-header-context').forEach((item)=>resize!.observe(item));measure();}
 connect();const mutation=new MutationObserver(connect);mutation.observe(root,{childList:true,subtree:true});window.addEventListener('resize',measure);return ()=>{resize?.disconnect();mutation.disconnect();window.removeEventListener('resize',measure);};},[theme,path]);
 return <div className="muse-disco-environment" aria-hidden="true"><div ref={ref} className="muse-disco-ball"/><div className="muse-disco-spill"/><div className="muse-disco-caustics"/></div>;
}
