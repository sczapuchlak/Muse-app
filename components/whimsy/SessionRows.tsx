'use client';
import {useRef,useState,type ClipboardEvent} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import {blankRow,isBlankRow,parsePastedRows,type ParsedRow,type RowIssue,type SessionRow} from '@/lib/books/completion';
import './SessionRows.css';

/** A row with nothing but its suggested date: pasted rows replace it rather than leaving it half-filled. */
const untouched=(r:SessionRow)=>isBlankRow({...r,date:''});
const minutesText=(m:number)=>m<60?`${m} min`:`${Math.floor(m/60)} h${m%60?` ${m%60} min`:''}`;

/** Duplicate, move and remove for one row, tucked into a ⋯ menu (the same pattern as a sitting's menu). */
function RowMenu({index,count,onDuplicate,onMove,onRemove}:{index:number;count:number;onDuplicate:()=>void;onMove:(by:-1|1)=>void;onRemove:()=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[open,setOpen]=useState(false),act=(f:()=>void)=>()=>{setOpen(false);f();};
 return <span className="muse-session-rows-menu"><button ref={anchor} type="button" className="muse-icon-button" aria-label={`Session ${index+1}: more actions`} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><MuseIcon name="more" size={16}/></button>
  <GlassPopover id={`session-row-${index}`} label={`Session ${index+1}`} open={open} anchorRef={anchor} onClose={()=>setOpen(false)} width={200} align="end" bare><div className="muse-sitting-actions">
   <button type="button" className="popover-choice" onClick={act(onDuplicate)}><MuseIcon name="plus" size={15}/>Duplicate</button>
   <button type="button" className="popover-choice" disabled={index===0} onClick={act(()=>onMove(-1))}><span className="muse-session-rows-up" aria-hidden="true"><MuseIcon name="chevron" size={15}/></span>Move up</button>
   <button type="button" className="popover-choice" disabled={index===count-1} onClick={act(()=>onMove(1))}><MuseIcon name="chevron" size={15}/>Move down</button>
   <button type="button" className="popover-choice muse-sitting-delete" onClick={act(onRemove)}><MuseIcon name="trash" size={15}/>Remove</button>
  </div></GlassPopover></span>;
}

/**
 * Several reading sessions entered together (#historical-reading): a compact table on wide screens, stacked rows on a
 * phone. A blank starting page continues from the row above, so cumulative progress needs only the page reached.
 * Rows stay in the order shown; "Sort by date" is offered, never applied silently. Rows can be pasted from a
 * spreadsheet (date, starting page, ending page, minutes, note).
 */
export function SessionRows({rows,onChange,parsed,issues,showAll,touched,onTouch,today,totalPages,firstStart,accepted,onAccept}:{rows:SessionRow[];onChange:(rows:SessionRow[])=>void;parsed:readonly ParsedRow[];issues:readonly RowIssue[];showAll:boolean;touched:ReadonlySet<string>;onTouch:(key:string)=>void;today:string;totalPages?:number;firstStart:number;accepted:boolean;onAccept:(v:boolean)=>void}){
 const [pasting,setPasting]=useState(false),[pasteText,setPasteText]=useState(''),[pasteNote,setPasteNote]=useState(''),list=useRef<HTMLOListElement>(null);
 const visible=(key:string)=>showAll||touched.has(key);
 const issueFor=(key:string,field:RowIssue['field'])=>visible(key)?issues.find(i=>i.key===key&&i.field===field&&i.level==='error'):undefined;
 const rowNotes=(key:string)=>issues.filter(i=>i.key===key&&(i.field==='row'||i.level==='confirm')&&(visible(key)||i.level==='confirm'));
 const set=(key:string,patch:Partial<SessionRow>)=>onChange(rows.map(r=>r.key===key?{...r,...patch}:r));
 const startFor=(index:number)=>{const above=parsed.filter(p=>rows.findIndex(r=>r.key===p.key)<index).at(-1);return above?.endingPage??firstStart;};
 const focusRow=(key:string)=>requestAnimationFrame(()=>list.current?.querySelector<HTMLInputElement>(`[data-row="${key}"] input`)?.focus());
 function add(){const last=rows.at(-1),row=blankRow(undefined,last?.date||'');onChange([...rows,row]);focusRow(row.key);}
 function insertPasted(text:string,at?:string){
  const {rows:found,skipped}=parsePastedRows(text);
  if(!found.length){setPasteNote(skipped.length?'Muse couldn’t read a date and page on those lines. Use date, starting page, ending page, minutes.':'Nothing to add.');return false;}
  // Pasting into an empty row replaces it; into a filled row adds after it; from the paste box, after the last filled row.
  let next:SessionRow[];
  const i=at?rows.findIndex(r=>r.key===at):-1;
  if(i>=0)next=[...rows.slice(0,untouched(rows[i])?i:i+1),...found,...rows.slice(i+1)];
  else next=[...rows.filter(r=>!untouched(r)),...found];
  onChange(next);
  setPasteNote(`Added ${found.length} ${found.length===1?'session':'sessions'}${skipped.length?`; skipped ${skipped.length} unreadable ${skipped.length===1?'line':'lines'}`:''}. Check them below.`);return true;
 }
 function pasteIntoRow(event:ClipboardEvent<HTMLInputElement>,key:string){const text=event.clipboardData.getData('text');if(!/[\t\n]/.test(text.trim()))return;event.preventDefault();insertPasted(text,key);}
 const ordered=[...parsed].every((p,i,all)=>!i||all[i-1].date<=p.date);
 const totals=parsed.reduce((t,p)=>({pages:t.pages+p.pages,minutes:t.minutes+p.minutes}),{pages:0,minutes:0});
 const confirms=issues.filter(i=>i.level==='confirm');
 return <div className="muse-session-rows">
  <div className="muse-session-rows-head" aria-hidden="true"><span>Date</span><span>From page</span><span>To page</span><span>Minutes</span><span>Note</span><span/></div>
  <ol ref={list} className="muse-session-rows-list" aria-label="Reading sessions">{rows.map((row,index)=>{
   const err=(f:RowIssue['field'])=>issueFor(row.key,f),id=(f:string)=>`session-${row.key}-${f}`,notes=rowNotes(row.key),inherited=startFor(index);
   const field=(f:'date'|'startPage'|'endPage'|'minutes')=>({'aria-invalid':err(f)?true:undefined,'aria-describedby':err(f)?id(f):undefined});
   return <li key={row.key} data-row={row.key} data-invalid={notes.some(n=>n.level==='error')||['date','startPage','endPage','minutes'].some(f=>err(f as RowIssue['field']))||undefined} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))onTouch(row.key);}}>
    <span className="muse-session-rows-number" aria-hidden="true">{index+1}</span>
    <label className="muse-session-rows-date"><span>Date</span><input type="date" max={today} value={row.date} onPaste={e=>pasteIntoRow(e,row.key)} onChange={e=>set(row.key,{date:e.target.value})} {...field('date')}/>{err('date')&&<small id={id('date')} role="alert">{err('date')!.message}</small>}</label>
    <label><span>From page</span><input inputMode="numeric" pattern="[0-9]*" placeholder={String(inherited)} value={row.startPage} onPaste={e=>pasteIntoRow(e,row.key)} onChange={e=>set(row.key,{startPage:e.target.value})} {...field('startPage')} aria-label={`Session ${index+1} starting page${row.startPage?'':`, continues from page ${inherited}`}`}/>{err('startPage')&&<small id={id('startPage')} role="alert">{err('startPage')!.message}</small>}</label>
    <label><span>To page</span><input inputMode="numeric" pattern="[0-9]*" placeholder={totalPages?`of ${totalPages}`:''} value={row.endPage} onPaste={e=>pasteIntoRow(e,row.key)} onChange={e=>set(row.key,{endPage:e.target.value})} {...field('endPage')} aria-label={`Session ${index+1} ending page`}/>{err('endPage')&&<small id={id('endPage')} role="alert">{err('endPage')!.message}</small>}</label>
    <label><span>Minutes</span><input inputMode="numeric" pattern="[0-9]*" placeholder="—" value={row.minutes} onChange={e=>set(row.key,{minutes:e.target.value})} {...field('minutes')} aria-label={`Session ${index+1} minutes read, optional`}/>{err('minutes')&&<small id={id('minutes')} role="alert">{err('minutes')!.message}</small>}</label>
    <label className="muse-session-rows-note"><span>Note</span><input value={row.notes} maxLength={2000} placeholder="Optional" onChange={e=>set(row.key,{notes:e.target.value})} aria-label={`Session ${index+1} note, optional`}/></label>
    <RowMenu index={index} count={rows.length} onDuplicate={()=>{const copy={...row,key:crypto.randomUUID()};onChange([...rows.slice(0,index+1),copy,...rows.slice(index+1)]);focusRow(copy.key);}} onMove={by=>{const next=[...rows];[next[index],next[index+by]]=[next[index+by],next[index]];onChange(next);}} onRemove={()=>onChange(rows.length===1?[blankRow()]:rows.filter(r=>r.key!==row.key))}/>
    {notes.length>0&&<div className="muse-session-rows-issues">{notes.map(n=><p key={n.message} data-level={n.level} role={n.level==='error'?'alert':undefined}><MuseIcon name={n.level==='error'?'close':'sparkle'} size={12}/>{n.message}</p>)}</div>}
   </li>;})}</ol>
  <div className="muse-session-rows-tools">
   <button type="button" className="muse-button button-ghost" onClick={add}><MuseIcon name="plus" size={15}/>Add session</button>
   <button type="button" className="muse-button button-ghost" aria-expanded={pasting} onClick={()=>{setPasting(v=>!v);setPasteNote('');}}><MuseIcon name="notes" size={15}/>Paste rows</button>
   {!ordered&&<button type="button" className="text-button" onClick={()=>{const at=new Map(parsed.map(p=>[p.key,p.date]));onChange([...rows].sort((a,b)=>(at.get(a.key)??a.date??'').localeCompare(at.get(b.key)??b.date??'')));}}>Sort by date</button>}
   {parsed.length>0&&<span className="small-label muse-session-rows-total" role="status">{parsed.length} {parsed.length===1?'session':'sessions'} · {totals.pages} pages{totals.minutes?` · ${minutesText(totals.minutes)}`:' · no time recorded'}</span>}
  </div>
  {pasting&&<div className="muse-session-rows-paste">
   <label><span className="muse-whimsy-inline-label">Paste from a spreadsheet or another app <small>one session per line</small></span><textarea rows={4} value={pasteText} placeholder={'2025-06-01\t0\t60\t45\nJune 2, 2025\t60\t145\t70\n6/4/2025, 250'} onChange={e=>setPasteText(e.target.value)}/></label>
   <p className="small-label">Date, starting page, ending page, minutes, note, separated by tabs or commas. A date with one number is the page you reached.</p>
   <div className="muse-books-actions"><button type="button" className="muse-button" onClick={()=>{if(insertPasted(pasteText)){setPasteText('');setPasting(false);}}}>Add these rows</button><button type="button" className="text-button" onClick={()=>setPasting(false)}>Cancel</button></div>
  </div>}
  {pasteNote&&<p className="small-label" role="status">{pasteNote}</p>}
  {confirms.length>0&&<label className="muse-session-rows-accept"><input type="checkbox" checked={accepted} onChange={e=>onAccept(e.target.checked)}/> Keep these sessions as entered, beside the ones already logged</label>}
 </div>;
}
