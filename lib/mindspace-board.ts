/**
 * Mindspace board arrangement (#98): the person's own card order and sizes, custom tag colors and a few board
 * settings, kept in one owner-only document (`notes_board`). Cards and their content are never changed here; a
 * missing or stale entry simply falls back to the default layout.
 */
import type {createMuseBrowserClient} from '@/lib/supabase/client';
import type {Json} from '@/lib/database.types';
import {parsePaint,type Paint} from '@/lib/planner-customization';
import type {BoardCard} from '@/lib/constellation-board';

type Client=ReturnType<typeof createMuseBrowserClient>;
export const cardSizes=[{id:'standard',label:'Standard'},{id:'wide',label:'Wide'},{id:'tall',label:'Tall'},{id:'large',label:'Large'}] as const;
export type CardSize=typeof cardSizes[number]['id'];
export type BoardSettings={showDates:boolean;compactText:boolean};
export type BoardLayout={order:string[];sizes:Record<string,CardSize>;tagPaints:Record<string,Paint>;settings:BoardSettings};
export const defaultBoardSettings:BoardSettings={showDates:true,compactText:false};
export const emptyBoardLayout=():BoardLayout=>({order:[],sizes:{},tagPaints:{},settings:{...defaultBoardSettings}});
const idOk=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f-]{8,64}$/i.test(v);

export function parseBoardLayout(value:unknown):BoardLayout{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{},out=emptyBoardLayout();
 if(Array.isArray(v.order))out.order=[...new Set(v.order.filter(idOk))].slice(0,1000);
 if(v.sizes&&typeof v.sizes==='object')for(const [id,size] of Object.entries(v.sizes as Record<string,unknown>))if(idOk(id)&&cardSizes.some(s=>s.id===size)&&size!=='standard')out.sizes[id]=size as CardSize;
 if(v.tagPaints&&typeof v.tagPaints==='object')for(const [id,p] of Object.entries(v.tagPaints as Record<string,unknown>)){const paint=parsePaint(p);if(idOk(id)&&paint)out.tagPaints[id]=paint;}
 const s=v.settings&&typeof v.settings==='object'?v.settings as Record<string,unknown>:{};
 out.settings={showDates:typeof s.showDates==='boolean'?s.showDates:true,compactText:s.compactText===true};
 return out;
}
/** Your arrangement: cards in the saved order; cards not placed yet (new ones) come first, newest first. */
export function arrange<T extends Pick<BoardCard,'id'|'createdAt'>>(cards:T[],order:string[]):T[]{
 const index=new Map(order.map((id,i)=>[id,i]));
 const placed=cards.filter(c=>index.has(c.id)).sort((a,b)=>index.get(a.id)!-index.get(b.id)!);
 const fresh=cards.filter(c=>!index.has(c.id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 return [...fresh,...placed];
}
/** Move one card to a new index within the currently shown order; returns the full saved order. */
export function moveCard(shown:string[],saved:string[],id:string,to:number){
 const list=shown.filter(x=>x!==id),at=Math.max(0,Math.min(list.length,to));list.splice(at,0,id);
 const rest=saved.filter(x=>!list.includes(x));
 return [...list,...rest];
}
/** An independent copy: new ids for the card and its checklist items; images stay with the original card. */
export function duplicateCard(card:BoardCard,id:string,now:string,itemId:()=>string=()=>crypto.randomUUID()):BoardCard{
 const {reminder,accent,...rest}=card;
 return {...rest,id,title:card.title?`${card.title} (copy)`.slice(0,250):card.title,items:card.items.map(i=>({...i,id:itemId()})),images:[],tagIds:[...card.tagIds],pinned:false,createdAt:now,updatedAt:now,
  ...(accent?{accent}:{}),...(reminder?{reminder:{...reminder}}:{})};
}

export async function readBoardLayout(client:Client):Promise<{layout:BoardLayout;revision:number}>{
 const {data,error}=await client.from('notes_board').select('layout,revision').maybeSingle();
 if(error)throw error;return data?{layout:parseBoardLayout(data.layout),revision:data.revision}:{layout:emptyBoardLayout(),revision:0};
}
export async function saveBoardLayout(client:Client,layout:BoardLayout,revision:number):Promise<{layout:BoardLayout;revision:number}>{
 const row={layout:parseBoardLayout(layout) as unknown as NonNullable<Json>};
 const r=revision===0?await client.from('notes_board').insert(row).select('layout,revision').single()
  :await client.from('notes_board').update(row).eq('revision',revision).select('layout,revision').maybeSingle();
 if(r.error)throw r.error;if(!r.data)throw Error('Your board changed on another device. Reload to see it.');
 return {layout:parseBoardLayout(r.data.layout),revision:r.data.revision};
}
