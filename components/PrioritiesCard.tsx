"use client";

import {useState} from "react";
import {useMuseDate} from "./MuseSession";
import {useDailyDay,DailyCapture} from "./daily/DailyData";
import type {PriorityInput} from "@/lib/data/daily";
import {dailyTextDisplay} from "@/lib/data/daily-projections";
import type { Priority } from "@/lib/daily-edit-data";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";
import { EditableText } from "./EditableText";
import { useMuseSpark } from "./MuseSpark";

import {EmojiButton} from "./EmojiPicker";
import {MuseMilestone} from "./MuseMilestone";



function PriorityItem({ priority, index, onToggle, onEdit,children }: { children?:React.ReactNode; priority: Priority; index: number; onToggle: () => void; onEdit: (title: string) => void }) {
  const { trigger, spark } = useMuseSpark();
  return <li><div className={`priority-item${priority.complete ? " is-complete" : ""}`}>
    <label className="priority-completion">
      <input type="checkbox" className="check-input" checked={priority.complete} aria-label={`Complete priority: ${priority.title}`}
        onChange={(event) => { if (event.target.checked) trigger(); onToggle(); }} />
      <span className="priority-check" aria-hidden="true">{priority.complete && <MuseIcon name="check" size={15} />}{spark}</span>
    </label>
    <EditableText value={priority.title} label="Edit priority" className="priority-text" onSave={onEdit} />
    <span className="priority-number" aria-hidden="true">0{index + 1}</span>{children}
  </div></li>;
}

export function PrioritiesCard() {
  const [date]=useMuseDate(''),{day,store,patch,status}=useDailyDay(date),[title,setTitle]=useState('');
  const priorities=day.priorities.map(item=>({id:item.id,title:item.text,complete:item.standalone_complete}));
  const intention=day.record?.intention_text??'',intentionEmoji=day.record?.intention_emoji??null;
  const setPriorities=(update:(items:Priority[])=>Priority[])=>{const items:PriorityInput[]=update(priorities).map(item=>({id:item.id,text:item.title,complete:item.complete}));store?.edit(date,{kind:'priorities',items});};
  const completed = priorities.filter((priority) => priority.complete).length;
  return (
    <MuseCard id="priorities" className="card-full priorities-card">
      <DailyCapture date={date}><MuseMilestone achieved={priorities.length===3&&completed===3} kind="shooting"/>
      <CardHeading id="priorities" title="Today’s priorities">
        <span className="priority-count" role="status" aria-label={`${completed} of ${priorities.length} priorities complete`}><strong>{completed}</strong> / {priorities.length}<span className="count-label">complete</span></span>
      </CardHeading>
      <div className="daily-intention"><span className="editor-label">Today’s intention</span><EmojiButton value={intentionEmoji} label="Intention emoji" onChange={value=>patch({intention_emoji:value})}/><IntentionInput key={`${date}/${status?.discarded??0}`} value={intention} onChange={value=>patch({intention_text:value||null})}/></div>
      <ul className="priority-list">
        {priorities.map((priority, index) => <PriorityItem key={priority.id} priority={priority} index={index}
          onToggle={() => setPriorities((items) => items.map((item) => item.id === priority.id ? { ...item, complete: !item.complete } : item))}
          onEdit={(title) => setPriorities((items) => items.map((item) => item.id === priority.id ? { ...item, title } : item))} >
          <span className="priority-actions"><button type="button" className="text-button" aria-label={`Move priority ${index+1} earlier`} disabled={index===0} onClick={()=>setPriorities(items=>{const next=[...items];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})}>↑</button><button type="button" className="text-button" aria-label={`Move priority ${index+1} later`} disabled={index===priorities.length-1} onClick={()=>setPriorities(items=>{const next=[...items];[next[index+1],next[index]]=[next[index],next[index+1]];return next;})}>↓</button><button type="button" className="text-button" aria-label={`Remove priority: ${priority.title}`} onClick={()=>setPriorities(items=>items.filter(item=>item.id!==priority.id))}><MuseIcon name="close" size={14}/></button></span>
        </PriorityItem>)}
      </ul>
      {!priorities.length && <p className="card-description">No priorities for this day.</p>}
      {priorities.length<3&&<form className="priority-add" onSubmit={event=>{event.preventDefault();if(!title.trim())return;setPriorities(items=>[...items,{id:crypto.randomUUID(),title:title.trim(),complete:false}]);setTitle('');}}><input aria-label="New priority" placeholder="Add a priority…" maxLength={160} value={title} onChange={event=>setTitle(event.target.value)}/><button className="muse-button" type="submit" disabled={!title.trim()}>Add priority</button></form>}
    </DailyCapture></MuseCard>
  );
}

/** Keep typing (including trailing spaces) stable while the server normalizes saved text. */
function IntentionInput({value,onChange}:{value:string;onChange:(value:string)=>void}){const [draft,setDraft]=useState<string|null>(null);return <input aria-label="Today’s intention" type="text" value={dailyTextDisplay(value,draft)} maxLength={1000} onBlur={()=>setDraft(null)} onChange={event=>{setDraft(event.target.value);onChange(event.target.value);}} placeholder="What matters today?"/>;}
