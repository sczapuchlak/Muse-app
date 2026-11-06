"use client";
import {useState,type CSSProperties} from 'react';
import {profileBadges,badgeCategories,badgeById,badgeAccent,MAX_BADGES,type BadgeCategory} from '@/lib/profile/badges';
import {MuseIcon} from '../MuseIcon';

/**
 * Personality badges without the wall: your picks at the top, then one category at a time (or search across all).
 * Same outline pills, icons and category colours as the profile; at most six.
 */
export function BadgePicker({chosen,onChange}:{chosen:string[];onChange:(next:string[])=>void}){
 const [category,setCategory]=useState<BadgeCategory>(()=>badgeById(chosen[0]??'')?.category??badgeCategories[0].id);
 const [query,setQuery]=useState('');
 const term=query.trim().toLowerCase();
 const list=term?profileBadges.filter(b=>b.label.toLowerCase().includes(term)):profileBadges.filter(b=>b.category===category);
 const toggle=(id:string)=>onChange(chosen.includes(id)?chosen.filter(x=>x!==id):[...chosen,id]);
 const full=chosen.length>=MAX_BADGES;
 return <div className="muse-badge-picker">
  <div className="muse-badge-chosen" aria-live="polite">
   <p className="small-label">Your badges · {chosen.length}/{MAX_BADGES}{full?' · remove one to choose another':''}</p>
   {chosen.length?<ul className="muse-badge-list">{chosen.map(id=>{const b=badgeById(id);return b?<li key={id}><button type="button" className="muse-badge" aria-pressed="true" aria-label={`Remove ${b.label}`} style={{'--badge':badgeAccent(b.category)} as CSSProperties} onClick={()=>toggle(id)}><MuseIcon name={b.icon} size={14}/>{b.label}<MuseIcon name="close" size={12}/></button></li>:null;})}</ul>
    :<p className="small-label">None yet. Browse a category or search below.</p>}
  </div>
  <label className="muse-badge-search"><MuseIcon name="search" size={15}/><span className="sr-only">Search badges</span><input type="search" value={query} placeholder="Search badges…" onChange={e=>setQuery(e.target.value)}/></label>
  {!term&&<div className="muse-badge-tabs" role="tablist" aria-label="Badge categories">{badgeCategories.map(c=>{const picked=chosen.filter(id=>badgeById(id)?.category===c.id).length;
   return <button key={c.id} type="button" role="tab" aria-selected={category===c.id} style={{'--badge':c.accent} as CSSProperties} onClick={()=>setCategory(c.id)}>{c.label}{picked>0&&<span className="muse-badge-tab-count">{picked}</span>}</button>;})}</div>}
  <div className="muse-badge-list" role={term?undefined:'tabpanel'} aria-label={term?`Badges matching “${query}”`:badgeCategories.find(c=>c.id===category)?.label}>
   {list.length?list.map(b=>{const on=chosen.includes(b.id);return <button key={b.id} type="button" className="muse-badge" aria-pressed={on} disabled={!on&&full} style={{'--badge':badgeAccent(b.category)} as CSSProperties} onClick={()=>toggle(b.id)}><MuseIcon name={b.icon} size={14}/>{b.label}{on&&<MuseIcon name="check" size={13}/>}</button>;})
    :<p className="small-label">No badges match “{query}”.</p>}
  </div>
 </div>;
}
