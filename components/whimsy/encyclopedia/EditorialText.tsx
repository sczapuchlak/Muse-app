import {Fragment,type ReactNode} from 'react';
function inline(text:string):ReactNode[]{return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part,index)=>part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith('*')&&part.endsWith('*')?<em key={index}>{part.slice(1,-1)}</em>:<Fragment key={index}>{part}</Fragment>);}
/** Present source-authored Markdown-like paragraphs without mutating the source string. */
export function EditorialText({text}:{text:string}){
 const blocks:{heading:number;lines:string[]}[]=[];let lines:string[]=[];
 const flush=()=>{if(lines.length){blocks.push({heading:0,lines});lines=[];}};
 for(const line of text.replace(/\r\n/g,'\n').split('\n')){
  const heading=/^(#{2,4})\s+(.+)$/.exec(line);
  if(heading){flush();blocks.push({heading:heading[1].length,lines:[heading[2]]});}
  else if(!line.trim())flush();else lines.push(line);
 }flush();
 return <div className="muse-encyclopedia-prose">{blocks.map((block,index)=>block.heading===2?<h3 key={index}>{inline(block.lines[0])}</h3>:block.heading?<h4 key={index}>{inline(block.lines[0])}</h4>:<p key={index}>{block.lines.map((line,i)=><Fragment key={i}>{i>0&&<br/>}{inline(line)}</Fragment>)}</p>)}</div>;
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
