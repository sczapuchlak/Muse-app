'use client';
import type {ReactNode} from 'react';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';

export type BandStat={icon:MuseIconName;value:string;label:string};
export type BandArtKind='overview'|'patterns'|'milestones';
const Grad=({id}:{id:string})=><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{stopColor:'var(--accent-primary)'}}/><stop offset="1" style={{stopColor:'var(--accent-secondary)'}}/></linearGradient></defs>;
const spark='M0 -9 Q1.6 -1.6 9 0 Q1.6 1.6 0 9 Q-1.6 1.6 -9 0 Q-1.6 -1.6 0 -9Z';
/**
 * Each Atlas page's own little scene (her note, Nov 26: "they should all have different graphics"). Same language as
 * Reading DNA's moon over clouds (which stays DNA's): a glowing accent mark over soft gradient shapes, sized alike.
 * Overview: an open book with a star rising from it. Patterns: a sun rising over waves (the rhythm of reading).
 * Books & Milestones: a stack of books topped with a pennant.
 */
export function BandArt({kind}:{kind:BandArtKind}){
 const g=`band-${kind}`;
 if(kind==='overview')return <span className="muse-band-art" data-kind={kind} aria-hidden="true"><svg viewBox="0 0 76 64"><Grad id={g}/>
  <path className="muse-band-glow" transform="translate(38 16)" d={spark}/><circle className="muse-band-dot" cx="22" cy="12" r="1.6"/><circle className="muse-band-dot" cx="56" cy="20" r="1.3"/>
  <path fill={`url(#${g})`} d="M38 36c-8-5-18-6-28-4v24c10-2 20-1 28 4z"/><path fill={`url(#${g})`} opacity=".78" d="M38 36c8-5 18-6 28-4v24c-10-2-20-1-28 4z"/>
  <path className="muse-band-line" d="M16 38c6-1 12-.4 18 2M16 44c6-1 12-.4 18 2M42 40c6-2.4 12-3 18-2M42 46c6-2.4 12-3 18-2"/></svg></span>;
 if(kind==='patterns')return <span className="muse-band-art" data-kind={kind} aria-hidden="true"><svg viewBox="0 0 76 64"><Grad id={g}/>
  <circle className="muse-band-glow" cx="38" cy="34" r="15"/><path className="muse-band-ray" d="M38 8v6M20 16l4 4M56 16l-4 4M12 32h6M58 32h6"/>
  <path fill="none" stroke={`url(#${g})`} strokeWidth="5" strokeLinecap="round" d="M6 42c6-5 12-5 18 0s12 5 18 0 12-5 18 0 8 4 10 2"/>
  <path fill="none" stroke={`url(#${g})`} strokeWidth="4" strokeLinecap="round" opacity=".7" d="M10 52c6-4 11-4 16 0s11 4 16 0 11-4 16 0 6 3 8 1"/></svg></span>;
 return <span className="muse-band-art" data-kind={kind} aria-hidden="true"><svg viewBox="0 0 76 64"><Grad id={g}/>
  <rect fill={`url(#${g})`} x="12" y="50" width="52" height="9" rx="2.5"/><rect fill={`url(#${g})`} opacity=".8" x="16" y="40" width="44" height="9" rx="2.5"/><rect fill={`url(#${g})`} opacity=".62" x="20" y="30" width="38" height="9" rx="2.5"/>
  <path className="muse-band-line" d="M20 54.5h10M24 44.5h8M28 34.5h7"/><path className="muse-band-pole" d="M44 30V6"/><path className="muse-band-glow" d="M44 6l16 5-16 6z"/>
  <path className="muse-band-glow" transform="translate(20 14) scale(.6)" d={spark}/></svg></span>;
}
/**
 * Every Atlas page opens with the same band (her favourite, Reading DNA): its own art, a small kicker, an editorial title with
 * its line, and up to four numbers, each with its icon above it and a divider between.
 */
export function AtlasBand({art,kicker,title,line,stats,children}:{art:BandArtKind;kicker:string;title:ReactNode;line?:ReactNode;stats:BandStat[];children?:ReactNode}){
 return <header className="muse-dna-hero muse-atlas-band">
  <BandArt kind={art}/>
  <div className="muse-dna-who"><span className="small-label">{kicker}</span><h3>{title}</h3>{line&&<p>{line}</p>}{children}</div>
  <dl className="muse-dna-stats">{stats.map(s=><div key={s.label}><span aria-hidden="true"><MuseIcon name={s.icon} size={17}/></span><dd className="type-numeric">{s.value}</dd><dt>{s.label}</dt></div>)}</dl>
 </header>;
}
