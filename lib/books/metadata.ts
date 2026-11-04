/**
 * Book lookup metadata: pure normalization for Google Books and Open Library responses.
 * External data is untrusted: every value is type-checked, text is reduced to plain text,
 * and missing information stays missing rather than guessed.
 */
import {genrePresets} from '@/lib/collections/genres';

export type BookFormat='physical'|'ebook'|'audiobook';
export type BookProvider='google-books'|'open-library';
/** One edition-level candidate. Fields are present only when the source provides them reliably. */
export type BookCandidate={
 key:string;provider:BookProvider;title:string;authors:string[];
 year?:string;publishedDate?:string;publisher?:string;pageCount?:number;
 isbn13?:string;isbn10?:string;formatLabel?:string;format?:BookFormat;language?:string;
 coverUrl?:string;thumbnailUrl?:string;description?:string;genres:string[];
 volumeId?:string;workKey?:string;editionKey?:string;editionCount?:number;
};
export type BookMetadataSource={provider:BookProvider;volumeId?:string;workKey?:string;editionKey?:string;importedAt:string};

const MAX_TEXT=4000,MAX_FIELD=300;
const str=(value:unknown,max=MAX_FIELD)=>typeof value==='string'&&value.trim()?plainText(value).slice(0,max).trim()||undefined:undefined;
const strings=(value:unknown)=>Array.isArray(value)?value.map(item=>str(item)).filter((item):item is string=>!!item):[];
const positiveInt=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>0&&value<100000?value:undefined;

const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',hellip:'…',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“'};
/** Untrusted HTML/markup to plain text; the result is still rendered as React text, never as HTML. */
export function plainText(value:string,max=MAX_TEXT){
 return value.replace(/<\s*(br|\/p|\/div|\/li)\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'')
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(match,code:string)=>code[0]==='#'?safeChar(code[1]?.toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10)):entities[code.toLowerCase()]??match)
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,max);
}
function safeChar(code:number){return Number.isFinite(code)&&code>31&&code<0x10ffff?String.fromCodePoint(code):'';}

export function isbnDigits(value:string){return value.replace(/[\s-]/g,'').toUpperCase();}
export function validIsbn10(value:string){const v=isbnDigits(value);if(!/^\d{9}[\dX]$/.test(v))return false;let sum=0;for(let i=0;i<10;i++)sum+=(v[i]==='X'?10:Number(v[i]))*(10-i);return sum%11===0;}
export function validIsbn13(value:string){const v=isbnDigits(value);if(!/^97[89]\d{10}$/.test(v))return false;let sum=0;for(let i=0;i<13;i++)sum+=Number(v[i])*(i%2?3:1);return sum%10===0;}
export function isbn10To13(value:string){const v=isbnDigits(value);if(!validIsbn10(v))return undefined;const core=`978${v.slice(0,9)}`;let sum=0;for(let i=0;i<12;i++)sum+=Number(core[i])*(i%2?3:1);return `${core}${(10-sum%10)%10}`;}
/** A search query that is a valid ISBN-10/13 (hyphens and spaces allowed), normalized to ISBN-13. */
export function queryIsbn(query:string){const v=isbnDigits(query);return validIsbn13(v)?v:validIsbn10(v)?isbn10To13(v):undefined;}
/** Loose shape check for a user-entered ISBN; checksum problems are left to the reader. */
export function plausibleIsbn(value:string){const v=isbnDigits(value);return !v||/^\d{9}[\dX]$/.test(v)||/^\d{13}$/.test(v);}

