import {Fragment,type ReactNode} from 'react';
import {MuseMark,type MuseTone} from '@/components/design/MuseHeading';
import type {MuseGlyphName} from '@/components/design/MuseGlyph';
function inline(text:string):ReactNode[]{return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part,index)=>part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith('*')&&part.endsWith('*')?<em key={index}>{part.slice(1,-1)}</em>:<Fragment key={index}>{part}</Fragment>);}
type Block={heading:number;lines:string[]};
const glyphFor=(title:string):MuseGlyphName=>{const t=title.toLowerCase();
 return /work|study|career|craft/.test(t)?'briefcase':/relationship|belonging|love|famil/.test(t)?'heart':/money|resource|body/.test(t)?'coins':/practice|reading/.test(t)?'spread':/archive|histor/.test(t)?'scroll':/detail|notice|symbol|look/.test(t)?'eye':/lesson/.test(t)?'lightbulb':/upright/.test(t)?'card':/reversed/.test(t)?'reversed':/question/.test(t)?'quote':/ritual|journal/.test(t)?'quill':/misconception/.test(t)?'key':/last word/.test(t)?'crescent':'sparkle';};
function Paragraph({lines}:{lines:string[]}){
 // "**Question:** …" style openers become a labelled note instead of one more grey paragraph.
 const label=/^\*\*([^*]{2,40}):\*\*\s*(.*)$/.exec(lines[0]);
 if(label)return <p className="muse-prose-note"><b>{label[1]}</b><span>{inline([label[2],...lines.slice(1)].join(' '))}</span></p>;
 return <p>{lines.map((line,i)=><Fragment key={i}>{i>0&&<br/>}{inline(line)}</Fragment>)}</p>;
}
/**
 * Present source-authored Markdown-like text without mutating the source string. Sub-headed passages become a
 * grid of titled sections (glyph, heading, readable measure) instead of one full-width wall of paragraphs.
 */
export function EditorialText({text}:{text:string}){
 const blocks:Block[]=[];let lines:string[]=[];
 const flush=()=>{if(lines.length){blocks.push({heading:0,lines});lines=[];}};
 for(const line of text.replace(/\r\n/g,'\n').split('\n')){
  const heading=/^(#{2,4})\s+(.+)$/.exec(line);
  if(heading){flush();blocks.push({heading:heading[1].length,lines:[heading[2]]});}
  else if(!line.trim())flush();else lines.push(line);
 }flush();
 // Group: an optional chapter title (##), lead paragraphs, then one section per ### / #### heading.
 const lead:Block[]=[],sections:{title:string;body:Block[]}[]=[];let title='';
 for(const block of blocks){
  if(block.heading===2&&!title&&!sections.length&&!lead.length)title=block.lines[0];
  else if(block.heading)sections.push({title:block.lines[0],body:[]});
  else (sections.length?sections[sections.length-1].body:lead).push(block);
 }
 return <div className="muse-encyclopedia-prose" data-sections={sections.length||undefined}>
  {title&&<h3>{inline(title)}</h3>}
  {lead.length>0&&<div className="muse-prose-lead">{lead.map((block,index)=><Paragraph key={index} lines={block.lines}/>)}</div>}
  {sections.length>0&&<div className="muse-prose-sections">{sections.map((section,index)=>{const [name,detail]=section.title.split(' · ');
   return <section key={index} className="muse-prose-section" data-tone={index%4} data-wide={section.body.reduce((n,b)=>n+b.lines.join(' ').length,0)>620||undefined}>
    <header><MuseMark icon={glyphFor(name)} tone={((index*2)%8+1) as MuseTone} size="sm"/><div><h4>{inline(name)}</h4>{detail&&<p className="muse-prose-keywords">{detail.split(/,\s*/).join(' · ')}</p>}</div></header>
    {section.body.map((block,i)=><Paragraph key={i} lines={block.lines}/>)}
   </section>;})}</div>}
 </div>;
}
export function EditorialValue({value}:{value:unknown}):ReactNode{
 if(typeof value==='string')return <EditorialText text={value}/>;
 if(Array.isArray(value))return <ul className="muse-encyclopedia-list">{value.map((item,index)=><li key={index}><EditorialValue value={item}/></li>)}</ul>;
 if(value&&typeof value==='object'){
  const fields=Object.entries(value as Record<string,unknown>).filter(([,item])=>item!==null&&item!==undefined&&item!==''&&(!Array.isArray(item)||item.length));
  if('body' in value){const object=value as Record<string,unknown>;return <>{typeof object.subtitle==='string'&&<h3>{object.subtitle}</h3>}{typeof object.body==='string'&&<EditorialText text={object.body}/>}<div className="muse-encyclopedia-fields">{fields.filter(([key])=>!['title','subtitle','body'].includes(key)).map(([key,item])=><section key={key}><h4>{fieldLabel(key)}</h4><EditorialValue value={item}/></section>)}</div></>;}
  return <div className="muse-encyclopedia-fields">{fields.filter(([key])=>key!=='title').map(([key,item])=><section key={key}><h4>{fieldLabel(key)}</h4><EditorialValue value={item}/></section>)}</div>;
 }
 return null;
}
export function fieldLabel(value:string){return value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,letter=>letter.toUpperCase());}
