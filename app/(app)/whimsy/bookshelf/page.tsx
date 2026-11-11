import {Suspense} from 'react';
import {redirect} from 'next/navigation';

type Search=Promise<Record<string,string|string[]|undefined>>;
async function Resolve({searchParams}:{searchParams:Search}):Promise<null>{
 const params=await searchParams,book=typeof params.book==='string'?params.book:undefined;
 redirect(params.view==='atlas'?'/collections/reading-atlas':book?`/collections/books/${encodeURIComponent(book)}`:'/collections?kind=book');
}
/** The retired standalone Bookshelf (#136): Books live in Collections; the Atlas keeps its own address. */
export default function Page({searchParams}:{searchParams:Search}){return <Suspense fallback={null}><Resolve searchParams={searchParams}/></Suspense>;}
