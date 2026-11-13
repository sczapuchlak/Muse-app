import {grimoireById} from './grimoire';
import {positionInterpretation,tarotById,type TarotCard,type TarotOrientation} from './tarot';

/**
 * Interpretation for the Reading Table's desk: everything a reader needs beside their journal, assembled from the
 * existing card data and Grimoire manuscript. Nothing here is invented per reading and nothing predicts: the lines
 * describe what a card traditionally represents, how reversal shifts it, what its seat in the spread asks, and
 * which patterns the drawn cards actually share. The Grimoire keeps the full history and deep study.
 */
export type DrawnCard={cardId:string;orientation:TarotOrientation};
export type CardInterpretation={
 card:TarotCard;orientation:TarotOrientation;position:string;
 /** One concise sentence for this orientation. */
 essence:string;
 /** The Grimoire's reading summary for this orientation, when the manuscript has one. */
 summary:string;
 keywords:string[];
 /** How this orientation changes the reading. */
 orientationNote:string;
 /** What this seat in the spread asks. */
 positionAngle:string;
 /** The card read through its seat. */
 positionLine:string;
 /** Questions to consider (the manuscript's own, for this orientation). */
 questions:string[];
 /** Everyday contexts: work, relationships, decisions. An excerpt of the Grimoire's "In Your Life". */
 everyday:string;
 /** A common misreading the manuscript warns against. */
 misconception:string;
 journalPrompt:string;
 /** What is pictured, for readers learning the deck. */
 symbolism:string;
 suit:Suit|null;element:string;
};
export type Suit='Wands'|'Cups'|'Swords'|'Pentacles';

