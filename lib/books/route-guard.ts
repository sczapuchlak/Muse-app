import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin} from '@/lib/auth/http';
import {allowLookup} from './rate-limit';

const fail=(error:string,status:number)=>privateResponse(NextResponse.json({error},{status}));
/** Shared request handling for book lookup routes: origin, sign-in, bounded JSON body, rate limit. */
export async function lookupRequest(request:NextRequest):Promise<{body:Record<string,unknown>;respond:(data:unknown)=>NextResponse}|{error:NextResponse}>{
 if(!trustedOrigin(request))return {error:fail('Use Muse from its configured origin.',403)};
 const base=privateResponse(NextResponse.json({}));
 const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();
 if(error||!data.user)return {error:fail('Sign in to search for books.',401)};
 if(!allowLookup(data.user.id))return {error:fail('Book search is catching its breath. Try again in a moment, or add the book manually.',429)};
 const text=await request.text();if(text.length>2048)return {error:fail('That search is too long.',400)};
 let body:unknown;try{body=JSON.parse(text);}catch{return {error:fail('Enter a title, author, or ISBN.',400)};}
 if(!body||typeof body!=='object'||Array.isArray(body))return {error:fail('Enter a title, author, or ISBN.',400)};
 return {body:body as Record<string,unknown>,respond:(payload:unknown)=>{const response=privateResponse(NextResponse.json(payload));for(const cookie of base.cookies.getAll())response.cookies.set(cookie);return response;}};
}
