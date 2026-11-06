'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {defaultKeepsakeSections,drawKeepsake,keepsakeContent,keepsakeSections,keepsakeShapes,type KeepsakeSection,type KeepsakeShape} from '@/lib/whimsy/keepsake';

/**
 * Make a keepsake (#50): preview, choose what it shows, save a PNG to this device. Nothing is uploaded or stored;
 * reviews stay out unless ticked.
 */
export function KeepsakeExport({books,sessions,goals,year,today,onClose}:{books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];year:string;today:string;onClose:()=>void}){
 const [scope,setScope]=useState<'year'|'all'>('year'),[shape,setShape]=useState<KeepsakeShape>('post'),[include,setInclude]=useState<KeepsakeSection[]>(defaultKeepsakeSections);
 const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');const canvas=useRef<HTMLCanvasElement>(null);const [skipped,setSkipped]=useState<KeepsakeSection[]>([]);
 const content=useMemo(()=>keepsakeContent({books,sessions,goals,year:scope==='year'?year:null,today,include}),[books,sessions,goals,scope,year,today,include]);
 useEffect(()=>{let live=true;const el=canvas.current;if(!el)return;
  // Wait for the theme's fonts so the preview and the saved image match.
  void (document.fonts?.ready??Promise.resolve()).then(()=>{if(live)setSkipped(drawKeepsake(el,content,shape));});
  return ()=>{live=false;};},[content,shape]);
 const toggle=(k:KeepsakeSection)=>setInclude(list=>list.includes(k)?list.filter(x=>x!==k):[...list,k]);
 function save(){const el=canvas.current;if(!el)return;setStatus('saving');
  el.toBlob(blob=>{if(!blob){setStatus('error');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=`muse-reading-${scope==='year'?year:'all-time'}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('saved');},'image/png');}
 const nothing=!content.stats.length&&!content.emojis.length&&!content.persona&&!content.genres.length&&!content.favorites.length&&!content.challenge&&!content.timeline.length&&!content.reviews.length;
 return <MuseModal id="reading-keepsake" label="Make a keepsake" title="Make a keepsake" returnFocus={null} onClose={onClose} size="tall">
  <div className="muse-books-dialog muse-keepsake">
   <div className="muse-keepsake-preview" data-shape={shape}><canvas ref={canvas} role="img" aria-label={`Keepsake preview: ${content.kicker}, ${content.title}`}/></div>
   <form className="muse-keepsake-options" onSubmit={e=>{e.preventDefault();save();}}>
    <fieldset><legend className="small-label">Show</legend><div className="muse-keepsake-choice">
     <label><input type="radio" name="keepsake-scope" checked={scope==='year'} onChange={()=>setScope('year')}/> {year}</label>
     <label><input type="radio" name="keepsake-scope" checked={scope==='all'} onChange={()=>setScope('all')}/> All time</label></div></fieldset>
    <fieldset><legend className="small-label">Shape</legend><div className="muse-keepsake-choice">{(Object.keys(keepsakeShapes) as KeepsakeShape[]).map(k=>
     <label key={k}><input type="radio" name="keepsake-shape" checked={shape===k} onChange={()=>setShape(k)}/> {keepsakeShapes[k].label}</label>)}</div></fieldset>
    <fieldset><legend className="small-label">Include</legend><div className="muse-keepsake-sections">{(Object.keys(keepsakeSections) as KeepsakeSection[]).map(k=>
     <label key={k}><input type="checkbox" checked={include.includes(k)} onChange={()=>toggle(k)}/> {keepsakeSections[k]}{k==='reviews'&&<small> · private writing, off unless you choose it</small>}</label>)}</div></fieldset>
    <p className="small-label">Sections without data are left out. Covers aren’t included. The image is made on this device and saved only where you choose.</p>
    {skipped.length>0&&<p role="status" className="small-label">Didn’t fit this shape: {skipped.map(k=>keepsakeSections[k]).join(', ')}.{shape==='post'?' Story has more room.':' Untick a section to make space.'}</p>}
    {nothing&&<p role="status">Nothing to show yet for this choice. Finish a book or log a session first.</p>}
    <div className="muse-books-actions"><button type="submit" className="muse-button button-primary" disabled={status==='saving'}>Save image</button><button type="button" className="text-button" onClick={onClose}>Done</button>
     <span role="status" className="small-label">{status==='saved'?'Saved to your device.':status==='error'?'Couldn’t make the image. Try again.':''}</span></div>
   </form>
  </div>
 </MuseModal>;
}
