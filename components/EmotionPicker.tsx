"use client";
import { useId,useState } from "react";
import { findEmotions } from "@/lib/emotions";
import { moodQuadrants,type Emotion,type EmotionQuadrant } from "@/lib/models";
import { cleanFeelingName,findFeelingByName,type CustomFeeling } from "@/lib/feelings";
import { useMuseState } from './MuseSession';
import { initialMoodState } from '@/lib/mood';
import { MuseIcon } from "./MuseIcon";
import { FeelingCreator,FeelingInterpreter,FeelingManager } from "./mood/FeelingPanels";
import "./mood/Feelings.css";

/** The optional personal-library features. Without them this is the plain searchable list. */
export type FeelingLibraryProps={
 /** The quadrant each selected feeling has in this entry (a personal interpretation can differ from the default). */
 selectedQuadrants?:Record<string,EmotionQuadrant>;
 /** `emotion` is passed when the feeling was only just created, before the list has refreshed. */
 onSelect?:(id:string,quadrant:EmotionQuadrant,emotion?:Emotion)=>void;
 favoriteIds?:string[];onFavorite?:(id:string)=>void;recentIds?:string[];
 /** Adds a new feeling to the person's library and resolves with it. */
 onCreate?:(draft:{name:string;quadrant:EmotionQuadrant})=>Promise<Emotion>;
 custom?:CustomFeeling[];
 onUpdateCustom?:(id:string,patch:{name?:string;quadrant?:EmotionQuadrant})=>Promise<void>;
 onDeleteCustom?:(id:string)=>Promise<void>;
 libraryError?:string;
};
type Props={emotions:Emotion[];selectedIds:string[];onToggle:(id:string)=>void;onClose:()=>void}&FeelingLibraryProps;
type View={kind:'browse'}|{kind:'create';name:string}|{kind:'interpret';id:string}|{kind:'manage'};
const about="Muse’s Mood Meter is inspired by the Yale Center for Emotional Intelligence’s approach to understanding emotions through energy and pleasantness. We’ve expanded the vocabulary, and you can add feelings of your own. There’s no single right way to feel a word.";

