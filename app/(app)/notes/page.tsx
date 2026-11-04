import {Suspense} from 'react';
import {Notes} from '@/components/notes/Notes';
export const metadata={title:'Mindspace · Muse'};
export default function Page(){return <Suspense fallback={null}><Notes/></Suspense>;}
