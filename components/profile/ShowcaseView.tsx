"use client";
/* eslint-disable @next/next/no-img-element -- covers come from book and film services; next/image would proxy them. */
import type {CSSProperties,ReactNode} from 'react';
import {gradientCss,gradientById} from '@/lib/profile/gradients';
import type {ShowcaseLayout} from '@/lib/profile/model';
import type {ShowcaseDisplay} from '@/lib/profile/adapters';
import {MuseIcon,type MuseIconName} from '../MuseIcon';
import {MuseStar} from '../MuseStar';

export type ShowcaseViewItem={id:string;display:ShowcaseDisplay;note?:string;missing?:boolean};
export type ShowcaseViewData={id:string;title:string;description:string;icon:string;gradient:string;layout:ShowcaseLayout;items:ShowcaseViewItem[]};
const kindLabel:Record<string,string>={book:'Book',movie:'Film',tv:'Series',game:'Game',curated:'List','tarot-card':'Tarot','dream-symbol':'Dream symbol',ritual:'Ritual','side-quest':'Side quest',victory:'Little victory','money-milestone':'Milestone'};
const icon=(name:string|undefined,fallback:MuseIconName):MuseIconName=>(name as MuseIconName)||fallback;
const kindIcon:Record<string,MuseIconName>={book:'book',movie:'film',tv:'television',game:'gamepad','tarot-card':'tarot','dream-symbol':'dreams','side-quest':'wand'};

function Stars({value}:{value:number}){return <span className="muse-showcase-stars" aria-label={`${value} out of 5`}>{[1,2,3,4,5].map(n=><span key={n} aria-hidden="true" data-on={n<=Math.round(value)||undefined}>★</span>)}</span>;}
function ItemCard({item,variant}:{item:ShowcaseViewItem;variant:'tile'|'card'|'feature'}){
 const d=item.display,date=d.date?new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):null;
 return <article className="muse-showcase-item" data-variant={variant} data-kind={d.kind} data-missing={item.missing||undefined}>
  {d.image?<span className="muse-showcase-art" data-kind={d.kind}><img src={d.image} alt="" loading="lazy" referrerPolicy="no-referrer"/></span>
   :variant==='card'?<span className="muse-showcase-glyph" aria-hidden="true"><MuseIcon name={icon(d.glyph,kindIcon[d.kind??'']??'sparkle')} size={22} treatment="prismatic"/></span>
   :<span className="muse-showcase-cover" aria-hidden="true"><MuseIcon name={icon(d.glyph,kindIcon[d.kind??'']??'sparkle')} size={30} treatment="prismatic"/><span>{d.title}</span></span>}
  <span className="muse-showcase-copy">
   {d.kind&&<small className="muse-showcase-kind">{kindLabel[d.kind]??''}</small>}
   <strong>{d.title}</strong>
   {d.subtitle&&<span className="muse-showcase-subtitle">{d.subtitle}</span>}
   {(d.status||d.rating||date||d.meta?.length)&&<span className="muse-showcase-meta">{d.status&&<span className="muse-tone-pill">{d.status}</span>}{d.rating?<Stars value={d.rating}/>:null}{date&&<span>{date}</span>}{d.meta?.map(m=><span key={m}>{m}</span>)}</span>}
   {typeof d.progress==='number'&&<span className="muse-showcase-progress" role="img" aria-label={`${d.progress}% complete`}><span style={{width:`${d.progress}%`}}/></span>}
   {item.note&&<q className="muse-showcase-note">{item.note}</q>}
   {item.missing&&<span className="muse-showcase-missing">Its source was removed. Friends no longer see this.</span>}
  </span>
 </article>;
}

/** A Showcase as visitors see it: a gradient-framed exhibit with one of five layouts. */
export function ShowcaseView({showcase,actions,emptyHint,headingLevel=3}:{showcase:ShowcaseViewData;actions?:ReactNode;emptyHint?:ReactNode;headingLevel?:2|3}){
 const items=showcase.items,Heading=`h${headingLevel}` as 'h2'|'h3';const preset=gradientById(showcase.gradient);
 const withArt=items.filter(i=>i.display.image),withoutArt=items.filter(i=>!i.display.image);
 return <section className="muse-showcase" data-layout={showcase.layout} style={{'--showcase-gradient':gradientCss(showcase.gradient),'--showcase-glow':preset.stops[Math.floor(preset.stops.length/2)]} as CSSProperties} aria-labelledby={`showcase-${showcase.id}`}>
  <header className="muse-showcase-header">
   <span className="muse-showcase-icon" aria-hidden="true"><MuseIcon name={icon(showcase.icon,'sparkle')} size={22} treatment="prismatic"/></span>
   <span className="muse-showcase-heading"><Heading id={`showcase-${showcase.id}`}>{showcase.title}</Heading>{showcase.description&&<p>{showcase.description}</p>}</span>
   {actions}
  </header>
  {!items.length?<div className="muse-showcase-empty">{emptyHint??<><MuseStar size={18}/><span>Waiting for its first treasure.</span></>}</div>
  :showcase.layout==='spotlight'?<div className="muse-showcase-spotlight"><ItemCard item={items[0]} variant="feature"/>{items.length>1&&<div className="muse-showcase-row">{items.slice(1).map(item=><ItemCard key={item.id} item={item} variant="tile"/>)}</div>}</div>
  :showcase.layout==='shelf'?<div className="muse-showcase-shelf" tabIndex={0} aria-label={`${showcase.title}, scroll for more`}>{items.map(item=><ItemCard key={item.id} item={item} variant="tile"/>)}</div>
  :showcase.layout==='cards'?<div className="muse-showcase-cards">{items.map(item=><ItemCard key={item.id} item={item} variant="card"/>)}</div>
  // Gallery and Mixed compose the same way: image-led tiles in a grid, then text-led items as roomy cards.
  :<div className="muse-showcase-mixed">{withArt.length>0&&<div className="muse-showcase-gallery">{withArt.map(item=><ItemCard key={item.id} item={item} variant="tile"/>)}</div>}{withoutArt.length>0&&<div className="muse-showcase-cards">{withoutArt.map(item=><ItemCard key={item.id} item={item} variant="card"/>)}</div>}</div>}
 </section>;
}
