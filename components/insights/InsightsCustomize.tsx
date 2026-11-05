'use client';
import {useState} from 'react';
import {MuseModal} from '../MuseModal';
import {insightRanges,insightSections,type InsightSection,type InsightsPreferences} from '@/lib/insights/preferences';

const rangeLabels:Record<InsightsPreferences['defaultRange'],string>={'7':'7 days','30':'30 days','90':'90 days',year:'This year'};

/** Small, optional personalization: which sections show, where Insights opens, and the Daily Edit goals glance. */
export function InsightsCustomize({preferences,labels,saving,error,returnFocus,onSave,onClose}:{preferences:InsightsPreferences;labels:Record<InsightSection,string>;saving:boolean;error:string;returnFocus:HTMLElement|null;onSave:(next:InsightsPreferences)=>Promise<boolean>;onClose:()=>void}){
 const [draft,setDraft]=useState(preferences);
 const toggle=(id:InsightSection)=>setDraft(current=>{const hidden=current.hidden.includes(id)?current.hidden.filter(v=>v!==id):[...current.hidden,id];return {...current,hidden,defaultView:hidden.includes(current.defaultView as InsightSection)?'overview':current.defaultView};});
 return <MuseModal id="insights-customize" label="Customize Insights" title="Customize Insights" returnFocus={returnFocus} onClose={onClose}>
  <form className="muse-insights-customize" onSubmit={async event=>{event.preventDefault();if(await onSave(draft))onClose();}}>
   <fieldset><legend>Sections</legend><p className="small-label">Overview always shows. Hiding a section never removes its records.</p>
    <div className="muse-form-choice-list">{insightSections.map(id=><button key={id} type="button" className="choice-button" aria-pressed={!draft.hidden.includes(id)} onClick={()=>toggle(id)}>{labels[id]}</button>)}</div></fieldset>
   <label className="editor-label">Open Insights on<select value={draft.defaultView} onChange={event=>setDraft({...draft,defaultView:event.target.value as InsightsPreferences['defaultView']})}><option value="overview">Overview</option>{insightSections.filter(id=>!draft.hidden.includes(id)).map(id=><option key={id} value={id}>{labels[id]}</option>)}</select></label>
   <label className="editor-label">Default period<select value={draft.defaultRange} onChange={event=>setDraft({...draft,defaultRange:event.target.value as InsightsPreferences['defaultRange']})}>{insightRanges.map(id=><option key={id} value={id}>{rangeLabels[id]}</option>)}</select></label>
   <label className="muse-insights-customize-check"><input type="checkbox" checked={draft.dailyGoals} onChange={event=>setDraft({...draft,dailyGoals:event.target.checked})}/>Show Wellness goals on Daily Edit (only when you have an active goal)</label>
   {error&&<p role="alert" className="small-label">{error}</p>}
   <div className="editor-actions"><button type="submit" className="muse-button button-primary" disabled={saving}>{saving?'Saving…':'Save'}</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
  </form>
 </MuseModal>;
}
