'use client';
import {useEffect,useMemo,useSyncExternalStore} from 'react';
import type {Signal} from '@/lib/almanac/types';
import {almanacLibrary} from '@/lib/almanac/library';
import {selectAlmanac,type Surface} from '@/lib/almanac/select';
import {almanacSnapshot,dismissPick,muteFamily,recordPicks,subscribeAlmanac,type AlmanacState} from '@/lib/almanac/store';

const server:AlmanacState={ready:false,userId:'',prefs:{enabled:false,sensitive:false,crossModule:false,quietness:'quiet',mutedFamilies:[]},history:[],remote:false,error:''};
export function useAlmanacState(){return useSyncExternalStore(subscribeAlmanac,almanacSnapshot,()=>server);}

/**
 * What Muse says on one surface today. Nothing renders until settings and history have loaded, so a dismissed or
 * cooling-down line never flashes. `signals` must be memoized by the caller.
 */
export function useAlmanac(surface:Surface,signals:Signal[],today:string|null|undefined){
 const state=useAlmanacState();
 const picks=useMemo(()=>state.ready&&today?selectAlmanac({signals,library:almanacLibrary,prefs:state.prefs,history:state.history,today,surface,userId:state.userId}):[],[state.ready,state.prefs,state.history,state.userId,signals,today,surface]);
 const key=picks.map(p=>`${p.entry.id}:${p.variant.id}`).join('|');
 useEffect(()=>{if(today&&picks.length)void recordPicks(picks,surface.id,today);},[key,today,surface.id]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` captures the picks
 return {picks,prefs:state.prefs,ready:state.ready,
  dismiss:(i:number)=>{const p=picks[i];if(p&&today)void dismissPick(p,surface.id,today);},
  mute:(i:number)=>{const p=picks[i];if(p)void muteFamily(p.entry.family);}};
}
