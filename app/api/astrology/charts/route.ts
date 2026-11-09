import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin} from '@/lib/auth/http';
import {calculateNatal,validateBirthProfile} from '@/lib/astrology/calculations';
import {calculateComposite,calculateSynastry,calculateTransit} from '@/lib/astrology/chart-tools';
import type {BirthProfile} from '@/lib/astrology/models';

function reply(base:NextResponse,payload:unknown,status=200){const response=privateResponse(NextResponse.json(payload,{status}));for(const cookie of base.cookies.getAll())response.cookies.set(cookie);return response;}
export async function POST(request:NextRequest){
 const base=privateResponse(NextResponse.json({}));
 if(!trustedOrigin(request))return reply(base,{error:'Use Muse from its configured origin.'},403);
 const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();
 if(error||!data.user)return reply(base,{error:'Sign in to calculate a chart.'},401);
 try{
  const text=await request.text();if(text.length>6000)return reply(base,{error:'Chart details are too large.'},400);
  const input=JSON.parse(text) as {kind:string;one?:BirthProfile;two?:BirthProfile;selectedAt?:string};
  if(!input||!['natal','synastry','composite','transit'].includes(input.kind)||!input.one)throw Error('Choose a supported chart tool and birth details.');
  validateBirthProfile(input.one);
  if(input.kind==='synastry'||input.kind==='composite'){if(!input.two)throw Error('Enter birth details for Person Two.');validateBirthProfile(input.two);}
  const result=input.kind==='natal'?{kind:'natal',chart:calculateNatal(input.one)}:input.kind==='synastry'?calculateSynastry(input.one,input.two!):input.kind==='composite'?calculateComposite(input.one,input.two!):calculateTransit(input.one,input.selectedAt??'');
  return reply(base,{result});
 }catch(error){return reply(base,{error:error instanceof Error?error.message:'The chart could not be calculated.'},400);}
}