export function EmotionPicker({emotions,selectedIds,onToggle,onClose,selectedQuadrants,onSelect,favoriteIds,onFavorite,recentIds,onCreate,custom,onUpdateCustom,onDeleteCustom,libraryError}:Props) {
 const [query,setQuery]=useState(''),[activeId,setActiveId]=useState<string|null>(null),[quadrant,setQuadrant]=useState<EmotionQuadrant|null>(null),[favoritesOnly,setFavoritesOnly]=useState(false),[recentOnly,setRecentOnly]=useState(false),[definition,setDefinition]=useState<Emotion|null>(null),[view,setView]=useState<View>({kind:'browse'}),[aboutOpen,setAboutOpen]=useState(false);
 const [state,setState]=useMuseState('emotional-observatory',initialMoodState,true),id=useId();
 const favorites=favoriteIds??state.favoriteEmotionIds,hasRecent=!!recentIds?.length;
 const results=(!query.trim()?emotions:findEmotions(emotions,query)).filter((emotion)=>(!quadrant||emotion.quadrant===quadrant)&&(!favoritesOnly||favorites.includes(emotion.id))&&(!recentOnly||recentIds?.includes(emotion.id)));
 const focusId=results.some((emotion)=>emotion.id===activeId)?activeId:results[0]?.id;
 const quadrantOf=(emotion:Emotion)=>(selectedIds.includes(emotion.id)&&selectedQuadrants?.[emotion.id])||emotion.quadrant;
 const canAdd=!!onCreate&&!!cleanFeelingName(query)&&!findFeelingByName(query,emotions);
 function favorite(emotionId:string){if(onFavorite){onFavorite(emotionId);return;}setState((current)=>({...current,favoriteEmotionIds:current.favoriteEmotionIds.includes(emotionId)?current.favoriteEmotionIds.filter((value)=>value!==emotionId):[...current.favoriteEmotionIds,emotionId]}));}
 /** Words people feel differently ask how this one feels; everything else is one tap, as before. */
 function choose(emotion:Emotion){if(selectedIds.includes(emotion.id)||!(emotion.ambiguous&&onSelect)){onToggle(emotion.id);return;}setView({kind:'interpret',id:emotion.id});}
 function reset(){setView({kind:'browse'});}
 const all=emotions;
 if(view.kind==='create'&&onCreate)return <div className="emotion-picker"><FeelingCreator initialName={view.name} library={all} onBack={reset}
  onUse={(existing)=>{const found=all.find((item)=>item.id===existing.id)??existing;setQuery('');if(selectedIds.includes(found.id)){reset();return;}if(found.ambiguous&&onSelect){setView({kind:'interpret',id:found.id});return;}onToggle(found.id);reset();}}
  onCreate={async(draft)=>{const made=await onCreate(draft);onSelect?.(made.id,made.quadrant,made);setQuery('');reset();}}/></div>;
 if(view.kind==='interpret'){const emotion=all.find((item)=>item.id===view.id);if(emotion)return <div className="emotion-picker"><FeelingInterpreter emotion={emotion} current={selectedQuadrants?.[emotion.id]??emotion.quadrant} onBack={reset} onChoose={(q)=>{onSelect?.(emotion.id,q);reset();}}/></div>;}
 if(view.kind==='manage'&&onUpdateCustom&&onDeleteCustom)return <div className="emotion-picker"><FeelingManager custom={custom??[]} error={libraryError} onBack={reset} onUpdate={onUpdateCustom} onDelete={onDeleteCustom}/></div>;
 return <div className="emotion-picker"><div className="emotion-picker-header"><div className="muse-feelings-labelrow"><label htmlFor={`${id}-search`} className="editor-label">Search feelings</label><button type="button" className="muse-feelings-about-button" aria-label="About this feelings library" aria-expanded={aboutOpen} aria-controls={`${id}-about`} onClick={()=>setAboutOpen((value)=>!value)}><MuseIcon name="info" size={15}/></button></div>
 {aboutOpen&&<p className="muse-feelings-about" id={`${id}-about`} role="note">{about}</p>}
 <div className="emotion-search-field"><MuseIcon name="search" size={18}/><input id={`${id}-search`} type="search" value={query} placeholder="Search feelings" data-popover-autofocus autoComplete="off" onChange={(event)=>setQuery(event.target.value)}/></div>
 <div className="quadrant-filters" role="group" aria-label="Browse by quadrant"><button data-chip-size="default" type="button" aria-pressed={quadrant===null&&!favoritesOnly&&!recentOnly} onClick={()=>{setQuadrant(null);setFavoritesOnly(false);setRecentOnly(false);}}>All</button>{hasRecent&&<button data-chip-size="default" type="button" aria-pressed={recentOnly} onClick={()=>setRecentOnly((value)=>!value)}>Recent</button>}<button data-chip-size="default" type="button" aria-pressed={favoritesOnly} onClick={()=>setFavoritesOnly((value)=>!value)}>Favorites</button>{(Object.keys(moodQuadrants) as EmotionQuadrant[]).map((key)=><button type="button" data-chip-size="default" key={key} data-quadrant={key} aria-pressed={quadrant===key} title={`${moodQuadrants[key].energy} energy, ${moodQuadrants[key].pleasantness}`} onClick={()=>setQuadrant((value)=>value===key?null:key)}><span className="quadrant-dot" aria-hidden="true"/>{moodQuadrants[key].label}</button>)}</div>
 <p className="emotion-results-status" role="status">{quadrant?`${moodQuadrants[quadrant].energy} energy · ${moodQuadrants[quadrant].pleasantness}`:`Browse ${results.length} ${favoritesOnly?'favorite ':recentOnly?'recent ':''}feelings`}</p>{definition&&<p className="muse-emotion-definition" role="note"><strong>{definition.name}.</strong> {definition.definition}<button type="button" className="muse-grocery-icon" aria-label="Close definition" onClick={()=>setDefinition(null)}><MuseIcon name="close" size={12}/></button></p>}</div>
 <p className="sr-only" id={`${id}-help`}>Use arrow keys to browse feelings. Press F to favorite a feeling. Tab reaches its favorite and information buttons, then Done.</p>
 <div className="emotion-options" role="group" aria-label="Feelings" aria-describedby={`${id}-help`} onKeyDown={(event)=>{if(event.target instanceof HTMLInputElement)return;if(event.key.toLowerCase()==='f'&&activeId){event.preventDefault();favorite(activeId);return;}if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.emotion-option'));if(!buttons.length)return;event.preventDefault();const index=buttons.findIndex((button)=>button.dataset.emotionId===activeId),columns=getComputedStyle(event.currentTarget).gridTemplateColumns.split(' ').length,step=event.key==='ArrowDown'?columns:event.key==='ArrowUp'?-columns:event.key==='ArrowLeft'?-1:1;buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+step))]?.focus();}}>
 {results.map((emotion)=><div className="muse-emotion-result" key={emotion.id} data-quadrant={quadrantOf(emotion)}><button type="button" className="emotion-option" data-emotion-id={emotion.id} tabIndex={emotion.id===focusId?0:-1} onFocus={()=>setActiveId(emotion.id)} aria-pressed={selectedIds.includes(emotion.id)} onClick={()=>choose(emotion)}><span aria-hidden="true">{emotion.emoji}</span><span className="emotion-name">{emotion.name}</span>{selectedIds.includes(emotion.id)&&<MuseIcon name="check" size={15}/>}</button><button className="muse-emotion-utility" type="button" tabIndex={emotion.id===focusId?0:-1} aria-label={`Favorite ${emotion.name}`} aria-pressed={favorites.includes(emotion.id)} title={`Favorite ${emotion.name}`} onClick={()=>favorite(emotion.id)}><MuseIcon name="favorite" size={15}/></button>{onSelect&&(emotion.ambiguous||selectedIds.includes(emotion.id))&&<button className="muse-emotion-utility" type="button" tabIndex={emotion.id===focusId?0:-1} aria-label={`How ${emotion.name} feels to you`} title="How does it feel to you?" onClick={()=>setView({kind:'interpret',id:emotion.id})}><MuseIcon name="edit" size={14}/></button>}{emotion.definition&&<button className="muse-emotion-utility" type="button" tabIndex={emotion.id===focusId?0:-1} aria-label={`About ${emotion.name}`} onClick={()=>setDefinition(emotion)}><MuseIcon name="info" size={15}/></button>}</div>)}
 {!results.length&&<p className="emotion-empty">{favoritesOnly?'Favorite a feeling to keep it close.':recentOnly?'Feelings you choose will show up here.':'No matching feelings.'}</p>}
 {canAdd&&<button type="button" className="muse-feelings-add" onClick={()=>setView({kind:'create',name:query})}><MuseIcon name="plus" size={15}/>Add “{cleanFeelingName(query)}”</button>}</div>
 {libraryError&&<p className="muse-feeling-error" role="status">{libraryError}</p>}
 <footer className="emotion-picker-footer"><span className="small-label">{selectedIds.length} selected</span>{!!custom?.length&&onUpdateCustom&&onDeleteCustom&&<button type="button" className="text-button muse-feelings-manage" onClick={()=>setView({kind:'manage'})}>Your own feelings</button>}<button type="button" className="muse-button" onClick={onClose}>Done</button></footer></div>;
}
