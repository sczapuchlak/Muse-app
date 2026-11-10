import {Suspense} from 'react';
import {BookRoute} from '@/components/collections/BookRoute';

type Params=Promise<{bookId:string}>;
async function Book({params}:{params:Params}){const {bookId}=await params;return <BookRoute bookId={decodeURIComponent(bookId)}/>;}
/** A book's own page in Collections (#136). */
export default function Page({params}:{params:Params}){
 return <Suspense fallback={<main className="muse-page muse-book-route" aria-busy="true"/>}><Book params={params}/></Suspense>;
}
