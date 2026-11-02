import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin} from '@/lib/auth/http';
import {returnCookie,safeReturnPath,validLoginEmail} from '@/lib/auth/paths';

export async function POST(request:NextRequest){
  const failure=(error:string,status:number)=>privateResponse(NextResponse.json({error},{status}));
  try{
    if(!trustedOrigin(request))return failure('Verify your code from Muse’s sign-in page.',403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return failure('Use the verification form.',415);
    const reader=request.body?.getReader();let raw='',size=0;
    if(reader){const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return failure('The verification request is too large.',413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
    let input:{email?:unknown;code?:unknown;next?:unknown};try{input=JSON.parse(raw);}catch{return failure('Enter your email and six-digit code.',400);}
    if(!input||!validLoginEmail(input.email)||typeof input.code!=='string'||!/^\d{6}$/.test(input.code))return failure('Enter your email and six-digit code.',400);
    const next=safeReturnPath(request.cookies.get(returnCookie)?.value??input.next);
    const response=privateResponse(NextResponse.json({ok:true,next}));
    const client=routeAuthClient(request,response);
    const {data,error}=await client.auth.verifyOtp({email:input.email.trim(),token:input.code,type:'email'});
    if(error){
      if(error.status===429||['over_request_rate_limit','over_email_send_rate_limit'].includes(error.code??'')){
        const limited=failure('Too many attempts. Please wait a minute before trying again.',429);limited.headers.set('Retry-After','60');return limited;
      }
      if(error.name==='AuthRetryableFetchError'||Number(error.status)>=500)return failure('Verification is temporarily unavailable. Keep your code and try again.',503);
      return failure('That code is incorrect, expired, or already used. Check the latest email or request a new code.',400);
    }
    if(!data.user||!data.session)return failure('Sign-in could not be confirmed. Please try again.',503);
    response.cookies.set(returnCookie,'',{path:'/',maxAge:0,httpOnly:true,sameSite:'lax'});
    return response;
  }catch{return failure('Couldn’t verify your code. Please try again.',503);}
}
