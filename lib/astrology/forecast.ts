import {zodiacSigns,type ZodiacSign} from '@/lib/cosmic-forecast';
import {shiftDate,validDate,validTimeZone,weekDates} from '@/lib/dates';
import type {ForecastEditorialBlock,ForecastKeyDate} from './forecast-content';

export const forecastPeriods=['daily','weekly','monthly'] as const;
export type ForecastPeriod=typeof forecastPeriods[number];
export const forecastCategories=['overview','love','career','money','creativity','social','wellbeing','personal','emotions','travel','luck'] as const;
export type ForecastCategory=typeof forecastCategories[number];
export const forecastCategoryLabels:Record<ForecastCategory,string>={overview:'Overview',love:'Love & Relationships',career:'Career & Work',money:'Money & Resources',creativity:'Creativity & Inspiration',social:'Social & Friendships',wellbeing:'Energy & Wellbeing',personal:'Personal',emotions:'Emotions',travel:'Travel',luck:'Luck'};
export type ForecastRequest={sign:ZodiacSign;category:ForecastCategory;period:ForecastPeriod;date:string;timeZone:string;language:string};
export type ForecastRange={start:string;end:string};
export type Horoscope={provider:string;sign:ZodiacSign;category:ForecastCategory;period:ForecastPeriod;range:ForecastRange;timeZone:string;language:string;headline?:string;preview:string;text:string;sections?:ForecastEditorialBlock[];closing?:string;keyDates?:ForecastKeyDate[];attribution:string;sourceUrl:string;retrievedAt:string;expiresAt:string;snapshot:'reference-only'|'text'};
export type HoroscopeResult={status:'ready';forecast:Horoscope;cached:boolean;stale:boolean}|{status:'unavailable';reason:'not-configured'|'unsupported'|'not-published';message:string}|{status:'error';code:'invalid-request'|'invalid-response'|'timeout'|'provider'|'rate-limited';message:string;retryAt?:string};
export type HoroscopeCapabilities={id:string;version:string;signs:readonly ZodiacSign[];periods:Partial<Record<ForecastPeriod,readonly ForecastCategory[]>>;cacheMaxSeconds:number;staleMaxSeconds:number;snapshot:'reference-only'|'text'};
export interface HoroscopeProvider{capabilities:HoroscopeCapabilities;fetch(request:ForecastRequest,signal:AbortSignal):Promise<HoroscopeResult>}
export function forecastRange(date:string,period:ForecastPeriod):ForecastRange{
 if(!validDate(date)||!forecastPeriods.includes(period))throw Error('Choose a valid forecast date and period.');
 if(period==='daily')return {start:date,end:date};
 if(period==='weekly'){const start=weekDates(date)[0];return {start,end:shiftDate(start,6)};}
 const start=date.slice(0,7)+'-01',next=new Date(start+'T12:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
 return {start,end:shiftDate(next.toISOString().slice(0,10),-1)};
}
export function validForecastRequest(request:ForecastRequest){return !!request&&zodiacSigns.includes(request.sign)&&forecastCategories.includes(request.category)&&forecastPeriods.includes(request.period)&&validDate(request.date)&&validTimeZone(request.timeZone)&&/^[a-z]{2}(?:-[A-Z]{2})?$/.test(request.language);}
export function forecastIdentity(provider:Pick<HoroscopeCapabilities,'id'|'version'>,request:ForecastRequest){return JSON.stringify([provider.id,provider.version,request.sign,request.category,request.period,forecastRange(request.date,request.period),request.timeZone,request.language]);}
const invalidResponse:HoroscopeResult={status:'error',code:'invalid-response',message:'The forecast source returned mismatched or incomplete content.'};
/** Bounded provider-neutral request coalescing. Policies come from verified vendor terms. */
export function createHoroscopeService(provider:HoroscopeProvider,options:{now?:()=>number;timeoutMs?:number;maxEntries?:number}={}){
 const now=options.now??Date.now,cache=new Map<string,Horoscope>(),inflight=new Map<string,Promise<HoroscopeResult>>();
 async function request(query:ForecastRequest):Promise<HoroscopeResult>{
  if(!validForecastRequest(query))return {status:'error',code:'invalid-request',message:'Choose a valid sign, date, period, category, language and timezone.'};
  const caps=provider.capabilities;
  if(!caps.signs.includes(query.sign)||!caps.periods[query.period]?.includes(query.category))return {status:'unavailable',reason:'unsupported',message:'This source does not offer that forecast category and period.'};
  const key=forecastIdentity(caps,query),previous=cache.get(key);
  if(previous&&Date.parse(previous.expiresAt)>now())return {status:'ready',forecast:structuredClone(previous),cached:true,stale:false};
  const existing=inflight.get(key);if(existing)return existing;
  const job=(async():Promise<HoroscopeResult>=>{
   const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    const timeout=new Promise<HoroscopeResult>(resolve=>{timer=setTimeout(()=>{controller.abort();resolve({status:'error',code:'timeout',message:'The forecast source took too long to respond.'});},options.timeoutMs??8000);});
    const result=await Promise.race([provider.fetch(query,controller.signal),timeout]);
    if(result.status==='ready'){
     const f=result.forecast,range=forecastRange(query.date,query.period),retrieved=Date.parse(f.retrievedAt),expires=Date.parse(f.expiresAt);
     let source:URL;try{source=new URL(f.sourceUrl);}catch{return invalidResponse;}
     if(f.provider!==caps.id||f.sign!==query.sign||f.category!==query.category||f.period!==query.period||f.range.start!==range.start||f.range.end!==range.end||f.timeZone!==query.timeZone||f.language!==query.language||!f.text.trim()||!f.preview.trim()||!f.attribution.trim()||source.protocol!=='https:'||!Number.isFinite(retrieved)||retrieved>now()+60000||expires<=now()||!Number.isFinite(expires)||caps.cacheMaxSeconds>0&&expires-retrieved>caps.cacheMaxSeconds*1000||f.snapshot!==caps.snapshot)return invalidResponse;
     if(caps.cacheMaxSeconds>0){cache.set(key,structuredClone(f));while(cache.size>(options.maxEntries??120))cache.delete(cache.keys().next().value!);}
     return {...result,forecast:structuredClone(f),cached:false,stale:false};
    }
    // A stale response remains dated to its original interval, never silently relabeled.
    if(previous&&caps.staleMaxSeconds>0&&now()-Date.parse(previous.expiresAt)<=caps.staleMaxSeconds*1000)return {status:'ready',forecast:structuredClone(previous),cached:true,stale:true};
    cache.delete(key);return result;
   }catch{if(previous&&caps.staleMaxSeconds>0&&now()-Date.parse(previous.expiresAt)<=caps.staleMaxSeconds*1000)return {status:'ready',forecast:structuredClone(previous),cached:true,stale:true};return {status:'error',code:'provider',message:'The forecast source is unavailable. Please try again later.'};}
   finally{clearTimeout(timer);inflight.delete(key);}
  })();inflight.set(key,job);return job;
 }
 return {request,capabilities:provider.capabilities,clear:()=>cache.clear()};
}

/** Browser facade. Forecast text is fetched from Muse's private server route and never cached in the browser. */
export const observatoryForecasts={capabilities:{id:'cosmyday',version:'1',signs:zodiacSigns,periods:{daily:['overview'],weekly:['overview'],monthly:['overview']} as HoroscopeCapabilities['periods']},async request(query:ForecastRequest):Promise<HoroscopeResult>{
 if(!validForecastRequest(query))return {status:'error',code:'invalid-request',message:'Choose a valid forecast request.'};
 if(query.category!=='overview')return {status:'unavailable',reason:'unsupported',message:'This source offers overview forecasts only.'};
 try{const params=new URLSearchParams(query);const response=await fetch(`/api/astrology/forecast?${params}`,{cache:'no-store'});return await response.json() as HoroscopeResult;}
 catch{return {status:'error',code:'provider',message:'The forecast could not load. Please try again.'};}
}};