const suitLore:Record<Suit,{element:string;domain:string;voice:string}>={
 Wands:{element:'Fire',domain:'drive, will and creative energy',voice:'what you want to do'},
 Cups:{element:'Water',domain:'feeling, intuition and relationship',voice:'what you feel'},
 Swords:{element:'Air',domain:'thought, truth and difficult conversations',voice:'what you think'},
 Pentacles:{element:'Earth',domain:'work, money, the body and practical life',voice:'what you can touch'},
};
const numberLore:Record<number,string>={1:'beginnings',2:'balance and choice',3:'growth and collaboration',4:'structure and rest',5:'friction and change',6:'exchange and recovery',7:'assessment and patience',8:'movement and practice',9:'self-reliance, nearly there',10:'culmination and what it costs'};
const numberNames=['','Aces','Twos','Threes','Fours','Fives','Sixes','Sevens','Eights','Nines','Tens'];
const seatRole:Record<string,string>={
 Today:'the thread to notice today',Past:'something that helped shape where you are',Present:'what is active right now',Future:'a direction that may be opening, not a fixed outcome',
 Mind:'the story your thoughts are telling',Body:'what your energy and physical life are saying',Spirit:'what matters to you underneath it all',
 Situation:'the heart of the matter',Challenge:'the friction worth understanding',Advice:'a response worth trying',
 'Present situation':'what is actually happening','What supports you':'a resource you already have','What asks for care':'the tender part of the question','An unseen influence':'a pattern that is easy to overlook','A possible next step':'one small, reversible action',
};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const strings=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&!!item.trim()).map(item=>item.trim()):[];
/** Prose only: the manuscript's Markdown headings are structure for the Grimoire page, not for a short excerpt. */
function prose(value:unknown){const source=text(value)||text(record(value).body);return source.split('\n').filter(line=>line.trim()&&!/^#{1,6}\s/.test(line)).join(' ').replace(/\*\*?([^*]+)\*\*?/g,'$1').replace(/\s+/g,' ').trim();}
/** Whole sentences up to a length, never a cut-off word. */
export function excerpt(value:string,max=320){
 if(value.length<=max)return value;
 const sentences=value.match(/[^.!?]+[.!?]+(?=\s|$)/g)??[];let out='';
 for(const sentence of sentences){if((out+sentence).length>max)break;out+=sentence;}
 return (out||value.slice(0,max).replace(/\s+\S*$/,'')+'…').trim();
}
const lowerFirst=(value:string)=>value?value[0].toLowerCase()+value.slice(1):value;
const list=(items:string[])=>items.length<=1?items.join(''):`${items.slice(0,-1).join(', ')} and ${items[items.length-1]}`;
export const cardSuit=(card:TarotCard):Suit|null=>card.section in suitLore?card.section as Suit:null;

export function interpretCard(cardId:string,orientation:TarotOrientation,position:string):CardInterpretation|null{
 const card=tarotById(cardId);if(!card)return null;
 const entry=grimoireById(card.id),raw=record(entry?.raw),reflection=record(entry?.chapters.reflection),meanings=record(entry?.chapters.meanings),reversed=orientation==='reversed';
 const overlay=entry?.editorialOverlay;
 const orientationKeywords=reversed?(overlay?.reversedKeywords??strings(raw.reversedKeywords)??[]):(overlay?.uprightKeywords??strings(raw.uprightKeywords)??[]);
 const keywords=(orientationKeywords.length?orientationKeywords:card.keywords).slice(0,5).map(word=>word.toLowerCase());
 const essence=reversed?card.reversed:card.upright;
 const summarySource=text(record(raw.readingSummary)[orientation]);
 // Some manuscript batches only carry a placeholder line for one orientation; a summary must say something the essence does not.
 const summary=summarySource&&summarySource!==essence&&!/central resource or skill/.test(summarySource)?summarySource:excerpt(prose(meanings[orientation]),260);
 const ownQuestions=strings(reflection[reversed?'reversedQuestions':'uprightQuestions']);
 const questions=(ownQuestions.length?ownQuestions:strings(raw[reversed?'reversedQuestions':'uprightQuestions'])).slice(0,3);
 const suit=cardSuit(card),role=seatRole[position];
 return {
  card,orientation,position,essence,summary:summary===essence?'':summary,keywords,
  orientationNote:reversed
   ?`Reversed does not mean “the opposite.” It usually turns ${card.name} inward, slows it down, or asks you to approach its theme differently.`
   :`Upright, ${card.name} speaks in its most direct voice.`,
  positionAngle:positionInterpretation(position),
  positionLine:role?`As ${lowerFirst(position)==='today'?'today’s card':`your ${position}`}, read ${card.name} as ${role}: ${lowerFirst(essence)}`:`Read ${card.name} beside the question you brought: ${lowerFirst(essence)}`,
  questions:questions.length?questions:[card.question],
  everyday:excerpt(prose(entry?.chapters.inYourLife),420),
  misconception:text(raw.misconception)||text(reflection.misconception),
  journalPrompt:text(reflection.journalPrompt)||text(raw.journalPrompt),
  symbolism:card.symbolism,suit,element:suit?suitLore[suit].element:card.element??'',
 };
}

export type SpreadReading={
 /** Patterns the drawn cards actually share, in plain language. */
 threads:{title:string;body:string}[];
 /** One sentence that strings the seats together, for named spreads. */
 sentence:string;
 /** Reflection prompts drawn from this reading. */
 prompts:string[];
};

/** A spread is read as a whole: shared suits, Major Arcana, reversals and repeated numbers, never a prediction. */
export function readSpread(drawn:DrawnCard[],positions:string[],question=''):SpreadReading{
 const cards=drawn.flatMap((item,index)=>{const reading=interpretCard(item.cardId,item.orientation,positions[index]??`Card ${index+1}`);return reading?[reading]:[];});
 const total=cards.length,threads:SpreadReading['threads']=[];
 if(!total)return {threads,sentence:'',prompts:[]};
 const majors=cards.filter(item=>item.card.section==='Major Arcana'),reversed=cards.filter(item=>item.orientation==='reversed');
 const suits=new Map<Suit,CardInterpretation[]>();for(const item of cards)if(item.suit)suits.set(item.suit,[...(suits.get(item.suit)??[]),item]);
 if(total>1){
  for(const [suit,items] of suits)if(items.length>=2){const lore=suitLore[suit];threads.push({title:`${items.length} of ${total} are ${suit}`,body:`${suit} is the suit of ${lore.domain} (${lore.element}). With ${list(items.map(item=>item.card.name))} together, ${lore.voice} is doing most of the talking in this reading.`});}
  if(majors.length>=2||majors.length===total)threads.push({title:majors.length===total?'All Major Arcana':`${majors.length} Major Arcana`,body:`${list(majors.map(item=>item.card.name))} ${majors.length===1?'is':'are'} from the Major Arcana, traditionally read as larger chapters and turning points rather than passing moods. Give ${majors.length===1?'it':'them'} a little more weight.`});
  else if(majors.length===1)threads.push({title:'One Major Arcana',body:`${majors[0].card.name} is the only Major Arcana card here. Many readers treat it as the anchor of the spread and read the others in its light.`});
  else if(total>=3)threads.push({title:'No Major Arcana',body:'Every card is from the Minor Arcana: this reads as the texture of ordinary days, which is where most of life is actually lived.'});
  const numbers=new Map<number,CardInterpretation[]>();for(const item of cards)if(item.suit&&item.card.number>=1&&item.card.number<=10)numbers.set(item.card.number,[...(numbers.get(item.card.number)??[]),item]);
  for(const [number,items] of numbers)if(items.length>=2)threads.push({title:`${items.length} ${numberNames[number]}`,body:`${numberNames[number]} share a stage of the story: ${numberLore[number]}. Seeing it in ${list(items.map(item=>item.suit!))} suggests the same moment showing up in more than one part of life.`});
  const courts=cards.filter(item=>item.suit&&item.card.number>10);
  if(courts.length>=2)threads.push({title:`${courts.length} court cards`,body:`${list(courts.map(item=>item.card.name))} are court cards, often read as people, roles, or ways of acting. Ask who (or which part of you) each one might be.`});
 }
 if(reversed.length&&reversed.length<total)threads.push({title:reversed.length===1?'One card reversed':`${reversed.length} cards reversed`,body:`${list(reversed.map(item=>item.card.name))} arrived reversed. Read ${reversed.length===1?'its theme':'their themes'} as turned inward, delayed, or asking for a different approach, and notice how that sits beside the upright cards.`});
 else if(reversed.length&&total>1)threads.push({title:'Every card reversed',body:'All of the cards arrived reversed. Some readers take that as a nudge to slow down and look at what is happening beneath the surface before acting.'});
 const names=cards.map(item=>`${item.card.name}${item.orientation==='reversed'?' (reversed)':''}`);
 const sentence=total===1?''
  :positions.join('/')==='Past/Present/Future'?`Read them as one sentence: ${names[0]} set the scene, ${names[1]} is where you stand, and ${names[2]} is the direction worth watching.`
  :positions.join('/')==='Mind/Body/Spirit'?`Read them together: ${names[0]} is what you are thinking, ${names[1]} is what you are carrying, and ${names[2]} is what you care about underneath.`
  :positions.join('/')==='Situation/Challenge/Advice'?`Read them as one sentence: ${names[0]} names the matter, ${names[1]} names the friction, and ${names[2]} offers a way to meet it.`
  :`Read the cards in order, then as a group: where do ${list(names)} agree, and where do they pull against each other?`;
 const prompts=[
  ...cards.map(item=>item.questions[0]).filter(Boolean),
  ...(total>1?['If these cards were one sentence, what would it say?','Which card did you want to argue with, and why?']:['What is the first thing this card made you think of?']),
  ...(question.trim()?['Reading this beside your question, what looks different now?']:[]),
 ];
 return {threads,sentence,prompts:[...new Set(prompts)].slice(0,6)};
}
