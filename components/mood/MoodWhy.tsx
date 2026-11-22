'use client';
import {useState} from 'react';
import {useMood} from './useMood';
import {ReflectionEditor} from './ReflectionEditor';

const list=(items:string[])=>items.length<=1?items.join(''):`${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
const more:Record<'morning'|'evening',string[]>={
 morning:['What would you like to carry into today?','What gave you energy this morning?','What feels heavier than expected?'],
 evening:['What stayed with you today?','What gave you energy?','What felt heavier than expected?','What would you like to carry into tomorrow?'],
};

/**
 * The reason behind a check-in: written under the feelings and what's shaping them, saved on the same Morning or
 * Evening check-in (the record's reflection). The prompt asks about the feelings chosen, so feeling, influences and
 * reflection read as one moment. "Another prompt" offers the general questions instead.
 */
export function MoodWhy({date,feelings}:{date:string;feelings:string[]}){
 const {record,period,state}=useMood(date),[turn,setTurn]=useState(0);
 const shaping=record.causeTagIds.flatMap(id=>state.influences.find(tag=>tag.id===id)?.name??[]);
 const when=period==='morning'?'this morning':'tonight';
 const options=[...(feelings.length?[`What’s behind feeling ${list(feelings)} ${when}?`]:[]),...more[period]];
 const prompt=options[turn%options.length];
 return <div className="muse-mood-why">
  <div className="muse-mood-label-row"><p className="editor-label">Why?</p><button type="button" className="text-button muse-mood-why-another" onClick={()=>setTurn(value=>value+1)}>Another prompt</button></div>
  {shaping.length>0&&<p className="small-label muse-mood-why-context">Shaped by {list(shaping)}</p>}
  <ReflectionEditor date={date} prompt={prompt} id={`mood-why-${period}`}/>
 </div>;
}
