/**
 * Stream source adapters (#27). Each turns one of the author's own saved records into the small, privacy-safe
 * snapshot they approve, at the moment they share it. Books, media, rituals and side quests reuse the Showcase
 * adapters (#26). Moods, dreams and tarot readings are Stream-specific: private writing (reflections, dream
 * narratives, journal notes) is never copied automatically; only text the author types or trims here is shared.
 */
import {recordedFeeling,type FeelingSnapshot} from '../feelings';
import {adapters as showcaseAdapters,type FieldOption,type ShowcaseDisplay,type SourceBundle} from '@/lib/profile/adapters';
import type {MuseIconName} from '@/components/MuseIcon';
import type {DreamEntry,TarotReading,FortuneAssignment,SavedDiscovery} from '@/lib/whimsy/models';
import {fortuneById,fortuneLabels} from '@/lib/whimsy/fortunes';
import type {NatalChart} from '@/lib/astrology/models';
import type {CreditCard,MoneyBill} from '@/lib/money';
import {tarotCards,tarotSpreads} from '@/lib/whimsy/tarot';
import {dreamSymbols} from '@/lib/whimsy/dreams';
import {emotionCatalog} from '@/lib/emotions';
import type {StreamSourceKind} from './model';
import type {ReadingSession} from '@/lib/whimsy/models';
import {activeSeconds} from '@/lib/whimsy/books';
import type {Episode,MediaActivity,Season} from '@/lib/collections/models';
import type {Aspiration,AspirationUpdate} from '@/lib/aspirations/models';
import {aspirationProgress,milestoneProgress} from '@/lib/aspirations/progress';

export type StreamMood={id:string;date:string;period:'morning'|'evening';emotionIds:string[];feelings?:FeelingSnapshot[]};
export type StreamBundle=SourceBundle&{moods:StreamMood[];dreams:DreamEntry[];tarot:TarotReading[];fortunes:FortuneAssignment[];saved:SavedDiscovery[];
 chart:{id:string;payload:NatalChart}|null;cards:CreditCard[];bills:MoneyBill[];
 /** #69: moments behind books and TV, and aspirations. Optional so older callers keep working. */
 sessions?:ReadingSession[];episodes?:Episode[];seasons?:Season[];activity?:MediaActivity[];aspirations?:Aspiration[];aspirationUpdates?:AspirationUpdate[]};
export type StreamDisplay=ShowcaseDisplay&{excerpt?:string};
/** Words the author writes (or trims) in the composer for this record. */
export type TextField={id:'note'|'summary'|'excerpt';label:string;hint:string;max:number;seed?:(b:StreamBundle,id:string)=>string};
export type StreamCandidate={sourceId:string;title:string;subtitle?:string;image?:string;glyph?:string;group:string};
export type StreamAdapter={kind:StreamSourceKind;label:string;icon:MuseIconName;privacy:string;fields:FieldOption[];texts:TextField[];
 candidates:(b:StreamBundle)=>StreamCandidate[];display:(b:StreamBundle,id:string,approved:string[],text:Partial<Record<TextField['id'],string>>)=>StreamDisplay|null};

