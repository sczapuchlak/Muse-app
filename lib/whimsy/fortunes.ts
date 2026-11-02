import library from '@/content/whimsy/fortunes.json';
export type FortuneKind='cookie'|'oracle'|'prophecy'|'curiosity';
export type FortuneContent={id:string;version:number;experience:'fortunes';category:string;state:'published';title:string;body:string;metadata:{kind:FortuneKind;category:string};tags:string[];sources:{url:string;license:string;verifiedAt:string;name:string}[]};
export const fortuneLibrary=library as FortuneContent[];
export const fortuneKinds:FortuneKind[]=['cookie','oracle','prophecy','curiosity'];
export const fortuneLabels:Record<FortuneKind,string>={cookie:'Fortune Cookie',oracle:'The Oracle',prophecy:'Tiny Prophecies',curiosity:'Cabinet of Curiosities'};
export function fortuneById(id:string){return fortuneLibrary.find(item=>item.id===id);}
export function fortuneCategories(kind:FortuneKind){return [...new Set(fortuneLibrary.filter(item=>item.metadata.kind===kind).map(item=>item.metadata.category))];}
export function chooseFortune(kind:FortuneKind,exclude:string[]=[]){const pool=fortuneLibrary.filter(item=>item.metadata.kind===kind&&!exclude.includes(item.id));const source=pool.length?pool:fortuneLibrary.filter(item=>item.metadata.kind===kind);if(!source.length)throw Error('This cabinet is empty. Please try again later.');return source[Math.floor(Math.random()*source.length)];}
export function highStakesQuestion(question:string){return /\b(suicid|self.harm|emergenc|diagnos|symptom|treatment|medication|surgery|legal|lawsuit|court|invest|loan|mortgage|bankrupt|investment|stock|crypto|debt)\w*\b/i.test(question);}
export function fortuneSearch(items:FortuneContent[],query:string,category:string){const q=query.trim().toLocaleLowerCase();return items.filter(item=>(!category||item.metadata.category===category)&&(!q||[item.title,item.body,item.metadata.category,...item.tags].join(' ').toLocaleLowerCase().includes(q)));}
export function safeSourceUrl(value:string|undefined){if(!value)return null;try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}}
