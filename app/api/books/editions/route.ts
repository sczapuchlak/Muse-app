import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse} from '@/lib/auth/http';
import {bookLookup} from '@/lib/books/service';
import {lookupRequest} from '@/lib/books/route-guard';

const text=(value:unknown,max:number)=>typeof value==='string'&&value.trim()?value.trim().slice(0,max):undefined;
export async function POST(request:NextRequest){
 try{
  const ready=await lookupRequest(request);if('error' in ready)return ready.error;
  const {workKey,isbn,title,authors}=ready.body;
  return ready.respond(await bookLookup.editions({workKey:text(workKey,40),isbn:text(isbn,20),title:text(title,300),authors:Array.isArray(authors)?authors.map(a=>text(a,120)).filter((a):a is string=>!!a).slice(0,6):undefined}));
 }catch{return privateResponse(NextResponse.json({error:'Editions are unavailable right now. The book details you have are still editable.'},{status:503}));}
}
