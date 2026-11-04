import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse} from '@/lib/auth/http';
import {bookLookup} from '@/lib/books/service';
import {lookupRequest} from '@/lib/books/route-guard';

export async function POST(request:NextRequest){
 try{
  const ready=await lookupRequest(request);if('error' in ready)return ready.error;
  const query=typeof ready.body.query==='string'?ready.body.query.trim():'';
  if(query.length<2||query.length>120)return privateResponse(NextResponse.json({error:'Enter at least two characters of a title, author, or ISBN.'},{status:400}));
  return ready.respond(await bookLookup.search(query));
 }catch{return privateResponse(NextResponse.json({error:'Book search is unavailable right now. You can still add your book manually.'},{status:503}));}
}
