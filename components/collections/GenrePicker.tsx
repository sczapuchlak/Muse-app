'use client';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import type {MediaKind} from '@/lib/collections/models';
import './GenrePicker.css';

export type GenreKind='book'|MediaKind;
const common=['Fantasy','Romance','Science Fiction','Mystery','Thriller','Horror','Adventure','Comedy','Drama','Historical','Nonfiction'];
export const genrePresets:Record<GenreKind,string[]>={
 book:[...common,'Romantasy','Contemporary Romance','Historical Romance','Historical Fiction','Literary Fiction','Contemporary Fiction','Young Adult','Biography','Memoir','History','Self-Help','Graphic Novel','Poetry'],
 movie:[...common,'Action','Animation','Documentary','Family','Musical','Crime','War','Western'],
 tv:[...common,'Animation','Documentary','Reality','Crime','Sitcom','Miniseries','Family'],
 game:['RPG','Action RPG','CRPG','Strategy','Turn-Based Strategy','Adventure','Action','Simulation','Puzzle','Survival','Horror','Platformer','Cozy','Open World','Roguelike','Visual Novel','Sports','Racing']
};
export const splitGenres=(value:string)=>[...new Set(value.split(',').map(part=>part.trim()).filter(Boolean))];
export function GenrePicker({kind,value,onChange}:{kind:GenreKind;value:string;onChange:(value:string)=>void}){
 const selected=splitGenres(value),options=[...new Set([...genrePresets[kind],...selected])].sort((a,b)=>a.localeCompare(b));
 return <div className="muse-genre-picker"><span>Genres <small>choose more than one</small></span><MuseChoiceMenu label={`${kind==='tv'?'TV show':kind} genres`} valueLabel={selected.length?`${selected.length} selected`:'Choose genres'} options={options.map(label=>({id:label,label}))} selectedIds={selected} multiple searchable onSelect={id=>onChange((selected.includes(id)?selected.filter(item=>item!==id):[...selected,id]).join(', '))} onClear={()=>onChange('')}/>{selected.length>0&&<div className="muse-genre-chips" aria-label="Selected genres">{selected.map(item=><button key={item} type="button" className="muse-genre-chip" aria-label={`Remove ${item} genre`} onClick={()=>onChange(selected.filter(value=>value!==item).join(', '))}>{item} <span aria-hidden="true">×</span></button>)}</div>}</div>;
}
