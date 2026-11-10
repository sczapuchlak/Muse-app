import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin} from '@/lib/auth/http';
import {validateBirthProfile} from '@/lib/astrology/calculations';
import type {BirthProfile} from '@/lib/astrology/models';
import type {Json} from '@/lib/database.types';

const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
function reply(base:NextResponse,payload:unknown,status=200){const response=privateResponse(NextResponse.json(payload,{status}));for(const cookie of base.cookies.getAll())response.cookies.set(cookie);return response;}

export async function GET(request:NextRequest){
 const base=privateResponse(NextResponse.json({}));
 try{
  const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();
  if(error||!data.user)return reply(base,{error:'Sign in to view private comparison profiles.'},401);
  const result=await client.from('astrology_comparison_profiles').select('id,name,payload,revision,created_at,updated_at').eq('user_id',data.user.id).order('name');
  if(result.error)throw result.error;
  return reply(base,{profiles:result.data});
 }catch{return reply(base,{error:'Saved comparison profiles could not load.'},503);}
}

export async function POST(request:NextRequest){
 const base=privateResponse(NextResponse.json({}));
 try{
  if(!trustedOrigin(request))return reply(base,{error:'Use Muse from its configured origin.'},403);
  const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();
  if(error||!data.user)return reply(base,{error:'Sign in to save private comparison profiles.'},401);
  const raw=await request.text();if(raw.length>6500)return reply(base,{error:'The comparison profile is too large.'},400);
  const input=JSON.parse(raw) as {id?:unknown;name?:unknown;profile?:BirthProfile;expectedRevision?:unknown};
  if(!uuid(input.id)||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>80||!Number.isInteger(input.expectedRevision)||Number(input.expectedRevision)<0||!input.profile)return reply(base,{error:'Choose a name and valid comparison profile.'},400);
  validateBirthProfile(input.profile);
  const p=input.profile;
  const profile:BirthProfile={date:p.date,time:p.accuracy==='unknown'?'':p.time,accuracy:p.accuracy,uncertaintyMinutes:p.accuracy==='approximate'?p.uncertaintyMinutes:0,...(p.fold?{fold:p.fold}:{}),place:p.place?{id:String(p.place.id??'manual').slice(0,100),name:p.place.name.trim(),latitude:p.place.latitude,longitude:p.place.longitude,timeZone:p.place.timeZone}:null,zodiac:'tropical',houseSystem:'whole-sign'};
  const revision=Number(input.expectedRevision),now=new Date().toISOString();
  if(revision===0){
   const created=await client.from('astrology_comparison_profiles').insert({user_id:data.user.id,id:input.id,name:input.name.trim(),payload:profile as unknown as NonNullable<Json>,revision:1}).select('id,name,payload,revision,created_at,updated_at').single();
   if(created.error){if(created.error.code==='23505')return reply(base,{error:'This profile changed elsewhere. Reload your saved profiles.'},409);throw created.error;}
   return reply(base,{profile:created.data});
  }
  const changed=await client.from('astrology_comparison_profiles').update({name:input.name.trim(),payload:profile as unknown as NonNullable<Json>,revision:revision+1,updated_at:now}).eq('user_id',data.user.id).eq('id',input.id).eq('revision',revision).select('id,name,payload,revision,created_at,updated_at').maybeSingle();
  if(changed.error)throw changed.error;
  if(!changed.data)return reply(base,{error:'This profile changed elsewhere. Reload your saved profiles.'},409);
  return reply(base,{profile:changed.data});
 }catch(error){if(error instanceof SyntaxError)return reply(base,{error:'The comparison profile could not be read.'},400);return reply(base,{error:error instanceof Error&&!('code' in error)?error.message:'The comparison profile could not be saved.'},503);}
}

export async function DELETE(request:NextRequest){
 const base=privateResponse(NextResponse.json({}));
 try{
  if(!trustedOrigin(request))return reply(base,{error:'Use Muse from its configured origin.'},403);
  const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();
  if(error||!data.user)return reply(base,{error:'Sign in to delete a comparison profile.'},401);
  const raw=await request.text();if(raw.length>500)return reply(base,{error:'Invalid deletion request.'},400);
  const input=JSON.parse(raw) as {id?:unknown;expectedRevision?:unknown;confirmation?:unknown};
  if(!uuid(input.id)||!Number.isInteger(input.expectedRevision)||Number(input.expectedRevision)<1||input.confirmation!=='DELETE')return reply(base,{error:'Confirm deletion of a saved comparison profile.'},400);
  const removed=await client.from('astrology_comparison_profiles').delete().eq('user_id',data.user.id).eq('id',input.id).eq('revision',Number(input.expectedRevision)).select('id').maybeSingle();
  if(removed.error)throw removed.error;
  if(!removed.data)return reply(base,{error:'This profile changed elsewhere. Reload your saved profiles.'},409);
  return reply(base,{deleted:true,id:input.id});
 }catch(error){if(error instanceof SyntaxError)return reply(base,{error:'The deletion request could not be read.'},400);return reply(base,{error:'The comparison profile could not be deleted.'},503);}
}
