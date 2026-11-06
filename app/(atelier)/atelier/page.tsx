import type {Metadata} from 'next';
import {connection} from 'next/server';
import {Suspense} from 'react';
import {requireUser} from '@/lib/auth/user';
import {AtelierStudio} from '@/components/atelier/AtelierStudio';
export const metadata:Metadata={title:'Theme Atelier · Muse'};
type Params=Promise<{theme?:string|string[];base?:string|string[]}>;

async function Studio({searchParams}:{searchParams:Params}){
 await connection();const user=await requireUser();const params=await searchParams;
 const one=(value:string|string[]|undefined)=>typeof value==='string'?value:undefined;
 const theme=one(params.theme),base=one(params.base);
 return <AtelierStudio key={theme??base??'new'} userId={user.id} themeId={theme&&/^[0-9a-f-]{36}$/i.test(theme)?theme:undefined} base={base}/>;
}
export default function Page({searchParams}:{searchParams:Params}){
 return <Suspense fallback={<main className="muse-page" role="status" aria-busy="true">Opening the atelier…</main>}><Studio searchParams={searchParams}/></Suspense>;
}
