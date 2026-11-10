import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse} from '@/lib/auth/http';
import {lookupRequest} from '@/lib/books/route-guard';
import {seriesResolver} from '@/lib/books/series-service';
import type {CatalogSource,SeriesSeed} from '@/lib/books/series-discovery';

const field=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
const sources=new Set<CatalogSource>(['hardcover','wikidata','open-library']);
export async function POST(request:NextRequest){
 try{
  const ready=await lookupRequest(request);if('error' in ready)return ready.error;
  const body=ready.body,source=sources.has(body.source as CatalogSource)?body.source as CatalogSource:undefined;
  if(body.action==='search'){
   const query=field(body.query,120);if(query.length<2)return privateResponse(NextResponse.json({error:'Enter a series name.'},{status:400}));
   return ready.respond({...await seriesResolver.searchCatalog(query),configured:!!process.env.HARDCOVER_API_KEY});
  }
  const seed:SeriesSeed={title:field(body.title,200),author:field(body.author,150),isbn:field(body.isbn,20),workKey:field(body.workKey,40),...(source?{source,sourceId:field(body.sourceId,120)}:{})};
  if(!seed.title||seed.title.length<2)return privateResponse(NextResponse.json({error:'A book title is needed to discover its series.'},{status:400}));
  const catalog=await seriesResolver.resolve(seed,{refresh:body.refresh===true});
  return ready.respond({catalog});
 }catch{return privateResponse(NextResponse.json({error:'Series discovery is unavailable right now. Your saved series is unchanged.'},{status:503}));}
}