/** Covers must be HTTPS. Google's http thumbnails are upgraded and its page-curl effect removed. */
export function safeCoverUrl(value:unknown){
 if(typeof value!=='string')return undefined;
 try{const url=new URL(value.replace(/^http:\/\//i,'https://'));if(url.protocol!=='https:')return undefined;url.searchParams.delete('edge');return url.toString();}catch{return undefined;}
}
export const openLibraryCover=(id:unknown,size:'S'|'M'|'L')=>typeof id==='number'&&Number.isInteger(id)&&id>0?`https://covers.openlibrary.org/b/id/${id}-${size}.jpg`:undefined;

const months:Record<string,string>={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
/** Keeps ISO-like dates as given (YYYY, YYYY-MM, YYYY-MM-DD); converts "May 02, 2017"-style text; otherwise keeps short text. */
export function normalizePublishedDate(value:unknown){
 const text=str(value,60);if(!text)return undefined;
 if(/^\d{4}(-\d{2}(-\d{2})?)?$/.test(text))return text;
 const long=text.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);if(long&&months[long[1].toLowerCase()])return `${long[3]}-${months[long[1].toLowerCase()]}-${long[2].padStart(2,'0')}`;
 const monthYear=text.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/);if(monthYear&&months[monthYear[1].toLowerCase()])return `${monthYear[2]}-${months[monthYear[1].toLowerCase()]}`;
 return text;
}
const yearOf=(date?:string)=>date?.match(/\b(1[5-9]\d\d|20\d\d)\b/)?.[1];

/** Only clear format descriptions map to Muse's formats; anything else stays unknown. */
export function mapFormat(label:unknown):{format?:BookFormat;formatLabel?:string}{
 const text=str(label,60);if(!text)return {};
 const lower=text.toLowerCase(),formatLabel=text[0].toUpperCase()+text.slice(1);
 if(/e-?book|kindle|epub|electronic|digital/.test(lower))return {format:'ebook',formatLabel};
 if(/audio|\bcd\b|mp3|cassette/.test(lower))return {format:'audiobook',formatLabel};
 if(/paperback|hardcover|hardback|mass market|library binding|board book|spiral|leather|turtleback|trade paper/.test(lower))return {format:'physical',formatLabel};
 return {formatLabel};
}

const genreAliases:[RegExp,string][]=[[/romantasy|fantasy romance|romantic fantasy|fantasy \/ romantic/,'Romantasy'],[/young adult|juvenile fiction|\bya\b/,'Young Adult'],[/science fiction|sci-fi/,'Science Fiction'],[/historical romance/,'Historical Romance'],[/contemporary romance/,'Contemporary Romance'],[/historical fiction|fiction \/ historical/,'Historical Fiction'],[/literary/,'Literary Fiction'],[/biography/,'Biography'],[/memoir/,'Memoir'],[/self-help/,'Self-Help'],[/graphic novel|comics/,'Graphic Novel'],[/poetry/,'Poetry'],[/thriller|suspense/,'Thriller'],[/mystery|detective/,'Mystery'],[/horror/,'Horror'],[/fantasy/,'Fantasy'],[/romance/,'Romance']];
/** Maps source categories onto Muse's existing book genres only; unfamiliar categories are dropped. */
export function mapGenres(categories:string[]){
 const presets=new Set(genrePresets.book),found:string[]=[];
 for(const raw of categories){const lower=raw.toLowerCase();for(const [pattern,genre] of genreAliases)if(pattern.test(lower)&&presets.has(genre)&&!found.includes(genre))found.push(genre);}
 return found.slice(0,4);
}

const languages:Record<string,string>={eng:'English',en:'English',spa:'Spanish',es:'Spanish',fre:'French',fra:'French',fr:'French',ger:'German',deu:'German',de:'German',ita:'Italian',it:'Italian',por:'Portuguese',pt:'Portuguese',dut:'Dutch',nl:'Dutch',jpn:'Japanese',ja:'Japanese',chi:'Chinese',zh:'Chinese',rus:'Russian',ru:'Russian',ukr:'Ukrainian',uk:'Ukrainian',pol:'Polish',pl:'Polish',swe:'Swedish',sv:'Swedish',tur:'Turkish',tr:'Turkish',kor:'Korean',ko:'Korean'};
const languageName=(code:unknown)=>typeof code==='string'?languages[code.replace('/languages/','').toLowerCase()]??undefined:undefined;

type Json=Record<string,unknown>;
const obj=(value:unknown):Json=>value&&typeof value==='object'&&!Array.isArray(value)?value as Json:{};

/** Google Books volume → candidate. A volume is a single edition, so its page count is edition-specific. */
export function fromGoogleVolume(raw:unknown):BookCandidate|undefined{
 const item=obj(raw),info=obj(item.volumeInfo),id=str(item.id,80),title=str(info.title);if(!id||!title)return undefined;
 const ids=Array.isArray(info.industryIdentifiers)?info.industryIdentifiers.map(obj):[];
 const isbn13=ids.map(x=>str(x.identifier,20)).find(v=>v&&validIsbn13(v)),isbn10=ids.map(x=>str(x.identifier,20)).find(v=>v&&validIsbn10(v));
 const images=obj(info.imageLinks),thumb=safeCoverUrl(images.thumbnail??images.smallThumbnail),publishedDate=normalizePublishedDate(info.publishedDate);
 return {key:`google-books:${id}`,provider:'google-books',volumeId:id,title,authors:strings(info.authors).slice(0,6),publishedDate,year:yearOf(publishedDate),publisher:str(info.publisher),pageCount:positiveInt(info.pageCount),
  isbn13:isbn13?isbnDigits(isbn13):isbn10?isbn10To13(isbn10):undefined,isbn10:isbn10?isbnDigits(isbn10):undefined,language:languageName(info.language),
  coverUrl:thumb,thumbnailUrl:safeCoverUrl(images.smallThumbnail)??thumb,description:typeof info.description==='string'?plainText(info.description)||undefined:undefined,genres:mapGenres(strings(info.categories))};
}

/** Open Library search doc → candidate. Work-level medians are never used as edition page counts. */
export function fromOpenLibraryDoc(raw:unknown):BookCandidate|undefined{
 const doc=obj(raw),workKey=str(doc.key,60),title=str(doc.title);if(!workKey||!title)return undefined;
 const edition=obj((Array.isArray(obj(doc.editions).docs)?obj(doc.editions).docs as unknown[]:[])[0]);
 const isbns=strings(edition.isbn),isbn13=isbns.find(validIsbn13)??isbns.map(v=>validIsbn10(v)?isbn10To13(v):undefined).find(Boolean),isbn10=isbns.find(validIsbn10);
 const cover=typeof edition.cover_i==='number'&&edition.cover_i>0?edition.cover_i:doc.cover_i,publishedDate=normalizePublishedDate(strings(edition.publish_date)[0]);
 const editionKey=str(edition.key,60);
 return {key:`open-library:${editionKey??workKey}`,provider:'open-library',workKey,editionKey,title:str(edition.title)??title,authors:strings(doc.author_name).slice(0,6),publishedDate,year:yearOf(publishedDate)??(typeof doc.first_publish_year==='number'?String(doc.first_publish_year):undefined),
  publisher:strings(edition.publishers)[0],pageCount:positiveInt(edition.number_of_pages),isbn13,isbn10,...mapFormat(edition.physical_format),language:languageName(strings(edition.language)[0]),
  coverUrl:openLibraryCover(cover,'L'),thumbnailUrl:openLibraryCover(cover,'M'),genres:mapGenres(strings(doc.subject).slice(0,30)),editionCount:positiveInt(doc.edition_count)};
}

/** Open Library edition record (from /works/{id}/editions.json or /isbn/{isbn}.json) → candidate. */
export function fromOpenLibraryEdition(raw:unknown,work:{title?:string;authors?:string[];workKey?:string}={}):BookCandidate|undefined{
 const e=obj(raw),editionKey=str(e.key,60),title=str(e.title)??work.title;if(!editionKey||!title)return undefined;
 const isbn13=strings(e.isbn_13).find(validIsbn13),isbn10=strings(e.isbn_10).find(validIsbn10),cover=(Array.isArray(e.covers)?e.covers:[]).find(id=>typeof id==='number'&&id>0);
 const publishedDate=normalizePublishedDate(e.publish_date),languagesList=Array.isArray(e.languages)?e.languages.map(obj):[];
 return {key:`open-library:${editionKey}`,provider:'open-library',workKey:work.workKey??str(obj((Array.isArray(e.works)?e.works:[])[0]).key,60),editionKey,title,authors:work.authors??[],publishedDate,year:yearOf(publishedDate),
  publisher:strings(e.publishers)[0],pageCount:positiveInt(e.number_of_pages),isbn13:isbn13?isbnDigits(isbn13):isbn10?isbn10To13(isbn10):undefined,isbn10:isbn10?isbnDigits(isbn10):undefined,
  ...mapFormat(e.physical_format),language:languageName(languagesList[0]?.key),coverUrl:openLibraryCover(cover,'L'),thumbnailUrl:openLibraryCover(cover,'M'),genres:[]};
}

const norm=(value:string)=>value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const identity=(c:BookCandidate)=>`${norm(c.title)}|${norm(c.authors[0]??'')}`;
/** Primary results first; later sources only add books not already present (same ISBN or same title + first author). */
export function mergeCandidates(groups:BookCandidate[][],limit=8){
 const out:BookCandidate[]=[],isbns=new Set<string>(),books=new Set<string>();
 for(const group of groups)for(const c of group){
  if((c.isbn13&&isbns.has(c.isbn13))||books.has(identity(c)))continue;
  out.push(c);if(c.isbn13)isbns.add(c.isbn13);books.add(identity(c));if(out.length>=limit)return out;
 }
 return out;
}

/** Editions most likely to be wanted first: the reader's language, then complete records, then newest. */
export function sortEditions(editions:BookCandidate[],preferredLanguage='English'){
 const score=(e:BookCandidate)=>(e.language===preferredLanguage?8:0)+(e.coverUrl?4:0)+(e.isbn13?2:0)+(e.pageCount?1:0);
 return [...editions].sort((a,b)=>score(b)-score(a)||(b.publishedDate??'').localeCompare(a.publishedDate??''));
}

/** Fields lookup may fill. Values are form strings, matching the Book editor. */
export type ImportFields={title:string;author:string;genre:string;coverUrl:string;format:''|BookFormat;totalPages:string;isbn:string;publisher:string;publishedDate:string;description:string};
export const importKeys=['title','author','genre','coverUrl','format','totalPages','isbn','publisher','publishedDate','description'] as const;
export function candidateFields(c:BookCandidate):Partial<ImportFields>{
 const fields:Partial<ImportFields>={title:c.title,author:c.authors.join(', ')};
 if(c.genres.length)fields.genre=c.genres.join(', ');
 if(c.coverUrl)fields.coverUrl=c.coverUrl;
 if(c.format)fields.format=c.format;
 if(c.pageCount)fields.totalPages=String(c.pageCount);
 if(c.isbn13??c.isbn10)fields.isbn=c.isbn13??c.isbn10;
 if(c.publisher)fields.publisher=c.publisher;
 if(c.publishedDate)fields.publishedDate=c.publishedDate;
 if(c.description)fields.description=c.description;
 return fields;
}
/**
 * Applies an import without overwriting the reader's own edits. A field is replaced only while it still holds
 * its starting value or the value a previous import put there. When a newly chosen edition lacks a field
 * that the previous import filled, that field returns to its starting value instead of keeping stale data.
 */
export function applyImport<T extends ImportFields>(form:T,baseline:ImportFields,previous:Partial<ImportFields>,next:Partial<ImportFields>):{form:T;imported:Partial<ImportFields>}{
 const result={...form},imported:Partial<ImportFields>={};
 for(const key of importKeys){
  const current=form[key],untouched=current===baseline[key]||(previous[key]!==undefined&&current===previous[key]);
  if(!untouched){continue;}
  const value=next[key];
  if(value!==undefined&&value!==''){(result as ImportFields)[key]=value as never;imported[key]=value as never;}
  else if(previous[key]!==undefined)(result as ImportFields)[key]=baseline[key] as never;
 }
 return {form:result,imported};
}
export function metadataSource(c:BookCandidate,now=new Date()):BookMetadataSource{
 return {provider:c.provider,...(c.volumeId?{volumeId:c.volumeId}:{}),...(c.workKey?{workKey:c.workKey}:{}),...(c.editionKey?{editionKey:c.editionKey}:{}),importedAt:now.toISOString()};
}

/** True when two candidates describe the same edition (shared edition key or ISBN-13). */
export function sameEdition(a:BookCandidate,b:BookCandidate){return !!((a.editionKey&&a.editionKey===b.editionKey)||(a.isbn13&&a.isbn13===b.isbn13));}
/**
 * Combines the chosen book with one of its editions. Title, authors, description and genres stay with the book;
 * edition-specific details (cover, pages, ISBN, publisher, date, format, language) come from the edition.
 * Only for the same edition may the book's own values fill gaps the edition record leaves.
 */
export function withEdition(book:BookCandidate,edition:BookCandidate):BookCandidate{
 const same=sameEdition(book,edition),pick=<K extends keyof BookCandidate>(key:K)=>same?(edition[key]??book[key]):edition[key];
 return {...book,key:edition.key,editionKey:edition.editionKey??(same?book.editionKey:undefined),workKey:edition.workKey??book.workKey,
  coverUrl:edition.coverUrl??(same?book.coverUrl:undefined)??book.coverUrl,thumbnailUrl:edition.thumbnailUrl??book.thumbnailUrl,
  pageCount:pick('pageCount'),isbn13:pick('isbn13'),isbn10:pick('isbn10'),publisher:pick('publisher'),publishedDate:pick('publishedDate'),year:pick('year'),
  format:pick('format'),formatLabel:pick('formatLabel'),language:pick('language'),volumeId:same?book.volumeId:undefined,provider:same?book.provider:edition.provider};
}
