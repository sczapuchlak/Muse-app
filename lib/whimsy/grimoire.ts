import majorOne from '@/content/whimsy/grimoire/source/major-batch-01-DRAFT.json';
import majorTwo from '@/content/whimsy/grimoire/source/major-batch-02-DRAFT.json';
import majorThree from '@/content/whimsy/grimoire/source/major-batch-03-DRAFT.json';
import wands from '@/content/whimsy/grimoire/source/wands-batch-01-DRAFT.json';
import cups from '@/content/whimsy/grimoire/source/cups-batch-01-DRAFT.json';
import swords from '@/content/whimsy/grimoire/source/swords-batch-01-DRAFT.json';
import pentacles from '@/content/whimsy/grimoire/source/pentacles-batch-01-DRAFT.json';
import swordsEditorial from '@/content/whimsy/grimoire/overlays/swords-editorial-v1.json';
import {tarotCards} from './tarot';

export const grimoireChapters=[
 {id:'story',label:'The Story'},
 {id:'symbolism',label:'Symbolism'},
 {id:'meanings',label:'Meanings'},
 {id:'inYourLife',label:'In Your Life'},
 {id:'hiddenKnowledge',label:'Hidden Knowledge'},
 {id:'reflection',label:'Reflection'},
] as const;
export type GrimoireChapterId=typeof grimoireChapters[number]['id'];
type SourceCard=Record<string,unknown>;
const sources=[majorOne,majorTwo,majorThree,wands,cups,swords,pentacles] as const;
const canonicalByName=new Map(tarotCards.map(card=>[card.name,card]));
const canonicalById=new Map(tarotCards.map(card=>[card.id,card]));
export type GrimoireEditorialOverlay={id:string;uprightKeywords:string[];reversedKeywords:string[];relatedCards:{id:string;rationale:string;kind:string}[];reviewStatus:string};
const overlayById=new Map<string,GrimoireEditorialOverlay>();
for(const row of swordsEditorial.cards){
 if(overlayById.has(row.id)||!row.id.startsWith('tarot-swords-')||!canonicalById.has(row.id))throw Error(`Invalid Swords overlay identity: ${row.id}`);
 if(!row.uprightKeywords.length||!row.reversedKeywords.length||row.relatedCards.some(related=>!canonicalById.has(related.id)||!related.rationale.trim()))throw Error(`Incomplete Swords overlay: ${row.id}`);
 overlayById.set(row.id,{...row,reviewStatus:swordsEditorial.status});
}
if(overlayById.size!==14)throw Error('Swords overlay must cover the 14 canonical cards');
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const string=(value:unknown)=>typeof value==='string'?value:'';
const chapterTitle:Record<string,GrimoireChapterId>={'The Story':'story',Symbolism:'symbolism',Meanings:'meanings','In Your Life':'inYourLife','Hidden Knowledge':'hiddenKnowledge',Reflection:'reflection'};
export type GrimoireEntry={id:string;sourceId:string;name:string;subtitle:string;section:string;artPath:string;editorialStatus:string;candidateVersion:number;chapters:Record<GrimoireChapterId,unknown>;raw:SourceCard;editorialOverlay?:GrimoireEditorialOverlay};
export function normalizeGrimoireCard(raw:SourceCard):GrimoireEntry{
 const sourceId=string(raw.id),name=string(raw.name),canonical=canonicalById.get(sourceId)??canonicalByName.get(name);
 if(!canonical||canonical.name!==name)throw Error(`Unknown Tarot identity: ${sourceId} / ${name}`);
 const sourceChapters=raw.chapters,chapters={} as Record<GrimoireChapterId,unknown>;
 if(Array.isArray(sourceChapters))for(const chapter of sourceChapters){const value=record(chapter),id=chapterTitle[string(value.title)];if(!id||chapters[id])throw Error(`Unknown or duplicate chapter for ${sourceId}`);chapters[id]=chapter;}
 else{const value=record(sourceChapters);for(const {id} of grimoireChapters)chapters[id]=value[id]??(id==='inYourLife'?value.life:undefined);}
 for(const {id} of grimoireChapters)if(!chapters[id])throw Error(`Missing ${id} chapter for ${sourceId}`);
 const story=record(chapters.story);
 return {id:canonical.id,sourceId,name,subtitle:string(raw.subtitle)||string(story.subtitle),section:canonical.section,artPath:canonical.artPath,editorialStatus:string(raw.editorialStatus),candidateVersion:Number(raw.candidateVersion),chapters,raw,editorialOverlay:overlayById.get(canonical.id)};
}
export const grimoireEntries:GrimoireEntry[]=sources.flatMap(batch=>(batch.cards as unknown as SourceCard[]).map(normalizeGrimoireCard));
export const grimoireById=(id:string)=>grimoireEntries.find(entry=>entry.id===id);
export function grimoireSearchText(entry:GrimoireEntry){return JSON.stringify([entry.name,entry.subtitle,entry.chapters,entry.raw.keywords,entry.raw.uprightKeywords,entry.raw.reversedKeywords,entry.editorialOverlay?.uprightKeywords,entry.editorialOverlay?.reversedKeywords]).toLocaleLowerCase();}
export function grimoireEntryHref(id:string,options:{from?:'grimoire'|'reading'|'journal'|'study';orientation?:'upright'|'reversed';q?:string;section?:string;reading?:string}={}){
 const query=new URLSearchParams();if(options.from)query.set('from',options.from);if(options.orientation)query.set('orientation',options.orientation);if(options.q)query.set('q',options.q);if(options.section&&options.section!=='All')query.set('section',options.section);if(options.reading)query.set('reading',options.reading);return `/whimsy/tarot/${encodeURIComponent(id)}${query.size?`?${query}`:''}`;
}
