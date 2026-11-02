import cardData from '@/content/whimsy/tarot-cards.json';
import artworkData from '@/content/whimsy/rws-artwork.json';
export type TarotOrientation='upright'|'reversed';
export type TarotCard=(typeof cardData)[number]&{artPath:string};
const artwork=new Map(artworkData.map(item=>[item.cardId,item.artPath]));
export const tarotDeck={id:'rws1909',name:'Rider–Waite–Smith (1909)',description:'The original 78-card illustrated deck',cardBack:'/tarot/rws1909/card-back.svg'} as const;
export const tarotCards:TarotCard[]=cardData.map(item=>({...item,artPath:artwork.get(item.id)??''}));
export const tarotById=(id:string)=>tarotCards.find(card=>card.id===id);
export const tarotSections=['Major Arcana','Wands','Cups','Swords','Pentacles'] as const;
export type Spread={id:string;name:string;description:string;positions:string[]};
export const tarotSpreads:Spread[]=[
 {id:'daily',name:'Daily Draw',description:'A single symbol to sit with today.',positions:['Today']},
 {id:'past-present-future',name:'Past / Present / Future',description:'A look at what led here, what is present, and what may be emerging.',positions:['Past','Present','Future']},
 {id:'mind-body-spirit',name:'Mind / Body / Spirit',description:'Three parts of your experience, considered together.',positions:['Mind','Body','Spirit']},
 {id:'situation-challenge-advice',name:'Situation / Challenge / Advice',description:'A question from three angles.',positions:['Situation','Challenge','Advice']},
 {id:'deep-dive',name:'Five-Card Deep Dive',description:'A fuller reflection on a theme without claiming to predict its outcome.',positions:['Present situation','What supports you','What asks for care','An unseen influence','A possible next step']},
 ...[1,2,3,4,5].map(count=>({id:`free-${count}`,name:`Free Draw · ${count} ${count===1?'card':'cards'}`,description:'Follow your own question, without prescribed positions.',positions:Array.from({length:count},(_,index)=>`Card ${index+1}`)})),
];
export const spreadById=(id:string)=>tarotSpreads.find(spread=>spread.id===id);
const positionAngles:Record<string,string>={Today:'Let this symbol frame what you notice today.',Past:'Consider what this theme has carried into the present.',Present:'Notice where this theme is active right now.',Future:'Consider a direction this theme might help you explore, not a fixed outcome.',Mind:'Notice the thoughts or beliefs this symbol touches.',Body:'Notice how this theme meets your physical needs or energy.',Spirit:'Consider the values or sense of purpose it evokes.',Situation:'Look at the central pattern without rushing to solve it.',Challenge:'Explore where friction or uncertainty may be asking for attention.',Advice:'Consider one gentle response this symbol suggests.','Present situation':'Name what is happening before choosing a response.','What supports you':'Notice existing resources, relationships, or strengths.','What asks for care':'Give attention to the tender or neglected part of the question.','An unseen influence':'Consider a pattern that might be easy to overlook.','A possible next step':'Imagine one small, reversible action.'};
export function positionInterpretation(position:string){return positionAngles[position]??'Consider how this card relates to the question you brought.';}
function secureIndex(max:number){const values=new Uint32Array(1);const limit=Math.floor(0x100000000/max)*max;let value:number;do{crypto.getRandomValues(values);value=values[0];}while(value>=limit);return value%max;}
export function shuffleTarotDeck(includeReversed:boolean){const deck=[...tarotCards];for(let i=deck.length-1;i>0;i--){const j=secureIndex(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}return deck.map(card=>({cardId:card.id,orientation:includeReversed&&secureIndex(2)===1?'reversed' as const:'upright' as const}));}
export function drawTarot(count:number,includeReversed:boolean){if(!Number.isInteger(count)||count<1||count>5)throw Error('Choose between one and five cards.');return shuffleTarotDeck(includeReversed).slice(0,count);}
export function tarotInsights(readings:{cards:{card:{contentId:string};orientation:TarotOrientation}[];spreadId:string;date:string}[]){const counts=new Map<string,number>();let upright=0,reversed=0;const spreads=new Map<string,number>(),months=new Map<string,number>();for(const reading of readings){spreads.set(reading.spreadId,(spreads.get(reading.spreadId)??0)+1);const month=reading.date.slice(0,7);months.set(month,(months.get(month)??0)+1);for(const entry of reading.cards){counts.set(entry.card.contentId,(counts.get(entry.card.contentId)??0)+1);if(entry.orientation==='upright')upright++;else reversed++;}}return {total:readings.length,unique:counts.size,upright,reversed,topCards:[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5),spreads:[...spreads].sort((a,b)=>b[1]-a[1]),months:[...months].sort((a,b)=>b[0].localeCompare(a[0]))};}
