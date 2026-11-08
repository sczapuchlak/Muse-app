'use client';
import {useState} from 'react';
import Link from 'next/link';
import {entryFor,ritualOpportunity,ritualCell,flexible,weeklyDays,type RitualDefinition} from '@/lib/rituals';
import {EmojiGlyph} from '../EmojiPicker';
import {accentStyle} from '@/lib/appearance-values';
import {useDailyData} from '../daily/DailyData';
import {useMuseToday} from '../useMuseToday';
import {MuseCard} from '../MuseCard';
import {CardHeading} from '../CardHeading';
import {MuseIcon} from '../MuseIcon';
import {RitualWeekCell} from './RitualWeekCell';
import {RitualEntryEditor} from './RitualEntryEditor';
import {useRituals,RitualSaveStatus} from './RitualStore';
import {useRitualView} from './ConnectedRituals';
import './Rituals.css';
import './LittleRituals.css';
/** A dated view of the same Rituals owner and completion control; no dashboard logs. */
export function LittleRituals({date}:{date:string}){
 const {status}=useRituals(),{state}=useRitualView(),{profile}=useDailyData(),today=useMuseToday(profile.timeZone);
 const [editor,setEditor]=useState<{ritual:RitualDefinition;date:string;anchor:HTMLElement;apply:(value:number|null)=>void}|null>(null);
 const groups=state.groups.map(group=>({group,rituals:state.rituals.filter(ritual=>ritual.groupId===group.id&&ritualOpportunity(state,ritual,date))})).filter(item=>item.rituals.length);
 const scheduled=groups.flatMap(item=>item.rituals),completed=scheduled.filter(ritual=>ritualCell(state,ritual,date,today).status==='complete').length,weekly=scheduled.filter(ritual=>ritual.type==='weekly-target'||flexible(ritual)).length;
 return <MuseCard id="little-rituals" className="muse-little-rituals"><CardHeading id="little-rituals" title="Little Rituals"><span className="small-label">{status.loaded?`${completed} of ${scheduled.length-weekly}${weekly?` daily · ${weekly} weekly`:''}`:'Loading…'}</span></CardHeading>
 <div className="muse-little-list" tabIndex={0} role="region" aria-label="Scheduled rituals" aria-busy={!status.loaded}>
 {!status.loaded?<p className="card-description">Loading your rituals…</p>:!scheduled.length?<p className="card-description">A little room today. {state.rituals.length?'No rituals scheduled.':'Your rituals will appear here.'}</p>:groups.map(({group,rituals})=><section className="muse-little-group" key={group.id} style={accentStyle(group.accent)}><h3><span className="muse-little-group-icon" aria-hidden="true"><MuseIcon name={group.icon} size={14}/></span>{group.name}</h3>{rituals.map(ritual=><div className="muse-little-row" key={ritual.id}><span>{ritual.emoji&&<span className="muse-little-emoji" aria-hidden="true"><EmojiGlyph value={ritual.emoji}/></span>}{ritual.name}{ritual.type==='weekly-target'&&<small className="small-label">Weekly goal · {ritual.goal} {ritual.unit}</small>}{flexible(ritual)&&<small className="small-label">{weeklyDays(state,ritual,date)} of {ritual.timesPerWeek} this week</small>}</span><RitualWeekCell ritual={ritual} date={date} today={today} selected onEditEntry={(ritual,date,anchor,apply)=>setEditor({ritual,date,anchor,apply})}/></div>)}</section>)}
 </div><footer><Link className="muse-little-view" href={`/rituals?date=${date}`}>View Rituals<MuseIcon name="chevron" size={12}/></Link>{(status.error||status.pending)&&<RitualSaveStatus/>}</footer>
 {editor&&<RitualEntryEditor key={`${editor.ritual.id}/${editor.date}`} ritual={editor.ritual} date={editor.date} current={entryFor(state,editor.ritual.id,editor.date)?.value??null} returnFocus={editor.anchor} onApply={editor.apply} onClose={()=>setEditor(null)}/>}
 </MuseCard>;
}
