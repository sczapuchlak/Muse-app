import questContent from '@/content/whimsy/side-quests.json';
import type {CuratedContent} from './content';
import type {ContentReference,QuestCategory,QuestWeek} from './models';

export const questLibrary=questContent as CuratedContent[];
export type DrawExperience='surprise'|'balance'|'vibe';
export const questVibes=['Cozy','Adventurous','Creative','Social','Chaos Goblin'] as const satisfies readonly QuestCategory[];
export type QuestPreference={experience:DrawExperience;vibe:QuestCategory};
export const defaultQuestPreference:QuestPreference={experience:'balance',vibe:'Cozy'};

const shuffle=<T,>(items:T[],random:()=>number)=>{
 const copy=[...items];
 for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
 return copy;
};
export const questById=(id:string)=>questLibrary.find(quest=>quest.id===id);
export const reference=(quest:CuratedContent):ContentReference=>({contentId:quest.id,version:quest.version});
export function currentDraw(week:QuestWeek):ContentReference[]{
 const ids=week.activeIds??week.draws.slice(0,6).map(ref=>ref.contentId);
 return ids.map(id=>week.draws.find(ref=>ref.contentId===id)).filter((ref):ref is ContentReference=>!!ref);
}
export function chosenSlots(week:QuestWeek):number[]{return week.chosenSlots??currentDraw(week).flatMap((ref,index)=>week.revealedIds?.includes(ref.contentId)?[index]:[]);}
export function canRevealQuest(week:QuestWeek,index:number):boolean{const slots=chosenSlots(week);return slots.length<3||slots.includes(index);}
/** All paths draw unique, published entries; recent history is a soft exclusion. */
export function drawSix(preference:QuestPreference,recentIds:ReadonlySet<string>=new Set(),random:()=>number=Math.random):ContentReference[]{
 const eligible=questLibrary.filter(quest=>quest.state==='published'&&(preference.experience!=='vibe'||quest.metadata.vibes===preference.vibe));
 if(eligible.length<6)throw Error('Not enough quests are available for this draw.');
 const pool=shuffle(eligible.filter(quest=>!recentIds.has(quest.id)),random);
 const fallback=shuffle(eligible.filter(quest=>recentIds.has(quest.id)),random);
 const ordered=[...pool,...fallback];
 if(preference.experience!=='balance')return ordered.slice(0,6).map(reference);
 const picked:CuratedContent[]=[];
 for(const category of questVibes){const next=ordered.find(quest=>quest.category===category&&!picked.includes(quest));if(next)picked.push(next);}
 for(const quest of ordered)if(picked.length<6&&!picked.includes(quest))picked.push(quest);
 return shuffle(picked.slice(0,6),random).map(reference);
}
export function recentQuestIds(weeks:QuestWeek[],currentWeek:string){return new Set(weeks.filter(w=>w.weekStart<currentWeek).sort((a,b)=>b.weekStart.localeCompare(a.weekStart)).slice(0,4).flatMap(w=>w.draws.map(ref=>ref.contentId)));}
export function selectQuest(week:QuestWeek,id:string):QuestWeek{
 if(week.committedAt||!week.revealedIds?.includes(id)||!currentDraw(week).some(ref=>ref.contentId===id))return week;
 const selected=week.selectedIds.includes(id)?week.selectedIds.filter(value=>value!==id):week.selectedIds.length<3?[...week.selectedIds,id]:week.selectedIds;
 return {...week,selectedIds:selected};
}
export function rerollQuest(week:QuestWeek,id:string,preference:QuestPreference,recentIds:ReadonlySet<string>=new Set(),random:()=>number=Math.random):QuestWeek{
 if(week.committedAt||!week.revealedIds?.includes(id))return week;
 const used=new Set([...week.draws.map(ref=>ref.contentId),...recentIds]);
 const choose=(exclude:Set<string>)=>shuffle(questLibrary.filter(quest=>quest.state==='published'&&(!('vibe'===preference.experience)||quest.metadata.vibes===preference.vibe)&&!exclude.has(quest.id)),random)[0];
 const next=choose(used)??choose(new Set(currentDraw(week).map(ref=>ref.contentId)));
 if(!next)throw Error('No different quest is available.');
 return {...week,draws:[...week.draws,reference(next)],activeIds:currentDraw(week).map(ref=>ref.contentId===id?next.id:ref.contentId),chosenSlots:chosenSlots(week),revealedIds:week.revealedIds.filter(value=>value!==id),selectedIds:week.selectedIds.filter(value=>value!==id)};
}
export function sealQuestWeek(week:QuestWeek,at:string):QuestWeek{
 if(week.committedAt||week.selectedIds.length!==3||new Set(week.selectedIds).size!==3)throw Error('Choose exactly three quests first.');
 return {...week,committedAt:at};
}
