import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
import type {Database} from "@/lib/database.types";
import {authConfig} from "@/lib/auth/config";
import {privateResponse} from "@/lib/auth/http";
import {isPublicAuthPath,safeReturnPath} from "@/lib/auth/paths";

export async function proxy(request:NextRequest) {
  let response=NextResponse.next({request});
  const path=request.nextUrl.pathname;
  let origin:string|undefined;
  try {
    const configuration=authConfig();
    const {url,key}=configuration;origin=configuration.origin;
    if(request.nextUrl.origin!==origin){
      if(!['GET','HEAD'].includes(request.method))return privateResponse(NextResponse.json({error:'Use the configured Muse origin.'},{status:403}));
      const canonical=new URL(origin);canonical.pathname=path;canonical.search=request.nextUrl.search;
      return privateResponse(NextResponse.redirect(canonical));
    }
    if(isPublicAuthPath(path)&&path!=="/login")return privateResponse(response);
    const client=createServerClient<Database>(url,key,{cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll(values,headers){
        for(const {name,value}of values)request.cookies.set(name,value);
        const previous=response.cookies.getAll();
        response=NextResponse.next({request});
        for(const cookie of previous)response.cookies.set(cookie);
        for(const {name,value,options}of values)response.cookies.set(name,value,{...options,secure:configuration.origin.startsWith("https:")});
        for(const [name,value]of Object.entries(headers))response.headers.set(name,value);
      },
    }});
    const {data,error}=await client.auth.getUser();
    const destination=new URL("/login",origin);
    if(!data.user&&path!=="/login"){
      destination.searchParams.set("next",safeReturnPath(`${path}${request.nextUrl.search}`));
      if(error?.name==="AuthRetryableFetchError"||Number(error?.status)>=500)destination.searchParams.set("notice","unavailable");
    }else if(data.user&&path==="/login"){
      const target=new URL(safeReturnPath(request.nextUrl.searchParams.get("next")),origin);
      const redirect=NextResponse.redirect(target);
      for(const cookie of response.cookies.getAll())redirect.cookies.set(cookie);
      return privateResponse(redirect);
    }else return privateResponse(response);
    const redirect=NextResponse.redirect(destination);
    for(const cookie of response.cookies.getAll())redirect.cookies.set(cookie);
    return privateResponse(redirect);
  }catch{
    // Public sign-in can explain unavailable configuration. Never render private content on failure.
    if(!origin)return privateResponse(NextResponse.json({error:'Sign-in configuration is unavailable.'},{status:503}));
    if(isPublicAuthPath(path))return privateResponse(response);
    return privateResponse(NextResponse.redirect(new URL('/login?notice=unavailable',origin)));
  }
}
export const config={matcher:["/((?!_next/|favicon.ico|atmosphere/|(?:window|globe|next|vercel|file)\\.svg$).*)"]};
