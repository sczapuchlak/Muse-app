'use client';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {genrePresets,splitGenres,type GenreKind} from '@/lib/collections/genres';
export {genrePresets,splitGenres,type GenreKind};
import './GenrePicker.css';

export function GenrePicker({kind,value,onChange}:{kind:GenreKind;value:string;onChange:(value:string)=>void}){
 const selected=splitGenres(value),options=[...new Set([...genrePresets[kind],...selected])].sort((a,b)=>a.localeCompare(b));
 return <div className="muse-genre-picker"><span>Genres <small>choose more than one</small></span><MuseChoiceMenu label={`${kind==='tv'?'TV show':kind} genres`} valueLabel={selected.length?`${selected.length} selected`:'Choose genres'} options={options.map(label=>({id:label,label}))} selectedIds={selected} multiple searchable onSelect={id=>onChange((selected.includes(id)?selected.filter(item=>item!==id):[...selected,id]).join(', '))} onClear={()=>onChange('')}/>{selected.length>0&&<div className="muse-genre-chips" aria-label="Selected genres">{selected.map(item=><button key={item} type="button" className="muse-genre-chip" aria-label={`Remove ${item} genre`} onClick={()=>onChange(selected.filter(value=>value!==item).join(', '))}>{item} <span aria-hidden="true">×</span></button>)}</div>}</div>;
}
