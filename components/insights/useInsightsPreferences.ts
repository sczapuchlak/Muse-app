'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {defaultInsightsPreferences,readInsightsPreferences,saveInsightsPreferences,type InsightsPreferences} from '@/lib/insights/preferences';

/** Account-level Insights preferences. Failing to load or save never blocks the page; defaults apply. */
export function useInsightsPreferences(userId:string,enabled=true){
 // Created lazily so rendering (and server rendering) never needs a browser client.
 const clientRef=useRef<ReturnType<typeof createMuseBrowserClient>|null>(null),client=useCallback(()=>clientRef.current??=createMuseBrowserClient(),[]);
 const [preferences,setPreferences]=useState<InsightsPreferences>(defaultInsightsPreferences),[loaded,setLoaded]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!enabled)return;let active=true;readInsightsPreferences(client(),userId).then(saved=>{if(active){setPreferences(saved);setLoaded(true);}}).catch(()=>{if(active){setLoaded(true);setError('Insights preferences could not load; defaults are showing.');}});return()=>{active=false;};},[client,userId,enabled]);
 const save=useCallback(async(next:InsightsPreferences)=>{setSaving(true);setError('');try{const confirmed=await saveInsightsPreferences(client(),userId,next);setPreferences(confirmed);return true;}catch{setError('Insights preferences could not be saved. Try again.');return false;}finally{setSaving(false);}},[client,userId]);
 return {preferences,loaded,saving,error,save};
}
