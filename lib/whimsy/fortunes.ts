import library from '@/content/whimsy/fortunes.json';
import type {AccentColor} from '@/lib/appearance-values';
export type FortuneKind='cookie'|'oracle'|'prophecy'|'curiosity';
export type FortuneContent={id:string;version:number;experience:'fortunes';category:string;state:'published';title:string;body:string;metadata:{kind:FortuneKind;category:string};tags:string[];sources:{url:string;license:string;verifiedAt:string;name:string}[]};
export const fortuneLibrary=library as FortuneContent[];
export const fortuneKinds:FortuneKind[]=['cookie','oracle','prophecy','curiosity'];
export const fortuneLabels:Record<FortuneKind,string>={cookie:'Fortune Cookie',oracle:'The Oracle',prophecy:'Tiny Prophecies',curiosity:'Cabinet of Curiosities'};
// Decorative category identity stays consistent across drawers, results, filters and keepsakes.
export const curiosityCategoryAccents:Record<string,AccentColor>={
 'Scientific Oddities':'#00bcd4',
 'Natural Wonders':'#28b873',
 'Strange Animals':'#f062a6',
 'Peculiar History':'#a477ee',
 'Unusual Inventions':'#ef8a36',
 'Art & Culture':'#d7ad35',
 'Curious Words':'#4b98ed',
 'Delightfully Bizarre Facts':'#dc4adc',
};
export const curiosityBatchSize=12;
export function curiosityPage(query:string,category:string,limit=curiosityBatchSize){
 const matches=fortuneSearch(fortuneLibrary.filter(item=>item.metadata.kind==='curiosity'),query,category);
 return {items:matches.slice(0,limit),total:matches.length};
}
export function fortuneById(id:string){return fortuneLibrary.find(item=>item.id===id);}
export function fortuneCategories(kind:FortuneKind){return [...new Set(fortuneLibrary.filter(item=>item.metadata.kind===kind).map(item=>item.metadata.category))];}
export function chooseFortune(kind:FortuneKind,exclude:string[]=[]){const pool=fortuneLibrary.filter(item=>item.metadata.kind===kind&&!exclude.includes(item.id));const source=pool.length?pool:fortuneLibrary.filter(item=>item.metadata.kind===kind);if(!source.length)throw Error('This cabinet is empty. Please try again later.');return source[Math.floor(Math.random()*source.length)];}
export function highStakesQuestion(question:string){return /\b(suicid|self.harm|emergenc|diagnos|symptom|treatment|medication|surgery|legal|lawsuit|court|invest|loan|mortgage|bankrupt|investment|stock|crypto|debt)\w*\b/i.test(question);}
export function fortuneSearch(items:FortuneContent[],query:string,category:string){const q=query.trim().toLocaleLowerCase();return items.filter(item=>(!category||item.metadata.category===category)&&(!q||[item.title,item.body,item.metadata.category,...item.tags].join(' ').toLocaleLowerCase().includes(q)));}
export function safeSourceUrl(value:string|undefined){if(!value)return null;try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}}
