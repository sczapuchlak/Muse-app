import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin} from '@/lib/auth/http';
import {calculateNatal,cosmicEvents,validateBirthProfile} from '@/lib/astrology/calculations';
import {libraryEntry} from '@/lib/astrology/library';
import {planetIds,type AstrologySnapshot,type BirthProfile,type AstrologyReference} from '@/lib/astrology/models';
import {todayInTimeZone,validDate,validTimeZone} from '@/lib/dates';
import {forecastReference,forecastReferenceAllowed,parseForecastReferenceId} from '@/lib/astrology/forecast-reference';
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
function reply(base:NextResponse,payload:unknown,status=200){const response=privateResponse(NextResponse.json(payload,{status}));for(const cookie of base.cookies.getAll())response.cookies.set(cookie);return response;}
export async function GET(request:NextRequest){const base=privateResponse(NextResponse.json({}));try{const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();if(error||!data.user)return reply(base,{error:'Sign in to open your private Observatory.'},401);const result=await client.rpc('read_astrology');if(result.error)throw result.error;return reply(base,{snapshot:result.data});}catch{return reply(base,{error:'Private Observatory records could not load. Retry without replacing your saved data.'},503);}}
export async function POST(request:NextRequest){
 const base=privateResponse(NextResponse.json({}));
 try{
  if(!trustedOrigin(request))return reply(base,{error:'Use Muse from its configured origin.'},403);
  const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();if(error||!data.user)return reply(base,{error:'Sign in before saving Observatory changes.'},401);
  const raw=await request.text();if(raw.length>24000)return reply(base,{error:'This Observatory entry is too large.'},400);
  const {operation,record,expectedRevision,commandId}=JSON.parse(raw);
  if(!uuid(commandId)||!Number.isInteger(expectedRevision)||expectedRevision<0||!record||typeof record!=='object'||Array.isArray(record))return reply(base,{error:'The Observatory command was not valid.'},400);
  const read=await client.rpc('read_astrology');if(read.error)throw read.error;const before=read.data as unknown as AstrologySnapshot;
  let payload:Record<string,unknown>;
  if(operation==='profile-save'){
   const p=record.profile as BirthProfile;validateBirthProfile(p);
   const profile:BirthProfile={date:p.date,time:p.accuracy==='unknown'?'':p.time,accuracy:p.accuracy,uncertaintyMinutes:p.accuracy==='approximate'?p.uncertaintyMinutes:0,...(p.fold?{fold:p.fold}:{}),place:p.place?{id:String(p.place.id??'manual').slice(0,100),name:p.place.name.trim(),latitude:p.place.latitude,longitude:p.place.longitude,timeZone:p.place.timeZone}:null,zodiac:'tropical',houseSystem:'whole-sign'};
   payload={id:before.profile?.id??commandId,profile,chartId:commandId,chart:calculateNatal(profile)};
  }else if(operation==='profile-delete'||operation==='chart-delete'||operation==='history-clear'){
   if(record.confirmation!=='DELETE')return reply(base,{error:'Confirm this deletion explicitly.'},400);payload={confirmation:'DELETE'};
  }else if(operation==='journal-save'){
   if(!uuid(record.id)||!validDate(record.date)||!validTimeZone(record.time_zone)||typeof record.title!=='string'||record.title.length>160||typeof record.text!=='string'||record.text.length>10000)return reply(base,{error:'Choose a valid journal date and keep the title/text within their limits.'},400);
   let reference:AstrologyReference|null=null;const previous=before.journal.find(item=>item.id===record.id);
   if(record.reference){
    const r=record.reference;
    // Existing historical links can outlive a deleted chart; retain the user's reflection.
    if(previous?.reference&&r.type===previous.reference.type&&r.id===previous.reference.id)reference=previous.reference;
    else if(r.type==='library'&&libraryEntry(r.id)){const entry=libraryEntry(r.id)!;reference={type:'library',id:entry.id,title:entry.title};}
    else if(r.type==='placement'&&before.chart){const body=planetIds.find(id=>r.id===`${before.chart!.id}/${id}`),placement=before.chart.payload.placements.find(p=>p.body===body);if(placement)reference={type:'placement',id:r.id,title:`${placement.body} · ${placement.possibleSigns.join(' / ')}`};}
    else if(r.type==='event'&&validDate(r.date)){const events=cosmicEvents(r.date.slice(0,7),record.time_zone),event=events.find(e=>e.id===r.id);if(event)reference={type:'event',id:event.id,title:event.title,date:r.date,instant:event.instant};}
    // A reflection written beside a horoscope: the reference is rebuilt from its id (sign, period, first day), so no
    // provider text can be stored, and a forecast whose period has not begun cannot be reflected on.
    else if(r.type==='forecast'){const parts=parseForecastReferenceId(r.id);if(parts&&forecastReferenceAllowed(parts,todayInTimeZone(record.time_zone)))reference=forecastReference(parts);}
    if(!reference)return reply(base,{error:'That linked item is unavailable. Keep your text and choose an available item or an unlinked reflection.'},400);
   }
   if(!record.text.trim()&&!reference)return reply(base,{error:'Write a reflection or select an item to keep.'},400);
   payload={id:record.id,date:record.date,time_zone:record.time_zone,title:record.title.trim(),text:record.text.trim(),reference};
  }else if(operation==='journal-delete'){
   if(!uuid(record.id)||!before.journal.some(item=>item.id===record.id))return reply(base,{error:'The saved journal item is unavailable. Reload before changing it.'},409);payload={id:record.id};
  }else if(operation==='activity'){
   const reference=record.reference_id;
   if(typeof reference!=='string'||!(record.kind==='library-viewed'&&libraryEntry(reference)||record.kind==='chart-explored'&&before.chart&&planetIds.some(body=>reference===`${before.chart!.id}/${body}`)))return reply(base,{error:'Choose an available chart placement or library entry.'},400);
   payload={kind:record.kind,reference_id:reference};
  }else return reply(base,{error:'This Observatory action is unavailable.'},400);
  const result=await client.rpc('write_astrology',{p_user_id:data.user.id,p_operation:operation,p_record:payload as import('@/lib/database.types').Json,p_expected_revision:expectedRevision,p_command_id:commandId});
  if(result.error){if(result.error.code==='40001')return reply(base,{error:'Your Observatory changed elsewhere. Keep your draft and reload the latest saved record.'},409);throw result.error;}
  const latest=await client.rpc('read_astrology');if(latest.error)throw latest.error;const snapshot=latest.data as unknown as AstrologySnapshot,receipt=result.data as {revision?:number;id?:string;deleted?:boolean};
  if(operation==='profile-save'&&snapshot.profile?.revision!==receipt.revision||operation==='journal-save'&&!snapshot.journal.some(item=>item.id===receipt.id&&item.revision===receipt.revision)||operation==='profile-delete'&&snapshot.profile||operation==='chart-delete'&&snapshot.chart||operation==='journal-delete'&&snapshot.journal.some(item=>item.id===receipt.id))return reply(base,{error:'A newer Observatory change was found after saving. Keep your draft and reload.'},409);
  return reply(base,{snapshot,receipt});
 }catch(error){if(error instanceof SyntaxError)return reply(base,{error:'This Observatory command could not be read.'},400);return reply(base,{error:error instanceof Error&&!('code' in error)?error.message:'This Observatory save is unconfirmed. Keep your draft and retry.'},503);}
}
