import {NextResponse,type NextRequest} from "next/server";
import {authConfig} from "@/lib/auth/config";
import {privateResponse,routeAuthClient,trustedOrigin} from "@/lib/auth/http";
import {returnCookie,safeReturnPath,validLoginEmail} from "@/lib/auth/paths";
export async function POST(request:NextRequest){
  try{
    if(!trustedOrigin(request))return privateResponse(NextResponse.json({error:"Please send this form from Muse’s sign-in page."},{status:403}));
    const raw=await request.text();
    if(raw.length>4096)return privateResponse(NextResponse.json({error:"The sign-in request is too large."},{status:413}));
    const json=request.headers.get("content-type")?.includes("application/json");
    let input:{email?:unknown;next?:unknown};
    try{input=json?JSON.parse(raw):Object.fromEntries(new URLSearchParams(raw));}catch{return privateResponse(NextResponse.json({error:"Enter a valid email address."},{status:400}));}
    if(!input||!validLoginEmail(input.email))return privateResponse(NextResponse.json({error:"Enter a valid email address."},{status:400}));
    const {origin}=authConfig();
    const response=privateResponse(json?NextResponse.json({ok:true}):NextResponse.redirect(new URL("/login?notice=sent",origin),303));
    const client=routeAuthClient(request,response);
    const {error}=await client.auth.signInWithOtp({email:input.email.trim(),options:{shouldCreateUser:false,emailRedirectTo:`${origin}/auth/confirm`}});
    if(error){
      if(["over_email_send_rate_limit","over_request_rate_limit"].includes(error.code??"")){
        const limited=NextResponse.json({error:"Please wait a minute before requesting another link."},{status:429});limited.headers.set("Retry-After","60");return privateResponse(limited);
      }
      // A missing invitation must not reveal whether a particular email has an account.
      if(!["otp_disabled","user_not_found","email_not_confirmed"].includes(error.code??""))return privateResponse(NextResponse.json({error:"Sign-in is temporarily unavailable. Please try again."},{status:503}));
    }
    response.cookies.set(returnCookie,safeReturnPath(input.next),{path:"/",httpOnly:true,sameSite:"lax",secure:origin.startsWith("https:"),maxAge:600});
    return response;
  }catch{return privateResponse(NextResponse.json({error:"Sign-in is unavailable. Please try again later."},{status:503}));}
}
