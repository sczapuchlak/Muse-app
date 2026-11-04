"use client";
import {useEffect,useRef,useState} from 'react';
import {useMuseDate} from './MuseSession';
import {useDailyDay,DailyCapture} from './daily/DailyData';
import {EmojiGlyph,EmojiPicker} from './EmojiPicker';
import {MuseIcon} from './MuseIcon';
import {MuseCard} from './MuseCard';
import {CardHeading} from './CardHeading';
/** One confirmed ordered list per selected local date. Picker edits remain an isolated draft. */
export function DayInThree({showHeading=true}:{showHeading?:boolean}){
 const [date]=useMuseDate('');
 const {day,patch}=useDailyDay(date),values=day.record?.day_in_three??[],setValues=(next:string[]|((values:string[])=>string[]))=>patch({day_in_three:typeof next==='function'?next(values):next});
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<string[]>([]),[initialIndex,setInitialIndex]=useState<number|undefined>(),anchor=useRef<HTMLButtonElement>(null),editRef=useRef<HTMLButtonElement>(null),focusFrame=useRef<number|null>(null);
 useEffect(()=>()=>{if(focusFrame.current!==null)cancelAnimationFrame(focusFrame.current);},[]);
 function edit(button:HTMLButtonElement,index?:number){if(focusFrame.current!==null)cancelAnimationFrame(focusFrame.current);anchor.current=button;setDraft([...values]);setInitialIndex(index);setOpen(true);}
 function close(){setOpen(false);if(focusFrame.current!==null)cancelAnimationFrame(focusFrame.current);focusFrame.current=requestAnimationFrame(()=>{focusFrame.current=null;if(anchor.current?.isConnected)anchor.current.focus();else editRef.current?.focus();});}
 return <DailyCapture date={date}><section className="muse-day-three" aria-label="Day in Three">{showHeading&&<h3>Day in Three</h3>}<p className="small-label">Three emojis to sum up your day.</p><ul className="muse-day-three-list">{values.map((emoji,index)=><li className="muse-day-three-item" key={index}><button className="muse-emoji-trigger muse-edge" type="button" aria-label={`Edit Day in Three emoji ${index+1}: ${emoji}`} aria-haspopup="dialog" onClick={event=>edit(event.currentTarget,index)}><EmojiGlyph value={emoji}/></button><button className="muse-emoji-clear text-button" type="button" title="Remove emoji" aria-label={`Remove Day in Three emoji ${index+1}`} onClick={()=>setValues(current=>current.filter((_,i)=>i!==index))}><MuseIcon name="close" size={12}/></button></li>)}<li><button ref={editRef} className="choice-button add-control" type="button" aria-label="Edit Day in Three" aria-expanded={open} aria-haspopup="dialog" onClick={event=>edit(event.currentTarget)}><MuseIcon name={values.length?'edit':'plus'} size={14}/>{values.length?'Edit':'Add emojis'}</button></li></ul><EmojiPicker mode="multiple" open={open} anchorRef={anchor} label="Day in Three" values={draft} initialIndex={initialIndex} onChange={setDraft} onClose={close} onConfirm={()=>{setValues([...draft]);close();}}/></section></DailyCapture>;
}
export function DayInThreeCard(){return <MuseCard id="day-in-three" className="day-in-three-card"><CardHeading id="day-in-three" title="Day in Three" icon="mood"/><DayInThree showHeading={false}/></MuseCard>;}
