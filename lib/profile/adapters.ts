/**
 * Safe sharing adapters (#26, reusable by Stream #27). Each module explicitly declares what may be shown and turns
 * one private record into a small display card containing only the fields the owner approved. Visitors only ever
 * receive that card; the record itself, its id and everything else stay private.
 *
 * Future extensions kept in scope (not yet built): selected Tarot readings, dream moments with approved
 * excerpts, and owner-approved note excerpts. Each needs its own adapter with an explicit excerpt step.
 */
import type {MuseIconName} from '@/components/MuseIcon';
import type {Book} from '@/lib/whimsy/models';
import type {QuestCompletion} from '@/lib/whimsy/models';
import type {MediaItem,Curated,CuratedMember} from '@/lib/collections/models';
import {mediaStatusLabels} from '@/lib/collections/models';
import {tarotCards} from '@/lib/whimsy/tarot';
import {dreamSymbols} from '@/lib/whimsy/dreams';
import {questById} from '@/lib/whimsy/side-quests';
import type {RitualState} from '@/lib/rituals';
import {ritualStreak} from '@/lib/rituals';
import type {SourceKind} from './model';

export type ShowcaseDisplay={kind?:string;title:string;subtitle?:string;image?:string;meta?:string[];rating?:number;progress?:number;status?:string;glyph?:string;date?:string};
export type FieldOption={id:string;label:string;default:boolean;locked?:boolean};
export type Candidate={sourceId:string;title:string;subtitle?:string;image?:string;glyph?:string;group:string};
export type SourceBundle={books:Book[];media:MediaItem[];curated:Curated[];curatedMembers:CuratedMember[];rituals:RitualState|null;questCompletions:QuestCompletion[];today:string};
export type Adapter={kind:SourceKind;label:string;icon:MuseIconName;privacy:string;fields:FieldOption[];candidates:(sources:SourceBundle)=>Candidate[];display:(sources:SourceBundle,sourceId:string,approved:string[])=>ShowcaseDisplay|null};

