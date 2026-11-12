'use client';
/* eslint-disable @next/next/no-img-element -- private, short-lived signed URLs; next/image would proxy them. */
import {useEffect,useRef,useState,type CSSProperties,type KeyboardEvent,type ReactNode} from 'react';
import {MuseIcon} from '../../MuseIcon';
import {MuseOverflowMenu,type OverflowAction} from '../../MuseOverflowMenu';
import {dateLabel} from '@/lib/dates';
import {boardImageUrl} from '@/lib/data/constellation-images';
import {defaultFrame,photoFrame,type PhotoFrame} from '@/lib/bucket-list/models';
import type {BoardImage} from '@/lib/constellation-board';
import {statusLabels,type BucketEntry,type BucketList} from '@/lib/bucket-list/models';
import {shortYear,yearColor,yearOf,yearPattern,type TimelineYear} from '@/lib/bucket-list/logic';

/** CSS variables for a year: its stored color and its pattern (patterns keep years apart without relying on hue). */
export const yearStyle=(list:BucketList,year:number)=>({'--year':yearColor(list,year)} as CSSProperties);

/** A year's key: color + pattern + the year in text. Used in the legend, on rows, cards and the timeline. */
export function YearSwatch({list,year,size='md'}:{list:BucketList;year:number;size?:'sm'|'md'}){
 return <span className="muse-bucket-swatch" data-size={size} data-pattern={yearPattern(year)} style={yearStyle(list,year)} aria-hidden="true"/>;
}
export function YearChip({list,year}:{list:BucketList;year:number}){
 return <span className="muse-bucket-yearchip" style={yearStyle(list,year)}><YearSwatch list={list} year={year} size="sm"/>{shortYear(year)}</span>;
}

export type RowActions={
 onToggle:(e:BucketEntry,anchor:HTMLElement)=>void;onOpen:(e:BucketEntry,anchor:HTMLElement)=>void;menu:(e:BucketEntry)=>OverflowAction[];
};
export type Arrange={busy:boolean;dragging:string|null;setDragging:(id:string|null)=>void;onMove:(id:string,toIndex:number)=>void};

const heartPath='M12 20.3 4.6 13a4.7 4.7 0 0 1 6.6-6.7l.8.8.8-.8a4.7 4.7 0 0 1 6.6 6.7Z';
/** The heart beside the number: empty while it's a dream; filled with the year's color once it came true. */
export function Heart({filled=false}:{filled?:boolean}){
 return <svg className="muse-bucket-heart-icon" data-filled={filled||undefined} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={heartPath}/></svg>;
}
function Check({e,onToggle}:{e:BucketEntry;onToggle:RowActions['onToggle']}){
 const done=e.status==='completed';
 return <button type="button" className="muse-bucket-heart" aria-pressed={done} aria-label={done?`Came true: ${e.title}. Reopen`:`Cross off: ${e.title}`} title={done?'Reopen':'Cross it off'} onClick={ev=>onToggle(e,ev.currentTarget)}><Heart filled={done}/></button>;
}

function facts(e:BucketEntry){
 const out:string[]=[];
 if(e.status==='planned'||e.status==='in_progress')out.push(statusLabels[e.status]);
 if(e.category)out.push(e.category);
 if(e.status!=='completed'&&e.targetYear)out.push(`hoping for ${e.targetYear}`);
 return out;
}

