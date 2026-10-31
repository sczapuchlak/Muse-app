'use client';
import {useRef,useState} from 'react';
import type {RitualDefinition} from '@/lib/rituals';
import {MuseOverflowMenu} from '../MuseOverflowMenu';
import {MuseModal} from '../MuseModal';
import {useRituals} from './RitualStore';
export function RitualLifecycle({ritual,today}:{ritual:RitualDefinition;today:string}){
 const {state,dispatch,status}=useRituals(),[deleting,setDeleting]=useState(false),[returnFocus,setReturnFocus]=useState<HTMLElement|null>(null),anchor=useRef<HTMLSpanElement>(null);
 const mode=ritual.status??'active',count=state.entries.filter(e=>e.ritualId===ritual.id).length;
 function change(operation:'pause'|'resume'|'archive'|'restore'|'delete'){if(!today||!status.loaded||status.error)return;dispatch({type:'ritual/lifecycle',id:ritual.id,operation,today});setDeleting(false);}
 return <span ref={anchor}><MuseOverflowMenu label={ritual.name} actions={[
 ...(mode==='active'?[{id:'pause',label:'Pause from today',onSelect:()=>change('pause')}]:mode==='paused'?[{id:'resume',label:'Resume from today',onSelect:()=>change('resume')}]:[]),
 mode==='archived'?{id:'restore',label:'Restore from today',onSelect:()=>change('restore')}:{id:'archive',label:'Archive from today',onSelect:()=>change('archive')},
 {id:'delete',label:'Delete permanently…',onSelect:()=>{setReturnFocus(anchor.current?.querySelector('button')??null);setDeleting(true);}},
 ]}/>{deleting&&<MuseModal id={`delete-ritual-${ritual.id}`} label={`Permanently delete ${ritual.name}?`} title="Delete ritual permanently?" returnFocus={returnFocus} onClose={()=>setDeleting(false)}>
 <p>{count?`${ritual.name} has ${count} recorded days. Deleting removes all of those records, its settings and lifecycle history permanently.`:`Delete ${ritual.name} and its settings permanently?`}</p><p>Archiving keeps history and stops future tracking. Permanent deletion cannot be undone.</p>
 <div className="editor-actions"><button type="button" className="muse-button" onClick={()=>setDeleting(false)}>Cancel</button>{mode!=='archived'&&<button type="button" className="muse-button button-primary" disabled={!status.loaded||!!status.error} onClick={()=>change('archive')}>Archive instead</button>}<button type="button" className="muse-button" disabled={!status.loaded||!!status.error} onClick={()=>change('delete')}>Delete ritual permanently</button></div>
 </MuseModal>}</span>;
}