const clip=(value:string|null|undefined,length=200)=>value?value.replace(/\s+/g,' ').trim().slice(0,length)||undefined:undefined;
const clean=(d:StreamDisplay):StreamDisplay=>Object.fromEntries(Object.entries(d).filter(([,v])=>v!==undefined&&v!==null&&v!==''&&!(Array.isArray(v)&&!v.length))) as StreamDisplay;
const on=(approved:string[],field:string)=>approved.includes(field);
/** A feeling as that check-in recorded it (custom feelings and personal interpretations included). */
const feelingOf=(m:{feelings?:FeelingSnapshot[]},id:string)=>recordedFeeling(id,m.feelings,emotionCatalog);
const emotionName=(m:{feelings?:FeelingSnapshot[]},id:string)=>feelingOf(m,id)?.name;
const day=(iso:string)=>new Date(`${iso.slice(0,10)}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const cap=(v:string)=>v.charAt(0).toUpperCase()+v.slice(1);
function savedFortune(b:StreamBundle,sv:SavedDiscovery){const a=b.fortunes.find(x=>x.id===sv.assignmentId);const content=a&&fortuneById(a.content.contentId);
 const title=sv.snapshot?.title??content?.title,body=sv.snapshot?.body??content?.body;if(!title)return null;return {title,body:body??'',label:a?fortuneLabels[a.kind]:'Fortunes'};}
/** A Showcase adapter plus Stream-only "moment" fields that add up to two short lines from existing records. */
function withMoments(kind:'book'|'media',extra:FieldOption[],privacy:string,moments:(b:StreamBundle,id:string,approved:string[])=>string[]):StreamAdapter{
 const a=showcaseAdapters[kind];
 return {kind,label:a.label,icon:a.icon,privacy,fields:[...a.fields,...extra],texts:[],candidates:b=>a.candidates(b),
  display:(b,id,approved)=>{const d=a.display(b,id,approved);if(!d)return null;const meta=[...(d.meta??[]),...moments(b,id,approved)].slice(0,4);return clean({...d,meta});}};
}
const reuse=(kind:'book'|'media'|'ritual'|'side-quest'):StreamAdapter=>{const a=showcaseAdapters[kind];
 return {kind,label:a.label,icon:a.icon,privacy:a.privacy,fields:a.fields,texts:[],candidates:b=>a.candidates(b),display:(b,id,approved)=>a.display(b,id,approved)};};

export const streamAdapters:Record<StreamSourceKind,StreamAdapter>={
 book:withMoments('book',[{id:'started',label:'The day I started',default:false},{id:'session',label:'My latest reading session (pages and time)',default:false}],
  'Never your notes, timers or session history. Your latest session’s pages and time only if you tick it.',(b,id,a)=>{const book=b.books.find(x=>x.id===id);if(!book)return [];const out:string[]=[];
   if(on(a,'started')&&book.startedOn)out.push(`Started ${day(book.startedOn)}`);
   if(on(a,'session')){const last=(b.sessions??[]).filter(x=>x.bookId===id).sort((x,y)=>y.date.localeCompare(x.date))[0];
    if(last){const min=Math.round(activeSeconds(last.activeSegments)/60);const parts=[last.pages?`${last.pages} page${last.pages===1?'':'s'}`:null,min?`${min} min`:null].filter(Boolean);if(parts.length)out.push(`Read ${parts.join(' · ')} on ${day(last.date)}`);}}
   return out;}),
 media:withMoments('media',[{id:'episode',label:'My latest episode (season and number)',default:false},{id:'episode-title',label:'Its episode title (may be a spoiler)',default:false},{id:'season',label:'Latest season I finished',default:false}],
  'Never your reviews, notes, tags or watch history. Episode and season details only if you tick them.',(b,id,a)=>{const out:string[]=[];
   if(on(a,'episode')){const ids=new Set((b.episodes??[]).filter(e=>e.show_id===id).map(e=>e.id));
    const last=(b.activity??[]).filter(x=>x.media_id===id&&x.episode_id&&ids.has(x.episode_id)).sort((x,y)=>y.activity_date.localeCompare(x.activity_date))[0];
    const ep=last&&(b.episodes??[]).find(e=>e.id===last.episode_id);
    if(ep)out.push(clip(`Watched S${ep.season_number} · E${ep.episode_number}${on(a,'episode-title')&&ep.title?` “${ep.title}”`:''}`,80)!);}
   if(on(a,'season')){const done=(b.seasons??[]).filter(x=>x.show_id===id&&x.watched).sort((x,y)=>y.season_number-x.season_number)[0];if(done)out.push(`Finished season ${done.season_number}`);}
   return out;}),
 ritual:reuse('ritual'),'side-quest':reuse('side-quest'),
 aspiration:{kind:'aspiration',label:'Aspirations',icon:'sparkle',privacy:'Only the name and what you tick. Never your why, notes, journal or reflection unless you write a line here.',
  fields:[{id:'title',label:'Aspiration',default:true,locked:true},{id:'progress',label:'Progress',default:true},{id:'milestones',label:'Milestones done',default:false},{id:'category',label:'Category',default:false},{id:'finished',label:'Date finished',default:false}],
  texts:[{id:'excerpt',label:'A few words (optional)',hint:'Starts empty. Use “Start from my reflection” to copy it in, then trim.',max:280,seed:(b,id)=>b.aspirations?.find(x=>x.id===id)?.reflection??''}],
  candidates:b=>(b.aspirations??[]).filter(x=>x.status!=='archived').map(x=>({sourceId:x.id,title:clip(x.title,80)!,subtitle:x.status==='completed'&&x.completedOn?`Finished ${day(x.completedOn)}`:x.category,glyph:x.status==='completed'?'trophy':'sparkle',group:x.status==='completed'?'Finished':'In progress'})),
  display:(b,id,approved,text)=>{const x=b.aspirations?.find(y=>y.id===id);if(!x)return null;
   const p=x.progressKind==='connected'?null:aspirationProgress(x,{updates:b.aspirationUpdates??[],today:b.today});const m=milestoneProgress(x);
   const meta=[on(approved,'milestones')&&m.total?`${m.done} of ${m.total} milestones`:null,on(approved,'category')?clip(x.category,80):null].filter((v):v is string=>!!v);
   return clean({kind:'aspiration',title:clip(x.title)!,status:x.status==='completed'?'Finished':x.status==='paused'?'Paused':'In progress',
    progress:on(approved,'progress')&&p?.percent!=null?Math.round(p.percent):undefined,meta,excerpt:clip(text.excerpt,280),glyph:x.status==='completed'?'trophy':'sparkle',
    date:on(approved,'finished')&&x.completedOn?x.completedOn:undefined});}},
 mood:{kind:'mood',label:'Mood check-ins',icon:'mood',privacy:'Only the feelings you pick and a line you write. Never your reflection or influences.',
  // Each emotion is its own approvable field, so mixed feelings stay mixed and nothing is shared by default beyond what you tick.
  fields:[{id:'date',label:'Date',default:true}],
  texts:[{id:'note',label:'A short line (optional)',hint:'In your own words. Your mood reflection is never shared.',max:200}],
  candidates:b=>b.moods.filter(m=>m.emotionIds.length).map(m=>({sourceId:m.id,title:m.emotionIds.map(id=>emotionName(m,id)).filter(Boolean).slice(0,4).join(', '),subtitle:`${m.period==='morning'?'Morning':'Evening'} · ${day(m.date)}`,glyph:'mood',group:'Recent check-ins'})),
  display:(b,id,approved,text)=>{const m=b.moods.find(x=>x.id===id);if(!m)return null;
   const names=m.emotionIds.filter(e=>on(approved,`emotion:${e}`)).map(id=>emotionName(m,id)).filter((n):n is string=>!!n).slice(0,4);if(!names.length)return null;
   return clean({kind:'mood',title:names.join(' & '),meta:names.length>1?names:undefined,subtitle:clip(text.note),glyph:'mood',date:on(approved,'date')?m.date:undefined});}},
 dream:{kind:'dream',label:'Dream Diary',icon:'dreams',privacy:'Only what you choose: the title, symbols, a summary or an excerpt you trim. The full dream stays private.',
  fields:[{id:'title',label:'Dream title',default:true},{id:'symbols',label:'Symbols',default:true},{id:'date',label:'Date',default:false}],
  texts:[{id:'summary',label:'Summary (optional)',hint:'A sentence or two in your own words.',max:200},
   {id:'excerpt',label:'Excerpt (optional)',hint:'Paste or trim the part you want to share. Nothing is filled in for you.',max:280}],
  candidates:b=>b.dreams.map(d=>({sourceId:d.id,title:clip(d.title,80)??`A dream from ${day(d.loggedAt)}`,subtitle:day(d.loggedAt),glyph:'dreams',group:'Dream Diary'})),
  display:(b,id,approved,text)=>{const d=b.dreams.find(x=>x.id===id);if(!d)return null;
   const symbols=on(approved,'symbols')?d.symbolIds.map(s=>dreamSymbols.find(x=>x.id===s)?.name).filter((n):n is string=>!!n).slice(0,4):[];
   return clean({kind:'dream',title:(on(approved,'title')&&clip(d.title))||'A dream',meta:symbols,subtitle:clip(text.summary),excerpt:clip(text.excerpt,280),glyph:'dreams',date:on(approved,'date')?d.loggedAt.slice(0,10):undefined});}},
 fortune:{kind:'fortune',label:'Saved fortunes & curiosities',icon:'favorite',privacy:'The fortune itself. Your response and notes stay private unless you tick them.',
  fields:[{id:'title',label:'Fortune',default:true,locked:true},{id:'kind',label:'Where it came from',default:true},{id:'note',label:'My note or response',default:false}],
  texts:[],
  candidates:b=>b.saved.map((sv):StreamCandidate|null=>{const f=savedFortune(b,sv);return f?{sourceId:sv.id,title:clip(f.title,80)!,subtitle:clip(f.body,90),glyph:'favorite',group:f.label}:null;}).filter((c):c is StreamCandidate=>!!c),
  display:(b,id,approved)=>{const sv=b.saved.find(x=>x.id===id);const f=sv&&savedFortune(b,sv);if(!sv||!f)return null;
   return clean({kind:'fortune',title:clip(f.title)!,subtitle:on(approved,'kind')?f.label:undefined,excerpt:on(approved,'note')?clip(sv.note||sv.response,280)??clip(f.body,280):clip(f.body,280),glyph:'favorite'});}},
 astrology:{kind:'astrology',label:'Chart placements',icon:'orbit',privacy:'Only the signs you tick. Never your birth date, time, place, degrees, houses or notes.',
  fields:[{id:'sun',label:'Sun sign',default:true},{id:'moon',label:'Moon sign',default:false},{id:'rising',label:'Rising sign',default:false}],
  texts:[],
  candidates:b=>b.chart?[{sourceId:b.chart.id,title:'My natal chart placements',subtitle:'Sun, Moon and Rising',glyph:'orbit',group:'Observatory'}]:[],
  display:(b,id,approved)=>{const c=b.chart;if(!c||c.id!==id)return null;
   // Charts name bodies 'Sun', 'Moon'…; match case-insensitively so a stored chart always resolves.
   const sign=(body:string)=>c.payload.placements.find(p=>String(p.body).toLowerCase()===body);
   const parts=[on(approved,'sun')&&sign('sun')&&!sign('sun')!.uncertain?`${cap(sign('sun')!.sign)} Sun`:null,on(approved,'moon')&&sign('moon')&&!sign('moon')!.uncertain?`${cap(sign('moon')!.sign)} Moon`:null,
    on(approved,'rising')&&c.payload.ascendant&&c.payload.ascendant.possibleSigns.length<=1?`${cap(c.payload.ascendant.sign)} Rising`:null].filter((x):x is string=>!!x);
   if(!parts.length)return null;return clean({kind:'astrology',title:parts.join(' · '),glyph:'orbit'});}},
 'money-milestone':{kind:'money-milestone',label:'Money milestones',icon:'money',privacy:'A fixed headline only. Never names, amounts, balances, limits, APR, accounts or transactions.',
  fields:[{id:'title',label:'Milestone',default:true,locked:true},{id:'date',label:'Date',default:false}],
  texts:[],
  candidates:b=>[...b.bills.filter(x=>x.paid).map(x=>({sourceId:x.id,title:'Paid a bill on time',subtitle:'Shown without its name or amount',glyph:'trophy',group:'Bills'})),
   ...b.cards.filter(c=>c.balanceCents<=0).map(c=>({sourceId:c.id,title:'Paid off a credit card',subtitle:'Shown without the card’s name or balance',glyph:'trophy',group:'Cards'}))],
  display:(b,id,approved)=>{const bill=b.bills.find(x=>x.id===id&&x.paid);const card=b.cards.find(x=>x.id===id&&x.balanceCents<=0);if(!bill&&!card)return null;
   return clean({kind:'money-milestone',title:bill?'Paid a bill on time':'Paid off a credit card',glyph:'trophy',date:on(approved,'date')&&bill?bill.dueDate:undefined});}},
 'tarot-reading':{kind:'tarot-reading',label:'Tarot readings',icon:'tarot',privacy:'Only the cards, the spread and words you approve. Your question and journal stay private.',
  fields:[{id:'cards',label:'Cards',default:true,locked:true},{id:'spread',label:'Spread',default:true},{id:'art',label:'Card art',default:true},{id:'date',label:'Date',default:false}],
  texts:[{id:'excerpt',label:'Reflection (optional)',hint:'Starts empty. Use “Start from my reflection” to copy it in, then trim.',max:280,seed:(b,id)=>b.tarot.find(t=>t.id===id)?.reflection??''}],
  candidates:b=>b.tarot.map(t=>({sourceId:t.id,title:t.cards.map(c=>tarotCards.find(x=>x.id===c.card.contentId)?.name).filter(Boolean).slice(0,3).join(' · ')||'A reading',
   subtitle:`${tarotSpreads.find(s=>s.id===t.spreadId)?.name??'Reading'} · ${day(t.readAt)}`,image:tarotCards.find(x=>x.id===t.cards[0]?.card.contentId)?.artPath||undefined,group:'Reading Journal'})),
  display:(b,id,approved,text)=>{const t=b.tarot.find(x=>x.id===id);if(!t)return null;
   const cards=t.cards.map(c=>{const card=tarotCards.find(x=>x.id===c.card.contentId);return card?`${card.name}${c.orientation==='reversed'?' (reversed)':''}`:null;}).filter((n):n is string=>!!n);
   if(!cards.length)return null;const first=tarotCards.find(x=>x.id===t.cards[0].card.contentId);
   return clean({kind:'tarot-reading',title:clip(cards.slice(0,3).join(' · '))!,meta:cards.length>3?cards.slice(0,4):undefined,subtitle:on(approved,'spread')?tarotSpreads.find(s=>s.id===t.spreadId)?.name:undefined,
    image:on(approved,'art')&&first?.artPath?first.artPath:undefined,excerpt:clip(text.excerpt,280),glyph:'tarot',date:on(approved,'date')?t.readAt.slice(0,10):undefined});}},
};

/** Approvable fields, expanding a mood's emotions into one checkbox each (all ticked to start; untick to keep private). */
export function fieldsFor(kind:StreamSourceKind,bundle:StreamBundle,sourceId:string):FieldOption[]{
 const base=streamAdapters[kind].fields;
 // Episode and season moments only apply to TV shows.
 if(kind==='media'){const item=bundle.media.find(m=>m.id===sourceId);return item?.kind==='tv'?base:base.filter(f=>!['episode','episode-title','season'].includes(f.id));}
 if(kind==='book'){const hasSession=(bundle.sessions??[]).some(x=>x.bookId===sourceId),book=bundle.books.find(b=>b.id===sourceId);return base.filter(f=>(f.id!=='session'||hasSession)&&(f.id!=='started'||!!book?.startedOn));}
 if(kind!=='mood')return base;
 const mood=bundle.moods.find(m=>m.id===sourceId);
 return [...(mood?.emotionIds??[]).slice(0,4).map(e=>({id:`emotion:${e}`,label:emotionName(mood!,e)??'Feeling',default:true})),...base];
}
/** Starting selection. Sensitive records start with only their locked fields: everything else is ticked deliberately. */
export const defaultApprovedFor=(kind:StreamSourceKind,bundle:StreamBundle,sourceId:string)=>fieldsFor(kind,bundle,sourceId).filter(f=>f.locked||(f.default&&!sensitiveKinds.includes(kind))).map(f=>f.id);

/** A mood's tone from its emotions: all pleasant → Share Joy, all unpleasant → Send Love, mixed → neutral React. */
export function moodTone(bundle:StreamBundle,sourceId:string,approved:string[]):'love'|'joy'|'react'{
 const mood=bundle.moods.find(m=>m.id===sourceId);if(!mood)return 'react';
 const quadrants=mood.emotionIds.filter(e=>approved.includes(`emotion:${e}`)).map(e=>feelingOf(mood,e)?.quadrant).filter(Boolean);
 if(!quadrants.length)return 'react';
 const pleasant=quadrants.filter(q=>q==='green'||q==='yellow').length;
 return pleasant===quadrants.length?'joy':pleasant===0?'love':'react';
}
/** Fields that are sensitive by nature: never preselected, always deliberately ticked. */
export const sensitiveKinds:StreamSourceKind[]=['mood','dream','tarot-reading','astrology','money-milestone'];
