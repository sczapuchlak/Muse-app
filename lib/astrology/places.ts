import 'server-only';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {validTimeZone} from '@/lib/dates';
import type {BirthPlace} from './models';
type PlaceRow=[string,string,string,string,number,number,string,string,string,number];
let index:{row:PlaceRow;search:string}[]|undefined;
const countries=new Intl.DisplayNames(['en'],{type:'region'});
const countryName=(code:string)=>countries.of(code)??code;
const normalize=(text:string)=>text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
/** Local data only: neither a birthplace query nor birth details leave Muse. */
export function searchBirthplaces(query:string):BirthPlace[]{
 const q=normalize(query.trim());if(q.length<2||q.length>100)return [];
 index??=(JSON.parse(gunzipSync(readFileSync(join(process.cwd(),'content/astrology/places.json.gz'))).toString('utf8')) as PlaceRow[]).map(row=>({row,search:normalize([row[1],row[2],row[3],row[6],countryName(row[6]),row[7]].join(' '))}));
 const words=q.split(/\s+/),matches=index.filter(item=>words.every(word=>item.search.includes(word)));
 matches.sort((a,b)=>Number(normalize(b.row[1])===q)-Number(normalize(a.row[1])===q)||b.row[9]-a.row[9]);
 return matches.filter(({row})=>validTimeZone(row[8])).slice(0,12).map(({row})=>({id:row[0],name:[row[1],row[7],countryName(row[6])].filter(Boolean).join(', '),latitude:row[4],longitude:row[5],timeZone:row[8]}));
}
