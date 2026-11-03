/** Presentation-only parsing of the three supplied reflection manuscript formats. */
export type ReflectionSections={upright:string[];reversed:string[];ritualTitle:string;ritual:string;misconception:string;closing:string};
const clean=(value:string)=>value.trim();
function questions(text:string){const matches=text.match(/[^?]+\?/g)?.map(clean)??[];return matches.length===3&&matches.join(' ').replace(/\s+/g,' ')===text.replace(/\s+/g,' ').trim()?matches:null;}
export function parseGrimoireReflection(value:unknown):ReflectionSections|null{
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const row=value as Record<string,unknown>,upright=row.uprightQuestions,reversed=row.reversedQuestions;
  if(!Array.isArray(upright)||!Array.isArray(reversed)||upright.some(item=>typeof item!=='string')||reversed.some(item=>typeof item!=='string')||typeof row.journalPrompt!=='string')return null;
  return {upright:upright as string[],reversed:reversed as string[],ritualTitle:'Journal ritual',ritual:row.journalPrompt,misconception:typeof row.misconception==='string'?row.misconception:'',closing:''};
 }
 if(typeof value!=='string')return null;
 if(value.startsWith('## Chapter VI — Reflection')){
  const headings=[...value.matchAll(/^### (.+)$/gm)];const sections=Object.fromEntries(headings.map((match,index)=>[match[1].trim().toLowerCase(),value.slice(match.index!+match[0].length,headings[index+1]?.index??value.length).trim()]));
  const upright=sections['upright questions'],reversed=sections['reversed questions'];if(!upright||!reversed||!sections['the journal ritual'])return null;
  const parseNumbered=(text:string)=>text.split('\n').map(line=>line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  if(!upright.split('\n').every(line=>/^\d+\.\s/.test(line))||!reversed.split('\n').every(line=>/^\d+\.\s/.test(line)))return null;
  return {upright:parseNumbered(upright),reversed:parseNumbered(reversed),ritualTitle:'The journal ritual',ritual:sections['the journal ritual'],misconception:sections['a misconception worth unlearning']??'',closing:sections['the last word']??''};
 }
 const paragraphs=value.split(/\n\s*\n/).map(clean).filter(Boolean);if(paragraphs.length!==4)return null;
 const upright=paragraphs[0].match(/^\*\*(?:Upright questions|Upright):\*\*\s*([\s\S]+)$/i),reversed=paragraphs[1].match(/^\*\*(?:Reversed questions|Reversed):\*\*\s*([\s\S]+)$/i),ritual=paragraphs[2].match(/^\*\*(Journal ritual[^*]+)\*\*\s*([\s\S]+)$/i);
 if(!upright||!reversed||!ritual)return null;
 const uprightQuestions=questions(upright[1]),reversedQuestions=questions(reversed[1]);if(!uprightQuestions||!reversedQuestions)return null;
 const closing=paragraphs[3].match(/^\*\*Last word:\*\*\s*([\s\S]+)$/i)?.[1]??(/^\*[^*]+\*$/.test(paragraphs[3])?paragraphs[3]:'');if(!closing)return null;
 return {upright:uprightQuestions,reversed:reversedQuestions,ritualTitle:ritual[1].replace(/[.:]$/,''),ritual:ritual[2],misconception:'',closing};
}
