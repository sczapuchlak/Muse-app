import "server-only";
import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
import type {Database} from "@/lib/database.types";
import {localAuthConfig} from "./config";
export function privateResponse<T extends NextResponse>(response:T):T {
  response.headers.set("Cache-Control","private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma","no-cache");response.headers.set("Expires","0");
  response.headers.set("Referrer-Policy","no-referrer");
  return response;
}
export function routeAuthClient(request:NextRequest,response:NextResponse) {
  const {url,key}=localAuthConfig();
  return createServerClient<Database>(url,key,{cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(values,headers){
      for(const {name,value,options}of values)response.cookies.set(name,value,options);
      for(const [name,value]of Object.entries(headers))response.headers.set(name,value);
    },
  }});
}
export function trustedOrigin(request:NextRequest) {
  return request.headers.get("origin") === localAuthConfig().origin;
}
export function clearAuthCookies(request:NextRequest,response:NextResponse) {
  const {url}=localAuthConfig();
  const prefix=`sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  for(const {name}of request.cookies.getAll())if(name===prefix||name.startsWith(`${prefix}.`)||name.startsWith(`${prefix}-`))response.cookies.set(name,"",{path:"/",maxAge:0,sameSite:"lax"});
  response.cookies.set("muse-auth-return","",{path:"/",maxAge:0,httpOnly:true,sameSite:"lax"});
}
