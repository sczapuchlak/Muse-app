'use client';
import {useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {aspirationCategories,progressKindLabels,timeframeLabels,type Aspiration,type AspirationConnection,type ProgressKind,type Timeframe} from '@/lib/aspirations/models';
import {timeframeDates} from '@/lib/aspirations/progress';
import {metricInfo,type ProgressMetric} from '@/lib/progress/engine';

const connectable:{id:string;label:string;connection:(year:string)=>AspirationConnection}[]=[
 {id:'reading-challenge',label:'My Reading Challenge (Bookshelf)',connection:year=>({kind:'reading-challenge',year})},
 ...(['books-finished','reading-minutes','reading-pages','tasks-completed','workouts','workout-minutes','water'] as ProgressMetric[]).map(metric=>({id:metric,label:`${metricInfo[metric].label} (${metricInfo[metric].owner})`,connection:():AspirationConnection=>({kind:'metric',metric})})),
];
const connectionId=(c:AspirationConnection|null)=>c?.kind==='reading-challenge'?'reading-challenge':c?.kind==='metric'?c.metric:'';

export function blankAspiration(today:string):Aspiration{
 const {start,target}=timeframeDates('year',today);
 return {id:crypto.randomUUID(),title:'',description:null,motivation:null,category:'Personal',icon:null,accent:null,startDate:start,targetDate:target,timeframe:'year',status:'active',
  progressKind:'milestones',target:null,unit:null,connection:null,milestones:[],ritualIds:[],taskIds:[],reflection:null,completedOn:null,celebrated:[],position:Date.now()%1000000,renewedFrom:null,revision:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}

/**
 * Create or edit an aspiration. Only a title is required; the rest is progressive. A Reading Challenge connection
 * stores no target here: the challenge itself (in Bookshelf) stays the one authority.
 */
export function AspirationEditor({initial,today,busy,error,onSave,onClose}:{initial:Aspiration;today:string;busy:boolean;error:string;onSave:(a:Aspiration)=>void;onClose:()=>void}){
 const [a,setA]=useState<Aspiration>(initial),[more,setMore]=useState(initial.revision>0),[milestoneText,setMilestoneText]=useState('');
 const set=(patch:Partial<Aspiration>)=>setA(x=>({...x,...patch}));
 const isNew=initial.revision===0,custom=!aspirationCategories.includes(a.category as typeof aspirationCategories[number]);
 const reading=a.connection?.kind==='reading-challenge';
 const problem=!a.title.trim()?'Give it a name.':a.progressKind==='numeric'&&!(a.target&&a.target>0)?'Set a target number.'
  :a.progressKind==='connected'&&!a.connection?'Choose what to count.':a.progressKind==='connected'&&!reading&&!(a.target&&a.target>0)?'Set a target for the count.'
  :a.targetDate&&a.targetDate<a.startDate?'The target date is before the start.':'';
 function submit(){if(problem)return;const lines=milestoneText.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,30);
  onSave({...a,target:reading||a.progressKind==='milestones'||a.progressKind==='binary'||a.progressKind==='manual'?null:a.target,
   milestones:[...a.milestones,...lines.map(title=>({id:crypto.randomUUID(),title}))]});}
 return <MuseModal id="aspiration-editor" label={isNew?'New aspiration':'Edit aspiration'} title={isNew?'A new aspiration':'Edit aspiration'} returnFocus={null} onClose={onClose} size="tall">
  <form className="muse-aspiration-form" onSubmit={e=>{e.preventDefault();submit();}}>
   <label>What are you working toward?<input id="aspiration-title" required maxLength={120} value={a.title} placeholder="Learn to sew a skirt" autoFocus onChange={e=>set({title:e.target.value})}/></label>
   <fieldset><legend>When</legend><div className="muse-aspiration-segments">{(Object.keys(timeframeLabels) as Timeframe[]).filter(t=>t!=='custom').map(t=>
    <label key={t}><input type="radio" name="aspiration-timeframe" checked={a.timeframe===t} onChange={()=>{const d=timeframeDates(t,today);set({timeframe:t,targetDate:d.target});}}/><span>{timeframeLabels[t]}</span></label>)}</div></fieldset>
   <fieldset><legend>How will you know you’re getting there?</legend><div className="muse-aspiration-kinds">{(Object.keys(progressKindLabels) as ProgressKind[]).map(k=>
    <label key={k}><input type="radio" name="aspiration-kind" checked={a.progressKind===k} onChange={()=>set({progressKind:k,...(k!=='connected'?{connection:null}:{})})}/><span><strong>{progressKindLabels[k].label}</strong><small>{progressKindLabels[k].detail}</small></span></label>)}</div></fieldset>
   {a.progressKind==='numeric'&&<div className="muse-aspiration-row"><label>Target<input id="aspiration-target" type="number" min={0} step="any" value={a.target??''} onChange={e=>set({target:e.target.value?Number(e.target.value):null})}/></label><label>Unit<input id="aspiration-unit" maxLength={24} value={a.unit??''} placeholder="dollars, projects…" onChange={e=>set({unit:e.target.value})}/></label></div>}
   {a.progressKind==='connected'&&<><label>Count from<select id="aspiration-connection" value={connectionId(a.connection)} onChange={e=>{const c=connectable.find(x=>x.id===e.target.value);set({connection:c?c.connection((a.targetDate??today).slice(0,4)):null});}}>
     <option value="">Choose…</option>{connectable.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    {reading?<p className="small-label">Progress and the target come from your {a.connection?.kind==='reading-challenge'?a.connection.year:''} Reading Challenge, so editing it in Bookshelf updates it here too.</p>
     :a.connection&&<div className="muse-aspiration-row"><label>Target<input id="aspiration-target" type="number" min={0} step="any" value={a.target??''} onChange={e=>set({target:e.target.value?Number(e.target.value):null})}/></label><p className="small-label">Counted automatically from your start date{a.targetDate?' to your target date':''}. Nothing is copied.</p></div>}</>}
   {a.progressKind==='milestones'&&isNew&&<label>First milestones <small className="small-label">· one per line, optional</small><textarea id="aspiration-milestones" rows={3} value={milestoneText} placeholder={'Pick a pattern\nCut the fabric\nSew the waistband'} onChange={e=>setMilestoneText(e.target.value)}/></label>}
   <button type="button" className="text-button" aria-expanded={more} onClick={()=>setMore(!more)}>{more?'Fewer options':'More options'}</button>
   {more&&<div className="muse-aspiration-more">
    <div className="muse-aspiration-row"><label>Category<select id="aspiration-category" value={custom?'__custom':a.category} onChange={e=>set({category:e.target.value==='__custom'?'':e.target.value})}>{aspirationCategories.map(c=><option key={c}>{c}</option>)}<option value="__custom">Your own…</option></select></label>
     {custom&&<label>Your category<input id="aspiration-category-custom" maxLength={40} value={a.category} onChange={e=>set({category:e.target.value})}/></label>}
     <label>Emoji<input id="aspiration-icon" maxLength={8} value={a.icon??''} placeholder="🧵" onChange={e=>set({icon:e.target.value})}/></label></div>
    <label>Why this matters <small className="small-label">· optional</small><textarea id="aspiration-motivation" rows={2} maxLength={1000} value={a.motivation??''} onChange={e=>set({motivation:e.target.value})}/></label>
    <label>Notes <small className="small-label">· optional</small><textarea id="aspiration-description" rows={2} maxLength={2000} value={a.description??''} onChange={e=>set({description:e.target.value})}/></label>
    <div className="muse-aspiration-row"><label>Starts<input id="aspiration-start" type="date" value={a.startDate} onChange={e=>set({startDate:e.target.value})}/></label>
     <label>Target date<input id="aspiration-target-date" type="date" value={a.targetDate??''} onChange={e=>set({targetDate:e.target.value||null,timeframe:e.target.value?'custom':'someday'})}/></label>
     <label>Status<select id="aspiration-status" value={a.status==='completed'||a.status==='archived'?a.status:a.status} disabled={a.status==='completed'||a.status==='archived'} onChange={e=>set({status:e.target.value as Aspiration['status']})}><option value="planned">Planned</option><option value="active">Active</option><option value="paused">Paused</option>{(a.status==='completed'||a.status==='archived')&&<option value={a.status}>{a.status==='completed'?'Completed':'Archived'}</option>}</select></label></div>
    <fieldset><legend>Accent</legend><div className="muse-aspiration-accents">{(['primary','secondary','pop','warm','info'] as const).map(c=><label key={c} data-accent={c}><input type="radio" name="aspiration-accent" checked={(a.accent??'primary')===c} onChange={()=>set({accent:c})}/><span className="sr-only">{c}</span></label>)}</div></fieldset>
   </div>}
   {(problem&&a.title)||error?<p role="alert" className="muse-aspiration-error">{error||problem}</p>:null}
   <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy||!!problem}>{isNew?'Add aspiration':'Save'}</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
  </form>
 </MuseModal>;
}
