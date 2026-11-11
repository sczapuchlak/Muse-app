import {validDate} from '@/lib/dates';
import {mapFormat,queryIsbn,plainText,safeCoverUrl} from './metadata';
import type {GoodreadsRow} from './import-goodreads';

export const importFields=['title','author','sourceId','isbn','publisher','publishedDate','pages','status','startedOn','finishedOn','addedOn','rating','review','notes','genre','currentPage','format','shelves','seriesName','seriesPosition','description','coverUrl'] as const;
export type ImportField=typeof importFields[number];
export type ColumnMapping=Partial<Record<ImportField,number>>;
export function shelfValues(value:string):string[]{try{const parsed=JSON.parse(value);if(Array.isArray(parsed)&&parsed.every(s=>typeof s==='string'))return parsed.map(s=>s.trim()).filter(Boolean);}catch{}return value.split(/[,;]/).map(s=>s.trim()).filter(Boolean);}
const aliases:Partial<Record<ImportField,string[]>>={title:['title','book title'],author:['author','authors'],sourceId:['source id','book id','muse book id'],isbn:['isbn','isbn13','isbn 13'],pages:['pages','number of pages','total pages'],status:['status','read status','reading status'],rating:['rating','star rating','my rating'],review:['review','my review'],finishedOn:['finished on','date read','date finished','last date read'],startedOn:['started on','date started','last date started'],addedOn:['date added'],currentPage:['current page'],shelves:['shelves','tags','collections','bookshelves'],seriesName:['series','series name'],seriesPosition:['series position','series number']};
const key=(v:string)=>v.toLowerCase().replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
export function guessMapping(headers:readonly string[]):ColumnMapping{const mapping:ColumnMapping={};for(const field of importFields){const candidates=aliases[field]??[key(field.replace(/[A-Z]/g,c=>' '+c.toLowerCase()))];const found=headers.map((v,i)=>candidates.includes(key(v))?i:-1).filter(i=>i>=0);if(found.length===1)mapping[field]=found[0];}return mapping;}
/** Generic dates are ISO or unambiguous YYYY/MM/DD; no locale guessing. Ratings require an explicit scale. */
export function mapCsvRow(cells:readonly string[],mapping:ColumnMapping,source:string,scale:5|10):GoodreadsRow{
 const get=(f:ImportField)=>mapping[f]===undefined?'':(cells[mapping[f]!]??'').trim(),warnings:string[]=[],sourceDetails:Record<string,string>={};
 const date=(f:ImportField)=>{const value=get(f).replaceAll('/','-');if(!value)return undefined;if(!validDate(value)){warnings.push(`${f}: use YYYY-MM-DD.`);sourceDetails[f]=get(f);return undefined;}return value;};
 const number=(f:ImportField)=>{const s=get(f);if(!s)return undefined;const n=Number(s);if(!Number.isFinite(n)||n<0){warnings.push(`${f} is invalid.`);sourceDetails[f]=s;return undefined;}return n;};
 if(get('status'))sourceDetails.status=get('status');
 const raw=key(get('status')),status:GoodreadsRow['status']=({planned:'planned','want to read':'planned','to read':'planned',reading:'reading','currently reading':'reading',rereading:'reading',finished:'finished',read:'finished',paused:'paused','on hold':'paused',dnf:'dnf','did not finish':'dnf'} as Record<string,GoodreadsRow['status']>)[raw];
 if(raw&&!status){warnings.push(`Status “${get('status')}” needs review; kept as source information.`);sourceDetails.status=get('status');}
 let rating=number('rating');if(rating!==undefined){if(rating>scale){warnings.push('Rating exceeds the selected scale.');sourceDetails.rating=get('rating');rating=undefined;}else rating=rating===0?undefined:rating*5/scale;}
 if(get('rating')){sourceDetails.ratingValue=get('rating');sourceDetails.ratingScale=String(scale);}
 const startedOn=date('startedOn'),finishedOn=date('finishedOn'),addedOn=date('addedOn'),pages=number('pages'),currentPage=number('currentPage');
 if(startedOn&&finishedOn&&startedOn>finishedOn){warnings.push('Start date is after finish date.');sourceDetails.startedOn=startedOn;}
 for(const [f,n]of [['pages',pages],['currentPage',currentPage]] as const)if(n!==undefined&&(!Number.isInteger(n)||n>=100000)){warnings.push(`${f} must be a whole number below 100,000.`);sourceDetails[f]=get(f);}
 const formatValue=get('format').toLowerCase(),format=['physical','ebook','audiobook'].includes(formatValue)?formatValue as GoodreadsRow['format']:mapFormat(formatValue).format;
 if(formatValue&&!format)sourceDetails.format=get('format');
 if(currentPage!==undefined&&pages!==undefined&&currentPage>pages){sourceDetails.currentPage=get('currentPage');warnings.push('Current page exceeds the supplied page count.');}
 const description=get('description')?plainText(get('description')):undefined,coverUrl=get('coverUrl')?safeCoverUrl(get('coverUrl')):undefined;if(get('description').length>4000)sourceDetails.description=get('description');if(get('coverUrl')&&!coverUrl){sourceDetails.coverUrl=get('coverUrl');warnings.push('Cover URL could not be used; HTTPS is required.');}
 const isbn=queryIsbn(get('isbn').replace(/^="([^"]+)"$/,'$1'));if(get('isbn')&&!isbn){sourceDetails.isbn=get('isbn');warnings.push('ISBN could not be verified.');}
 return {source,sourceId:get('sourceId')||undefined,title:get('title'),author:get('author')||undefined,isbn,description,coverUrl,publisher:get('publisher')||undefined,publishedDate:get('publishedDate')||undefined,pages:pages&&Number.isInteger(pages)&&pages<100000?pages:undefined,status,startedOn:startedOn&&(!finishedOn||startedOn<=finishedOn)?startedOn:undefined,finishedOn,addedOn,rating,review:get('review')||undefined,notes:get('notes')||undefined,genre:get('genre')||undefined,currentPage:currentPage!==undefined&&Number.isInteger(currentPage)&&currentPage<100000&&(!pages||currentPage<=pages)?currentPage:undefined,format,shelves:shelfValues(get('shelves')),seriesName:get('seriesName')||undefined,seriesPosition:number('seriesPosition'),...(Object.keys(sourceDetails).length?{sourceDetails}:{}),warnings};
}
/** Stable fallback identity excludes mutable opinions and status, so later CSVs can refresh it. */
export async function assignRowIds(rows:GoodreadsRow[]){for(const row of rows)if(!row.sourceId){const basis=JSON.stringify([row.isbn??'',row.title.normalize('NFKC').toLowerCase().trim(),row.author?.normalize('NFKC').toLowerCase().trim()??'']);const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(basis));row.sourceId='csv:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}return rows;}
