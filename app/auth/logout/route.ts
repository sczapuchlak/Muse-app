import {NextResponse,type NextRequest} from "next/server";
import {authConfig} from "@/lib/auth/config";
import {clearAuthCookies,privateResponse,routeAuthClient,trustedOrigin} from "@/lib/auth/http";
export async function POST(request:NextRequest){
  try{
    if(!trustedOrigin(request))return privateResponse(NextResponse.json({error:"Sign out from Muse’s page."},{status:403}));
    const {origin}=authConfig(),json=request.headers.get("accept")?.includes("application/json");
    const response=privateResponse(json?NextResponse.json({ok:true,notice:"signed-out"}):NextResponse.redirect(new URL("/login?notice=signed-out",origin),303));
    let notice="signed-out";
    try{
      const {error}=await routeAuthClient(request,response).auth.signOut({scope:"local"});
      if(error&&error.name!=="AuthSessionMissingError")notice="signed-out-local";
    }catch{notice="signed-out-local";}
    clearAuthCookies(request,response);
    if(notice!=="signed-out"){
      if(json){const local=privateResponse(NextResponse.json({ok:true,notice}));for(const cookie of response.cookies.getAll())local.cookies.set(cookie);return local;}
      response.headers.set("Location",new URL(`/login?notice=${notice}`,origin).href);
    }
    return response;
  }catch{return privateResponse(NextResponse.json({error:"Couldn’t finish signing out. Please try again."},{status:503}));}
}
