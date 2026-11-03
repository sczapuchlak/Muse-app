/** Presentation-only parsing of CosmyDay's editorial `content` field. Keep each raw block. */
export type ForecastEditorialBlock={kind:'dateline'|'section'|'paragraph';raw:string;icon?:string;heading?:string;body:string};
export type ForecastKeyDate={date:string;title:string;description:string};

const labeled=/^(\S+)\s+([^:\n]{2,64}:)\s+([\s\S]+)$/u;
const pictograph=/\p{Extended_Pictographic}/u;

export function parseForecastContent(content:string):ForecastEditorialBlock[]{
 const blocks=content.trim().split(/\r?\n\s*\r?\n/u).filter(Boolean);
 return blocks.map((raw,index)=>{
  const match=raw.match(labeled);
  if(match&&pictograph.test(match[1]))return {kind:'section' as const,raw,icon:match[1],heading:match[2],body:match[3]};
  if(index===0&&raw.startsWith('✨'))return {kind:'dateline' as const,raw,body:raw};
  return {kind:'paragraph' as const,raw,body:raw};
 });
}

/** A short, verbatim excerpt from the first reading paragraph. */
export function forecastPreview(blocks:ForecastEditorialBlock[]):string{
 const first=blocks.find(block=>block.kind==='section'&&/^Overview:$/iu.test(block.heading??''))
  ??blocks.find(block=>block.kind==='paragraph')
  ??blocks.find(block=>block.kind==='section');
 const prose=first?.body.trim()??'';
 const sentence=prose.match(/^[\s\S]{1,280}?[.!?](?=\s|$)/u)?.[0];
 return sentence??(prose.length>280?prose.slice(0,280):prose);
}

export function parseForecastKeyDates(value:unknown):ForecastKeyDate[]|null{
 if(value===undefined)return [];
 if(!Array.isArray(value))return null;
 if(!value.every(item=>item&&typeof item==='object'&&!Array.isArray(item)&&typeof item.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)&&typeof item.title==='string'&&item.title.trim()&&typeof item.description==='string'&&item.description.trim()))return null;
 return value.map(item=>({date:item.date,title:item.title,description:item.description}));
}
