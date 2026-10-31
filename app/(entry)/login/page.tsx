import {Suspense} from "react";
import {MuseLogin} from "@/components/auth/MuseLogin";
import {safeReturnPath} from "@/lib/auth/paths";
async function LoginContent({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;
  return <MuseLogin notice={typeof query.notice==="string"?query.notice:""} next={safeReturnPath(query.next)}/>;
}
export default function Page(props:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  return <Suspense fallback={<MuseLogin/>}><LoginContent {...props}/></Suspense>;
}
