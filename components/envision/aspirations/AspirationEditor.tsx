'use client';
import {useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {aspirationCategories,progressKindLabels,timeframeLabels,type Aspiration,type AspirationConnection,type PlanningStyle,type ProgressKind,type Timeframe} from '@/lib/aspirations/models';
import {timeframeDates} from '@/lib/aspirations/progress';
import {metricInfo,type ProgressMetric} from '@/lib/progress/engine';
import type {LifeArea} from '@/lib/reflections/model';

const connectable:{id:string;label:string;connection:(year:string)=>AspirationConnection}[]=[
 {id:'reading-challenge',label:'My Reading Challenge (Bookshelf)',connection:year=>({kind:'reading-challenge',year})},
 ...(['books-finished','reading-minutes','reading-pages','tasks-completed','workouts','workout-minutes','water'] as ProgressMetric[]).map(metric=>({id:metric,label:`${metricInfo[metric].label} (${metricInfo[metric].owner})`,connection:():AspirationConnection=>({kind:'metric',metric})})),
];
const connectionId=(c:AspirationConnection|null)=>c?.kind==='reading-challenge'?'reading-challenge':c?.kind==='metric'?c.metric:'';

export function blankAspiration(today:string):Aspiration{
 return {id:crypto.randomUUID(),title:'',description:null,motivation:null,category:'Personal',icon:null,accent:null,startDate:today,targetDate:null,timeframe:'none',status:'active',
  progressKind:'milestones',target:null,unit:null,connection:null,milestones:[],ritualIds:[],taskIds:[],reflection:null,completedOn:null,celebrated:[],position:Date.now()%1000000,renewedFrom:null,revision:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}

/**
 * Create or edit an aspiration. Only a title is required; the rest is progressive. A Reading Challenge connection
 * stores no target here: the challenge itself (in Bookshelf) stays the one authority.
 */
export function AspirationEditor({initial,today,busy,error,onSave,onClose,areas=[],primaryArea=null,onPrimaryAreaChange}:{initial:Aspiration;today:string;busy:boolean;error:string;onSave:(a:Aspiration)=>void;onClose:()=>void;areas?:LifeArea[];primaryArea?:string|null;onPrimaryAreaChange?:(id:string|null)=>void}){
 const [a,setA]=useState<Aspiration>(initial),[more,setMore]=useState(initial.revision>0),[milestoneText,setMilestoneText]=useState('');
 const [targetYear,setTargetYear]=useState(initial.targetPeriod?.length===4?initial.targetPeriod:'');
 const [fromYear,setFromYear]=useState(initial.targetPeriod?.includes('/')?initial.targetPeriod.slice(0,4):''),[toYear,setToYear]=useState(initial.targetPeriod?.includes('/')?initial.targetPeriod.slice(5):'');
 const set=(patch:Partial<Aspiration>)=>setA(x=>({...x,...patch}));
 const isNew=initial.revision===0,custom=!aspirationCategories.includes(a.category as typeof aspirationCategories[number]);
 const reading=a.connection?.kind==='reading-challenge';
 const problem=!a.title.trim()?'Give it a name.':targetYear&&!/^(?!0000)\d{4}$/.test(targetYear)?'Enter a four-digit target year.':(fromYear||toYear)&&(!/^(?!0000)\d{4}$/.test(fromYear)||!/^(?!0000)\d{4}$/.test(toYear)||fromYear>toYear)?'Enter a valid range of years.':a.progressKind==='numeric'&&!(a.target&&a.target>0)?'Set a target number.'
  :a.progressKind==='connected'&&!a.connection?'Choose what to count.':a.progressKind==='connected'&&!reading&&!(a.target&&a.target>0)?'Set a target for the count.'
  :a.targetDate&&a.targetDate<a.startDate?'The target date is before the start.':'';
 function submit(){if(problem)return;const lines=milestoneText.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,30);
  onSave({...a,target:reading||a.progressKind==='milestones'||a.progressKind==='binary'||a.progressKind==='manual'?null:a.target,
   milestones:[...a.milestones,...lines.map(title=>({id:crypto.randomUUID(),title}))]});}
 return <MuseModal id="aspiration-editor" label={isNew?'New aspiration':'Edit aspiration'} title={isNew?'A new aspiration':'Edit aspiration'} returnFocus={null} onClose={onClose} size="tall">
  <form className="muse-aspiration-form" onSubmit={e=>{e.preventDefault();submit();}}>
   <label>What are you working toward?<input id="aspiration-title" required maxLength={120} value={a.title} placeholder="Learn to sew a skirt" autoFocus onChange={e=>set({title:e.target.value})}/></label>
   {isNew&&<div className="muse-aspiration-choice"><span>Life area</span><MuseChoiceMenu label="Life area" valueLabel={areas.find(area=>area.id===primaryArea)?.label??'Choose later'} selectedIds={[primaryArea??'']} options={[{id:'',label:'Choose later'},...areas.filter(area=>!area.archived).map(area=>({id:area.id,label:area.label}))]} onSelect={id=>onPrimaryAreaChange?.(id||null)}/></div>}
   <button type="button" className="text-button" aria-expanded={more} onClick={()=>setMore(!more)}>{more?'Fewer options':'Add details (optional)'}</button>
   {more&&<><fieldset><legend>When</legend><div className="muse-aspiration-segments">{(Object.keys(timeframeLabels) as Timeframe[]).filter(t=>t!=='custom').map(t=>
    <label key={t}><input type="radio" name="aspiration-timeframe" checked={a.timeframe===t} onChange={()=>{const d=timeframeDates(t,today);setTargetYear('');setFromYear('');setToYear('');set({timeframe:t,targetDate:d.target,targetPeriod:null});}}/><span>{timeframeLabels[t]}</span></label>)}</div></fieldset>
   <fieldset><legend>How will you know you’re getting there?</legend><div className="muse-aspiration-kinds">{(Object.keys(progressKindLabels) as ProgressKind[]).map(k=>
    <label key={k}><input type="radio" name="aspiration-kind" checked={a.progressKind===k} onChange={()=>set({progressKind:k,...(k!=='connected'?{connection:null}:{})})}/><span><strong>{progressKindLabels[k].label}</strong><small>{progressKindLabels[k].detail}</small></span></label>)}</div></fieldset>
   {a.progressKind==='numeric'&&<div className="muse-aspiration-row"><label>Target<input id="aspiration-target" type="number" min={0} step="any" value={a.target??''} onChange={e=>set({target:e.target.value?Number(e.target.value):null})}/></label><label>Unit<input id="aspiration-unit" maxLength={24} value={a.unit??''} placeholder="dollars, projects…" onChange={e=>set({unit:e.target.value})}/></label></div>}
   {a.progressKind==='connected'&&<><div className="muse-aspiration-choice"><span>Count from</span><MuseChoiceMenu label="Count from" valueLabel={connectable.find(c=>c.id===connectionId(a.connection))?.label??'Choose…'} selectedIds={[connectionId(a.connection)]} options={connectable.map(c=>({id:c.id,label:c.label}))} emptyLabel="Nothing to count from yet." onSelect={id=>{const c=connectable.find(x=>x.id===id);set({connection:c?c.connection((a.targetDate??today).slice(0,4)):null});}}/></div>
    {reading?<p className="small-label">Progress and the target come from your {a.connection?.kind==='reading-challenge'?a.connection.year:''} Reading Challenge, so editing it in Bookshelf updates it here too.</p>
     :a.connection&&<div className="muse-aspiration-row"><label>Target<input id="aspiration-target" type="number" min={0} step="any" value={a.target??''} onChange={e=>set({target:e.target.value?Number(e.target.value):null})}/></label><p className="small-label">Counted automatically from your start date{a.targetDate?' to your target date':''}. Nothing is copied.</p></div>}</>}
   {a.progressKind==='milestones'&&isNew&&<label>First milestones <small className="small-label">· one per line, optional</small><textarea id="aspiration-milestones" rows={3} value={milestoneText} placeholder={'Pick a pattern\nCut the fabric\nSew the waistband'} onChange={e=>setMilestoneText(e.target.value)}/></label>}
   <div className="muse-aspiration-more">
    <div className="muse-aspiration-choice"><span>Planning style</span><MuseChoiceMenu label="Planning style" valueLabel={a.planningStyle?{achievement:'Achievement',target:'Measurable target',practice:'Ongoing practice',exploration:'Exploration'}[a.planningStyle]:'Choose later'} selectedIds={[a.planningStyle??'']} options={[{id:'',label:'Choose later'},{id:'achievement',label:'Achievement'},{id:'target',label:'Measurable target'},{id:'practice',label:'Ongoing practice'},{id:'exploration',label:'Exploration'}]} onSelect={id=>set({planningStyle:(id||null) as PlanningStyle|null})}/></div>
    <div className="muse-aspiration-row"><div className="muse-aspiration-choice"><span>Legacy category</span><MuseChoiceMenu label="Category" valueLabel={custom?'Your own…':a.category} selectedIds={[custom?'__custom':a.category]} options={[...aspirationCategories.map(c=>({id:c,label:c})),{id:'__custom',label:'Your own…'}]} onSelect={id=>set({category:id==='__custom'?'':id})}/></div>
     {custom&&<label>Your category<input id="aspiration-category-custom" maxLength={40} value={a.category} onChange={e=>set({category:e.target.value})}/></label>}
     <label>Emoji<input id="aspiration-icon" maxLength={8} value={a.icon??''} placeholder="🧵" onChange={e=>set({icon:e.target.value})}/></label></div>
    <label>Why this matters <small className="small-label">· optional</small><textarea id="aspiration-motivation" rows={2} maxLength={1000} value={a.motivation??''} onChange={e=>set({motivation:e.target.value})}/></label>
    <label>Personal mantra <small className="small-label">· optional</small><input maxLength={500} value={a.mantra??''} onChange={e=>set({mantra:e.target.value})}/></label>
    <label>Notes <small className="small-label">· optional</small><textarea id="aspiration-description" rows={2} maxLength={2000} value={a.description??''} onChange={e=>set({description:e.target.value})}/></label>
    <div className="muse-aspiration-row"><label>Starts<input id="aspiration-start" type="date" value={a.startDate} onChange={e=>set({startDate:e.target.value})}/></label>
     <label>Target date<input id="aspiration-target-date" type="date" value={a.targetDate??''} onChange={e=>{setTargetYear('');setFromYear('');setToYear('');set({targetDate:e.target.value||null,targetPeriod:null,timeframe:e.target.value?'custom':'none'});}}/></label>
     {a.status==='completed'||a.status==='archived'||a.status==='discontinued'?<div className="muse-aspiration-choice"><span>Status</span><p className="small-label">{a.status==='completed'?'Completed':a.status==='archived'?'Archived':'No longer pursuing'}</p></div>
      :<div className="muse-aspiration-choice"><span>Status</span><MuseChoiceMenu label="Status" valueLabel={{planned:'Planned',active:'Active',paused:'Paused'}[a.status as 'planned'|'active'|'paused']??a.status} selectedIds={[a.status]} options={[{id:'planned',label:'Planned'},{id:'active',label:'Active'},{id:'paused',label:'Paused'}]} onSelect={id=>set({status:id as Aspiration['status']})}/></div>}</div>
    <label>Target month <small className="small-label">· optional, instead of a date</small><input type="month" value={a.targetPeriod?.length===7?a.targetPeriod:''} onChange={e=>{setTargetYear('');setFromYear('');setToYear('');set({targetPeriod:e.target.value||null,targetDate:null,timeframe:'custom'});}}/></label>
    <label>Target year <small className="small-label">· optional, instead of a date or month</small><input type="text" inputMode="numeric" maxLength={4} placeholder="2028" value={targetYear} onChange={e=>{const value=e.target.value;setTargetYear(value);setFromYear('');setToYear('');set({targetPeriod:/^(?!0000)\d{4}$/.test(value)?value:null,targetDate:null,timeframe:'custom'});}}/></label>
    <div className="muse-aspiration-row"><label>From year<input type="text" inputMode="numeric" maxLength={4} value={fromYear} onChange={e=>{const value=e.target.value;setFromYear(value);setTargetYear('');set({targetDate:null,targetPeriod:/^(?!0000)\d{4}$/.test(value)&&/^(?!0000)\d{4}$/.test(toYear)&&value<=toYear?`${value}/${toYear}`:null,timeframe:'custom'});}}/></label><label>Through year<input type="text" inputMode="numeric" maxLength={4} value={toYear} onChange={e=>{const value=e.target.value;setToYear(value);setTargetYear('');set({targetDate:null,targetPeriod:/^(?!0000)\d{4}$/.test(fromYear)&&/^(?!0000)\d{4}$/.test(value)&&fromYear<=value?`${fromYear}/${value}`:null,timeframe:'custom'});}}/></label></div>
    <fieldset><legend>Accent</legend><div className="muse-aspiration-accents">{(['primary','secondary','pop','warm','info'] as const).map(c=><label key={c} data-accent={c}><input type="radio" name="aspiration-accent" checked={(a.accent??'primary')===c} onChange={()=>set({accent:c})}/><span className="sr-only">{c}</span></label>)}</div></fieldset>
   </div></>}
   {(problem&&a.title)||error?<p role="alert" className="muse-aspiration-error">{error||problem}</p>:null}
   <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy||!!problem}>{isNew?'Add aspiration':'Save'}</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
  </form>
 </MuseModal>;
}
