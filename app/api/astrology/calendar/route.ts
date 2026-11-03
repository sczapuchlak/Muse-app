import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin} from '@/lib/auth/http';
import {cosmicEvents} from '@/lib/astrology/calculations';
export async function POST(request:NextRequest){const base=privateResponse(NextResponse.json({}));try{
 if(!trustedOrigin(request))return privateResponse(NextResponse.json({error:'Use Muse from its configured origin.'},{status:403}));
 const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();if(error||!data.user)return privateResponse(NextResponse.json({error:'Sign in to open the Cosmic Calendar.'},{status:401}));
 const text=await request.text();if(text.length>512)throw Error('Choose a valid month.');const {month}=JSON.parse(text);
 const profile=await client.from('profiles').select('time_zone').eq('id',data.user.id).single();if(profile.error)throw profile.error;
 const response=privateResponse(NextResponse.json({events:cosmicEvents(month,profile.data.time_zone),timeZone:profile.data.time_zone}));for(const cookie of base.cookies.getAll())response.cookies.set(cookie);return response;
 }catch{return privateResponse(NextResponse.json({error:'The celestial events could not be calculated for that month. Choose a month between 1800 and 2200, or retry.'},{status:400}));}}
