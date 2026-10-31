import {NextResponse,type NextRequest} from "next/server";
import {localAuthConfig} from "@/lib/auth/config";
import {privateResponse,routeAuthClient} from "@/lib/auth/http";
import {returnCookie,safeReturnPath} from "@/lib/auth/paths";
export async function GET(request:NextRequest){
  let origin="http://localhost:3000";
  try{
    origin=localAuthConfig().origin;
    const token=request.nextUrl.searchParams.get("token_hash"),type=request.nextUrl.searchParams.get("type");
    if(!token||token.length>512||!['email','invite'].includes(type??'')||!/^[a-zA-Z0-9_-]+$/.test(token))return privateResponse(NextResponse.redirect(new URL("/login?notice=invalid-link",origin)));
    const destination=safeReturnPath(request.cookies.get(returnCookie)?.value??request.nextUrl.searchParams.get("next"));
    const response=privateResponse(NextResponse.redirect(new URL(destination,origin)));
    const client=routeAuthClient(request,response);
    const {error}=await client.auth.verifyOtp({token_hash:token,type:type as "email"|"invite"});
    if(error){
      const unavailable=error.name==="AuthRetryableFetchError"||Number(error.status)>=500;
      return privateResponse(NextResponse.redirect(new URL(`/login?notice=${unavailable?'unavailable':'link-expired'}`,origin)));
    }
    response.cookies.set(returnCookie,"",{path:"/",httpOnly:true,sameSite:"lax",maxAge:0});
    return response;
  }catch{return privateResponse(NextResponse.redirect(new URL("/login?notice=unavailable",origin)));}
}
