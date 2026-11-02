import {isNoteAccent,noteAccents,type NoteAccent} from './mindspace';
import {todayInTimeZone} from './dates';
export type BoardItem={id:string;text:string;complete:boolean};
export type BoardImage={id:string;path:string;thumbnailPath:string;name:string;alt:string;width:number;height:number;mime:string};
export type BoardReminder={date:string;time?:string;timeZone:string};
export type BoardCard={id:string;title:string;text:string;items:BoardItem[];images:BoardImage[];tagIds:string[];accent?:NoteAccent;reminder?:BoardReminder;pinned:boolean;createdAt:string;updatedAt:string};
export type BoardTag={id:string;name:string;color?:NoteAccent};
export type BoardState={cards:BoardCard[];tags:BoardTag[]};
export const emptyBoard=():BoardState=>({cards:[],tags:[]});
export const newBoardCard=(id:string,now:string):BoardCard=>({id,title:'',text:'',items:[],images:[],tagIds:[],pinned:false,createdAt:now,updatedAt:now});
export function primaryTag(state:BoardState,card:BoardCard){return card.tagIds.map(id=>state.tags.find(tag=>tag.id===id)).find((tag):tag is BoardTag=>!!tag);}
export function tagColor(tag:BoardTag){if(tag.color)return tag.color;const hash=[...tag.name].reduce((value,char)=>((value*31)+char.codePointAt(0)!)>>>0,0);return noteAccents[hash%noteAccents.length];}
export function reminderStatus(reminder:BoardReminder|undefined,now:Date){if(!reminder)return 'none';const today=todayInTimeZone(reminder.timeZone,now),currentTime=new Intl.DateTimeFormat('en-GB',{timeZone:reminder.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);if(reminder.date<today||reminder.date===today&&!!reminder.time&&reminder.time<currentTime)return 'due';if(reminder.date===today)return 'today';return 'upcoming';}
export const hashtag=(raw:string)=>raw.trim().replace(/^#+/,'').trim().normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/g,'-').replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,40);
export function inlineHashtags(text:string){return [...new Set([...text.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu)].map(m=>hashtag(m[1])).filter(Boolean))];}
export type BoardAction={type:'card/save';card:BoardCard}|{type:'card/update';id:string;patch:Partial<Omit<BoardCard,'id'|'createdAt'>>}|{type:'card/delete';id:string}|{type:'tag/save';tag:BoardTag}|{type:'tag/delete';id:string};
export function boardReducer(state:BoardState,action:BoardAction):BoardState{
 if(action.type==='tag/save'){const name=hashtag(action.tag.name);if(!name||action.tag.color&&!isNoteAccent(action.tag.color)||state.tags.some(t=>t.id!==action.tag.id&&t.name===name))return state;return {...state,tags:state.tags.some(t=>t.id===action.tag.id)?state.tags.map(t=>t.id===action.tag.id?{...t,...action.tag,name}:t):[...state.tags,{...action.tag,name}]};}
 if(action.type==='tag/delete')return {tags:state.tags.filter(t=>t.id!==action.id),cards:state.cards.map(c=>({...c,tagIds:c.tagIds.filter(id=>id!==action.id)}))};
 if(action.type==='card/delete')return {...state,cards:state.cards.filter(c=>c.id!==action.id)};
 if(action.type==='card/save')return state.cards.some(c=>c.id===action.card.id)?state:{...state,cards:[...state.cards,action.card]};
 if(action.patch.accent!==undefined&&!isNoteAccent(action.patch.accent))return state;
 return {...state,cards:state.cards.map(c=>c.id===action.id?{...c,...action.patch}:c)};
}
export type BoardLayout='masonry'|'compact'|'list'|'date'|'tag';
export type BoardFilter={query:string;tagIds:string[];kind:'all'|'text'|'checklist'|'image';reminders:boolean;pinned:boolean;sort:'updated'|'newest'|'oldest'|'pinned';layout:BoardLayout};
export const defaultBoardFilter:BoardFilter={query:'',tagIds:[],kind:'all',reminders:false,pinned:false,sort:'newest',layout:'masonry'};
export function boardCards(state:BoardState,filter:BoardFilter){const query=filter.query.toLocaleLowerCase('en-US').trim();return state.cards.filter(c=>(!filter.pinned||c.pinned)&&(!filter.reminders||!!c.reminder)&&filter.tagIds.every(id=>c.tagIds.includes(id))&&(filter.kind==='all'||filter.kind==='image'&&c.images.length>0||filter.kind==='checklist'&&c.items.length>0||filter.kind==='text'&&!c.items.length&&!c.images.length)&&(!query||[c.title,c.text,...c.items.map(i=>i.text),...c.images.map(i=>i.alt),...state.tags.filter(t=>c.tagIds.includes(t.id)).map(t=>t.name)].join(' ').toLocaleLowerCase('en-US').includes(query))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(filter.sort==='updated'?b.updatedAt.localeCompare(a.updatedAt):filter.sort==='oldest'?a.createdAt.localeCompare(b.createdAt):b.createdAt.localeCompare(a.createdAt))||a.id.localeCompare(b.id));}
export function boardPreferences(raw:string|null):Pick<BoardFilter,'sort'|'layout'>{try{const p=JSON.parse(raw??'null');return {sort:['updated','newest','oldest','pinned'].includes(p?.sort)?p.sort:'newest',layout:['masonry','compact','list','date','tag'].includes(p?.layout)?p.layout:'masonry'};}catch{return {sort:'newest',layout:'masonry'};}}