/** Classic List: dense, numbered, in your order — the handwritten list, with completions in their year's color. */
export function ClassicList({list,entries,actions,arrange,addRow}:{list:BucketList;entries:BucketEntry[];actions:RowActions;arrange?:Arrange;addRow?:ReactNode}){
 // Fill like a notebook page: down the first column, then the next. At least 12 lines per column, so a short list
 // stays in the first column instead of scattering one dream per column.
 const lines=entries.length+(addRow?1:0),rows=(cols:number)=>Math.max(12,Math.ceil(lines/cols));
 return <ol className="muse-bucket-classic" data-style={list.completionStyle} style={{'--rows3':rows(3),'--rows2':rows(2)} as CSSProperties}>
  {entries.map((e,i)=>{const y=yearOf(e.completedOn);
   const key=(ev:KeyboardEvent)=>{if(!arrange||arrange.busy)return;if(ev.key==='ArrowUp'&&i>0){ev.preventDefault();arrange.onMove(e.id,i-1);}if(ev.key==='ArrowDown'&&i<entries.length-1){ev.preventDefault();arrange.onMove(e.id,i+1);}};
   return <li key={e.id} className="muse-bucket-row" data-done={y?true:undefined} data-pattern={y?yearPattern(y):undefined} style={y?yearStyle(list,y):undefined} data-dragging={arrange?.dragging===e.id||undefined}
    onDragOver={arrange?ev=>{ev.preventDefault();ev.dataTransfer.dropEffect='move';}:undefined}
    onDrop={arrange?ev=>{ev.preventDefault();const id=ev.dataTransfer.getData('text/plain')||arrange.dragging;if(id&&id!==e.id)arrange.onMove(id,i);arrange.setDragging(null);}:undefined}>
    {arrange&&<button type="button" className="muse-bucket-handle" draggable={!arrange.busy} disabled={arrange.busy} aria-label={`Reorder ${e.title}. Use the up and down arrow keys`} title="Drag, or use ↑ ↓"
     onDragStart={ev=>{ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',e.id);arrange.setDragging(e.id);}} onDragEnd={()=>arrange.setDragging(null)} onKeyDown={key}><MuseIcon name="grip" size={14}/></button>}
    {list.showNumbers&&<span className="muse-bucket-num">{e.number?`${e.number}.`:''}</span>}
    <Check e={e} onToggle={actions.onToggle}/>
    <div className="muse-bucket-main">
     <button type="button" className="muse-bucket-title" onClick={ev=>actions.onOpen(e,ev.currentTarget)}>{e.icon&&<span className="muse-bucket-icon" aria-hidden="true">{e.icon} </span>}<span className="muse-bucket-title-text">{e.title}</span>{y&&<span className="sr-only">. Completed {dateLabel(e.completedOn!)}</span>}</button>
     {(facts(e).length>0||e.tags.length>0)&&<p className="muse-bucket-facts">{facts(e).join(' · ')}{e.tags.map(t=><span key={t} className="muse-bucket-tag">#{t}</span>)}</p>}
    </div>
    {y&&<span className="muse-bucket-stamp" title={`Completed ${dateLabel(e.completedOn!)}`}><YearChip list={list} year={y}/></span>}
    <span className="muse-bucket-more"><MuseOverflowMenu label={e.title} actions={actions.menu(e)}/></span>
   </li>;})}
  {addRow&&<li className="muse-bucket-row muse-bucket-addrow">{addRow}</li>}
 </ol>;
}

/** A private photo: signed URLs are short-lived, so they're fetched when shown. */
export function BucketPhoto({image,full=false,className}:{image:BoardImage;full?:boolean;className?:string}){
 const [src,setSrc]=useState('');
 useEffect(()=>{let live=true;boardImageUrl(full?image.path:image.thumbnailPath).then(u=>{if(live)setSrc(u);}).catch(()=>{});return ()=>{live=false;};},[image,full]);
 const f=photoFrame(image),style={objectPosition:`${f.x}% ${f.y}%`,...(f.zoom>1?{transform:`scale(${f.zoom})`,transformOrigin:`${f.x}% ${f.y}%`}:{})};
 return src?<img className={className} src={src} alt={image.alt||''} width={image.width} height={image.height} loading="lazy" style={style}/>:<span className={`${className??''} muse-bucket-photo-wait`} aria-hidden="true"/>;
}

/** Collectible Cards: a card per dream; completed ones keep a keepsake (photo, place, date) in their year's color. */
export function CardsView({list,entries,actions}:{list:BucketList;entries:BucketEntry[];actions:RowActions}){
 return <div className="muse-bucket-cards">{entries.map(e=>{const y=yearOf(e.completedOn),photo=e.cover??e.completion.photos?.[0];
  return <article key={e.id} className="muse-bucket-card" data-done={y?true:undefined} data-pattern={y?yearPattern(y):undefined} style={y?yearStyle(list,y):undefined}>
   <div className="muse-bucket-card-art">{photo?<BucketPhoto image={photo} className="muse-bucket-card-photo"/>:<span className="muse-bucket-card-emoji" aria-hidden="true">{e.icon||'✦'}</span>}
    {list.showNumbers&&e.number&&<span className="muse-bucket-card-num">No. {e.number}</span>}
    {y&&<span className="muse-bucket-card-ribbon"><YearChip list={list} year={y}/></span>}</div>
   <div className="muse-bucket-card-body">
    <span className="small-label">{[e.category,statusLabels[e.status]].filter(Boolean).join(' · ')}</span>
    <h3><button type="button" className="muse-bucket-title" onClick={ev=>actions.onOpen(e,ev.currentTarget)}><span className="muse-bucket-title-text">{e.title}</span></button></h3>
    {y?<p className="muse-bucket-card-keepsake">Done {dateLabel(e.completedOn!)}</p>:<p className="small-label">{e.targetYear?`Hoping for ${e.targetYear}`:'Someday'}</p>}
    {e.completion.location&&<p className="muse-bucket-card-where"><MuseIcon name="map-pin" size={14}/><span>{e.completion.location}</span></p>}
    {(e.completion.memory||e.notes)&&<p className="muse-bucket-card-note">{y&&e.completion.memory?`“${e.completion.memory}”`:e.notes}</p>}
    <div className="muse-bucket-card-foot"><Check e={e} onToggle={actions.onToggle}/><span>{y?'Completed':'Mark done'}</span><span className="muse-bucket-more"><MuseOverflowMenu label={e.title} actions={actions.menu(e)}/></span></div>
   </div>
  </article>;})}</div>;
}

/** Timeline: a window of years; each shows what was done that year and what's hoped for it. Someday stays Someday. */
export function TimelineView({list,years,someday,today,actions}:{list:BucketList;years:TimelineYear[];someday:BucketEntry[];today:string;actions:RowActions}){
 const span=10,thisYear=Number(today.slice(0,4)),first=years[0]?.year??thisYear,last=years.at(-1)?.year??thisYear;
 const [start,setStart]=useState(()=>Math.max(first,Math.min(list.horizonStart,last-span+1)));
 const shown=years.filter(y=>y.year>=start&&y.year<start+span);
 const pill=(e:BucketEntry,done:boolean)=><li key={e.id}><button type="button" className="muse-bucket-pill" data-done={done||undefined} onClick={ev=>actions.onOpen(e,ev.currentTarget)}>
  {done?<MuseIcon name="check" size={11}/>:null}{e.icon?`${e.icon} `:''}<span className="muse-bucket-title-text">{e.title}</span>{list.showNumbers&&e.number?<small>#{e.number}</small>:null}</button></li>;
 return <div className="muse-bucket-timeline">
  <div className="muse-bucket-timeline-nav"><button type="button" className="muse-button" aria-label="Earlier years" disabled={start<=first} onClick={()=>setStart(s=>Math.max(first,s-span))}>‹</button>
   <span>{start} – {start+span-1}</span><button type="button" className="muse-button" aria-label="Later years" disabled={start+span>last} onClick={()=>setStart(s=>s+span)}>›</button></div>
  <ol className="muse-bucket-years">{shown.map(y=><li key={y.year} className={`muse-bucket-year${y.year===thisYear?' muse-today-ring':''}`} style={yearStyle(list,y.year)} data-current={y.year===thisYear||undefined}>
   <h3><YearSwatch list={list} year={y.year}/>{y.year}{y.year===thisYear&&<small>this year</small>}<span className="muse-bucket-year-count">{y.completed.length} done</span></h3>
   {y.completed.length>0&&<ul className="muse-bucket-pills" aria-label={`Completed in ${y.year}`}>{y.completed.map(e=>pill(e,true))}</ul>}
   {y.hoped.length>0&&<><p className="small-label">Hoping for {y.year}</p><ul className="muse-bucket-pills" aria-label={`Hoping for ${y.year}`}>{y.hoped.map(e=>pill(e,false))}</ul></>}
   {!y.completed.length&&!y.hoped.length&&<p className="muse-bucket-quiet">{y.year<thisYear?'A quiet year for the list.':'Open — room for a dream.'}</p>}
  </li>)}</ol>
  <section className="muse-bucket-someday" aria-label="Someday"><h3>Someday <span className="muse-bucket-year-count">{someday.length}</span></h3>
   {someday.length?<ul className="muse-bucket-pills">{someday.map(e=>pill(e,false))}</ul>:<p className="muse-bucket-quiet">Every open dream has a year in mind.</p>}</section>
 </div>;
}

/**
 * #104 §10: position and zoom a photo inside the card frame. Drag (mouse or touch) or use arrow keys; the preview is the
 * exact card shape, so what you see is what every card shows on desktop and mobile. The upload itself is never changed.
 */
export function PhotoFramer({image,onChange}:{image:BoardImage;onChange:(frame:PhotoFrame)=>void}){
 const f=photoFrame(image),drag=useRef<{x:number;y:number;fx:number;fy:number;w:number;h:number}|null>(null);
 const move=(x:number,y:number)=>onChange({...f,x:Math.min(100,Math.max(0,x)),y:Math.min(100,Math.max(0,y))});
 return <div className="muse-bucket-framer">
  <div className="muse-bucket-framer-stage muse-bucket-card-art" role="slider" tabIndex={0} aria-label="Photo position. Drag or use arrow keys." aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f.x)} aria-valuetext={`${Math.round(f.x)}% across, ${Math.round(f.y)}% down`}
   onPointerDown={ev=>{const r=ev.currentTarget.getBoundingClientRect();drag.current={x:ev.clientX,y:ev.clientY,fx:f.x,fy:f.y,w:r.width,h:r.height};ev.currentTarget.setPointerCapture(ev.pointerId);}}
   onPointerMove={ev=>{const d=drag.current;if(!d)return;const k=100/f.zoom;move(d.fx-(ev.clientX-d.x)/d.w*k,d.fy-(ev.clientY-d.y)/d.h*k);}}
   onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
   onKeyDown={ev=>{const step=ev.shiftKey?10:2;const m:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};const v=m[ev.key];if(v){ev.preventDefault();move(f.x+v[0],f.y+v[1]);}}}>
   <BucketPhoto image={image} full className="muse-bucket-card-photo"/>
   <span className="muse-bucket-framer-hint" aria-hidden="true">Drag to position</span>
  </div>
  <div className="muse-bucket-framer-controls">
   <label><span className="small-label">Zoom</span><input type="range" min={1} max={3} step={0.05} value={f.zoom} onChange={ev=>onChange({...f,zoom:Number(ev.target.value)})}/></label>
   <button type="button" className="text-button" onClick={()=>onChange(defaultFrame)}>Reset</button>
  </div>
 </div>;
}