const https=(value:string|null|undefined)=>value&&/^https:\/\/[^\s"'<>]{3,}$/.test(value)&&value.length<=500?value:undefined;
const clip=(value:string|null|undefined,length=200)=>value?value.replace(/\s+/g,' ').trim().slice(0,length)||undefined:undefined;
const on=(approved:string[],field:string)=>approved.includes(field);
const clean=(display:ShowcaseDisplay):ShowcaseDisplay=>Object.fromEntries(Object.entries(display).filter(([,value])=>value!==undefined&&value!==null&&!(Array.isArray(value)&&!value.length))) as ShowcaseDisplay;
const bookStatus:Record<Book['status'],string>={planned:'To Be Read',reading:'Reading',finished:'Finished',paused:'Paused',dnf:'Did Not Finish'};
/** Rituals take their icon from their group. */
const ritualIcon=(s:SourceBundle,groupId:string)=>{const icon=s.rituals?.groups.find(g=>g.id===groupId)?.icon;return icon&&/^[a-z][a-z-]{1,30}$/.test(icon)?icon:'rituals';};
const kindLabel:Record<string,string>={movie:'Movies',tv:'TV',game:'Games',album:'Albums'};

export const adapters:Record<SourceKind,Adapter>={
 book:{kind:'book',label:'Books',icon:'book',privacy:'Never your reading sessions, notes or timers.',
  fields:[{id:'title',label:'Title',default:true,locked:true},{id:'author',label:'Author',default:true},{id:'cover',label:'Cover',default:true},{id:'status',label:'Reading status',default:false},{id:'progress',label:'Progress',default:false},{id:'rating',label:'My rating',default:false},{id:'finished',label:'Date finished',default:false}],
  candidates:s=>s.books.map(b=>({sourceId:b.id,title:b.title,subtitle:b.author,image:https(b.coverUrl),group:bookStatus[b.status]})),
  display:(s,id,a)=>{const b=s.books.find(x=>x.id===id);if(!b)return null;const progress=b.status==='finished'?100:b.totalPages&&b.currentPage?Math.min(100,Math.round(b.currentPage/b.totalPages*100)):undefined;
   return clean({kind:'book',title:clip(b.title)!,subtitle:on(a,'author')?clip(b.author):undefined,image:on(a,'cover')?https(b.coverUrl):undefined,status:on(a,'status')?bookStatus[b.status]:undefined,progress:on(a,'progress')?progress:undefined,rating:on(a,'rating')&&b.rating?Math.max(0,Math.min(5,b.rating)):undefined,date:on(a,'finished')&&b.finishedOn&&/^\d{4}-\d{2}-\d{2}$/.test(b.finishedOn)?b.finishedOn:undefined});}},
 media:{kind:'media',label:'Movies, TV, games & music',icon:'film',privacy:'Never your reviews, notes, tags or episode history.',
  fields:[{id:'title',label:'Title',default:true,locked:true},{id:'creator',label:'Creator or studio',default:true},{id:'cover',label:'Poster or cover',default:true},{id:'status',label:'Status',default:false},{id:'progress',label:'Progress',default:false},{id:'rating',label:'My rating',default:false}],
  candidates:s=>s.media.map(m=>({sourceId:m.id,title:m.title,subtitle:m.creator||m.developer||undefined,image:https(m.cover_url),group:kindLabel[m.kind]??'Media'})),
  display:(s,id,a)=>{const m=s.media.find(x=>x.id===id);if(!m)return null;
   return clean({kind:m.kind,title:clip(m.title)!,subtitle:on(a,'creator')?clip(m.creator||m.developer):undefined,image:on(a,'cover')?https(m.cover_url):undefined,status:on(a,'status')?mediaStatusLabels[m.kind as keyof typeof mediaStatusLabels]?.[m.status]:undefined,progress:on(a,'progress')&&m.progress_percent!=null?Math.max(0,Math.min(100,m.progress_percent)):undefined,rating:on(a,'rating')&&m.rating?m.rating:undefined});}},
 curated:{kind:'curated',label:'Curated lists',icon:'bookshelf',privacy:'Only the list’s name, description and size, never its contents.',
  fields:[{id:'title',label:'List name',default:true,locked:true},{id:'description',label:'Description',default:true},{id:'count',label:'Number of favourites',default:true}],
  candidates:s=>s.curated.map(c=>({sourceId:c.id,title:c.title,subtitle:clip(c.description,80),glyph:c.icon,group:'Your lists'})),
  display:(s,id,a)=>{const c=s.curated.find(x=>x.id===id);if(!c)return null;const count=s.curatedMembers.filter(m=>m.collection_id===c.id).length;
   return clean({kind:'curated',title:clip(c.title)!,subtitle:on(a,'description')?clip(c.description):undefined,glyph:/^[a-z][a-z-]{1,30}$/.test(c.icon)?c.icon:'sparkle',meta:on(a,'count')?[`${count} favourite${count===1?'':'s'}`]:undefined});}},
 'tarot-card':{kind:'tarot-card',label:'Tarot cards',icon:'tarot',privacy:'Only the card itself, never your readings or reflections.',
  fields:[{id:'title',label:'Card name',default:true,locked:true},{id:'art',label:'Card art',default:true},{id:'section',label:'Arcana or suit',default:true},{id:'keywords',label:'Keywords',default:false}],
  candidates:()=>tarotCards.map(c=>({sourceId:c.id,title:c.name,subtitle:c.section,image:c.artPath||undefined,group:c.section})),
  display:(_s,id,a)=>{const c=tarotCards.find(x=>x.id===id);if(!c)return null;
   return clean({kind:'tarot-card',title:c.name,subtitle:on(a,'section')?c.section:undefined,image:on(a,'art')&&c.artPath?c.artPath:undefined,meta:on(a,'keywords')?(c.keywords as string[]).slice(0,3).map(k=>clip(k,80)!):undefined});}},
 'dream-symbol':{kind:'dream-symbol',label:'Dream symbols',icon:'dreams',privacy:'Only the symbol, never your dreams or what you wrote about them.',
  fields:[{id:'title',label:'Symbol',default:true,locked:true},{id:'category',label:'Category',default:true}],
  candidates:()=>dreamSymbols.map(d=>({sourceId:d.id,title:d.name,subtitle:d.category,glyph:'dreams',group:d.category})),
  display:(_s,id,a)=>{const d=dreamSymbols.find(x=>x.id===id);if(!d)return null;return clean({kind:'dream-symbol',title:d.name,subtitle:on(a,'category')?d.category:undefined,glyph:'dreams'});}},
 ritual:{kind:'ritual',label:'Rituals',icon:'rituals',privacy:'Only the ritual’s name and the streak you choose, never your daily entries.',
  fields:[{id:'title',label:'Ritual name',default:true,locked:true},{id:'icon',label:'Icon',default:true},{id:'streak',label:'Current streak',default:true}],
  candidates:s=>(s.rituals?.rituals??[]).filter(r=>r.status!=='archived').map(r=>({sourceId:r.id,title:r.name,glyph:ritualIcon(s,r.groupId),group:s.rituals?.groups.find(g=>g.id===r.groupId)?.name??'Your rituals'})),
  display:(s,id,a)=>{const r=s.rituals?.rituals.find(x=>x.id===id);if(!r||!s.rituals)return null;const streak=ritualStreak(s.rituals,r,s.today);
   return clean({kind:'ritual',title:clip(r.name)!,glyph:on(a,'icon')?ritualIcon(s,r.groupId):'rituals',meta:on(a,'streak')&&streak.count>0?[`${streak.count} ${streak.unit.replace('scheduled ','')} streak`]:undefined});}},
 'side-quest':{kind:'side-quest',label:'Side Quests',icon:'wand',privacy:'Only quests you completed, never your weekly draws.',
  fields:[{id:'title',label:'Quest',default:true,locked:true},{id:'category',label:'Vibe',default:true},{id:'date',label:'Date completed',default:false}],
  candidates:s=>s.questCompletions.map(c=>({sourceId:c.id,title:questById(c.quest.contentId)?.title??'A side quest',subtitle:c.category,glyph:'wand',group:'Completed quests'})),
  display:(s,id,a)=>{const c=s.questCompletions.find(x=>x.id===id);const quest=c&&questById(c.quest.contentId);if(!c||!quest)return null;
   return clean({kind:'side-quest',title:clip(quest.title)!,subtitle:on(a,'category')?c.category:undefined,glyph:'wand',date:on(a,'date')?c.completedAt.slice(0,10):undefined});}},
 victory:{kind:'victory',label:'Little victories',icon:'sparkle',privacy:'Words you write yourself. Money milestones never include amounts or accounts.',
  fields:[{id:'title',label:'Victory',default:true,locked:true}],candidates:()=>[],display:()=>null},
};
export const adapterOrder:SourceKind[]=['book','media','curated','tarot-card','dream-symbol','ritual','side-quest','victory'];
export const defaultApproved=(kind:SourceKind)=>adapters[kind].fields.filter(f=>f.default||f.locked).map(f=>f.id);

/** A written victory. Money milestones are flagged and checked for amounts; nothing is linked to Money records. */
export type VictoryDraft={title:string;subtitle:string;date:string;glyph:string;money:boolean};
export const moneyAmountPattern=/[$€£¥]\s?\d|\d[\d,.]*\s?(k|K|dollars|usd|eur|gbp)\b|\d{3,}/;
export function victoryDisplay(draft:VictoryDraft):ShowcaseDisplay{
 return clean({kind:draft.money?'money-milestone':'victory',title:clip(draft.title)!,subtitle:clip(draft.subtitle),date:/^\d{4}-\d{2}-\d{2}$/.test(draft.date)?draft.date:undefined,glyph:/^[a-z][a-z-]{1,30}$/.test(draft.glyph)?draft.glyph:'sparkle',status:draft.money?'Financial milestone':undefined});
}
/** True when a fresh snapshot from the source would differ from what is published. */
export const displayChanged=(published:ShowcaseDisplay,fresh:ShowcaseDisplay|null)=>!!fresh&&JSON.stringify(fresh)!==JSON.stringify(clean(published));
