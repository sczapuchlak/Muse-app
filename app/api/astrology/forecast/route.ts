import {NextResponse,type NextRequest} from 'next/server';
import {routeAuthClient,privateResponse} from '@/lib/auth/http';
import {todayInTimeZone,validDate} from '@/lib/dates';
import {createHoroscopeService,forecastRange,validForecastRequest,type ForecastRequest,type HoroscopeProvider,type HoroscopeResult} from '@/lib/astrology/forecast';
import {zodiacSigns} from '@/lib/cosmic-forecast';

const unavailable:HoroscopeResult={status:'unavailable',reason:'not-published',message:'A current horoscope is not available yet. Please check back later.'};
const validText=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
const provider:HoroscopeProvider={
 capabilities:{id:'cosmyday',version:'1',signs:zodiacSigns,periods:{daily:['overview'],weekly:['overview'],monthly:['overview']},cacheMaxSeconds:900,staleMaxSeconds:0,snapshot:'reference-only'},
 async fetch(query,signal){
  const url=`https://api.cosmyday.com/content/${query.period}/${query.sign}`;
  const response=await fetch(url,{signal,cache:'no-store',headers:{'User-Agent':'Muse horoscope client (https://cosmyday.com)'}});
  if(!response.ok)return {status:'error',code:'provider',message:'The forecast source is unavailable. Please try again later.'};
  const data:unknown=await response.json();
  if(!data||typeof data!=='object'||Array.isArray(data))return unavailable;
  const raw=data as Record<string,unknown>;
  if(raw.sign!==query.sign[0].toUpperCase()+query.sign.slice(1)||!validText(raw.content))return unavailable;
  const range=forecastRange(query.date,query.period);
  if(query.period==='daily'&&(!validDate(raw.date as string)||raw.date!==query.date))return unavailable;
  if(query.period==='weekly'&&(!validDate(raw.start_date as string)||!validDate(raw.end_date as string)||raw.start_date!==range.start||raw.end_date!==range.end))return unavailable;
  if(query.period==='monthly'&&(!Number.isInteger(raw.year)||!Number.isInteger(raw.month)||raw.year!==Number(query.date.slice(0,4))||raw.month!==Number(query.date.slice(5,7))))return unavailable;
  const now=Date.now(),text=raw.content.trim(),preview=text.split(/\n\s*\n/).find(part=>part.trim()&&!part.trim().startsWith('✨'))??text;
  return {status:'ready',cached:false,stale:false,forecast:{provider:'cosmyday',sign:query.sign,category:query.category,period:query.period,range,timeZone:query.timeZone,language:query.language,preview,text,attribution:'Forecast by CosmyDay',sourceUrl:'https://cosmyday.com',retrievedAt:new Date(now).toISOString(),expiresAt:new Date(now+900000).toISOString(),snapshot:'reference-only'}};
 }
};
const service=createHoroscopeService(provider);
export async function GET(request:NextRequest){
 const reply=(result:HoroscopeResult,status=200)=>privateResponse(NextResponse.json(result,{status}));
 const client=routeAuthClient(request,NextResponse.json({}));
 const {data,error}=await client.auth.getUser();
 if(error||!data.user)return reply({status:'error',code:'invalid-request',message:'Sign in to view your horoscope.'},401);
 const params=request.nextUrl.searchParams;
 const query=Object.fromEntries(['sign','category','period','date','timeZone','language'].map(key=>[key,params.get(key)])) as ForecastRequest;
 if(!validForecastRequest(query))return reply({status:'error',code:'invalid-request',message:'Choose a valid forecast request.'},400);
 if(query.date!==todayInTimeZone(query.timeZone))return reply(unavailable);
 return reply(await service.request(query));
}
