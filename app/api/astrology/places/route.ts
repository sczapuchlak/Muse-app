import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin} from '@/lib/auth/http';
import {searchBirthplaces} from '@/lib/astrology/places';
export async function POST(request:NextRequest){
 const base=privateResponse(NextResponse.json({}));
 try{
  if(!trustedOrigin(request))return privateResponse(NextResponse.json({error:'Use Muse from its configured origin.'},{status:403}));
  const client=routeAuthClient(request,base),{data,error}=await client.auth.getUser();
  if(error||!data.user)return privateResponse(NextResponse.json({error:'Sign in to search birthplaces.'},{status:401}));
  const body=await request.text();if(body.length>1024)return privateResponse(NextResponse.json({error:'Keep the place name under 100 characters.'},{status:400}));
  const parsed=JSON.parse(body);if(typeof parsed.query!=='string'||parsed.query.length>100)return privateResponse(NextResponse.json({error:'Enter a place name.'},{status:400}));
  const response=privateResponse(NextResponse.json({places:searchBirthplaces(parsed.query),source:'GeoNames · CC BY 4.0'}));
  for(const cookie of base.cookies.getAll())response.cookies.set(cookie);return response;
 }catch{return privateResponse(NextResponse.json({error:'Birthplace search could not load. You can enter coordinates and a timezone manually.'},{status:503}));}
}
