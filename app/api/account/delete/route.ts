import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin,clearAuthCookies} from '@/lib/auth/http';
import {createMuseAdminClient} from '@/lib/supabase/admin';
import {deleteConfirmedAccount,validDeletionConfirmation} from '@/lib/auth/account-deletion';

export async function POST(request:NextRequest){
  let sessionResponse:NextResponse|undefined;
  function failure(message:string,status:number){
    const result=privateResponse(NextResponse.json({error:message},{status}));
    for(const cookie of sessionResponse?.cookies.getAll()??[])result.cookies.set(cookie);
    return result;
  }
  try{
    if(!trustedOrigin(request))return privateResponse(NextResponse.json({error:'Delete your account from Muse’s Settings page.'},{status:403}));
    const response=privateResponse(NextResponse.json({ok:true,notice:'account-deleted'}));sessionResponse=response;
    const client=routeAuthClient(request,response),{data,error}=await client.auth.getUser();
    if(error||!data.user){
      const unavailable=error?.name==='AuthRetryableFetchError'||Number(error?.status)>=500;
      const denied=failure(unavailable?'Account verification is temporarily unavailable.':'Sign in before deleting your account.',unavailable?503:401);
      if(!unavailable)clearAuthCookies(request,denied);
      return denied;
    }
    if(!request.headers.get('content-type')?.startsWith('application/json'))return failure('Use the account confirmation form.',415);
    // Bound the stream before parsing. A caller cannot submit a target ID or bulk operation.
    const reader=request.body?.getReader();let raw='',size=0;
    if(reader){const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();return failure('Confirmation is too large.',413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
    let confirmation:unknown;try{confirmation=JSON.parse(raw);}catch{return failure('Type DELETE to confirm account deletion.',400);}
    if(!validDeletionConfirmation(confirmation))return failure('Type DELETE to confirm account deletion. No account identifier is accepted.',400);
    const admin=createMuseAdminClient();
    await deleteConfirmedAccount(data.user.id,admin.auth.admin);
    clearAuthCookies(request,response);
    response.headers.set('Clear-Site-Data','"cache"');
    return response;
  }catch{return failure('Account deletion was not confirmed. Your account may still exist. Retry or reload to check your session.',503);}
}
