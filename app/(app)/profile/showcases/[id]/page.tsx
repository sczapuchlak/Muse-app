import {Suspense} from 'react';
import {ShowcaseStudio} from '@/components/profile/ShowcaseStudio';
/** The studio reads its starter idea from the URL, so it renders inside a Suspense boundary. */
export default function Page(){return <Suspense fallback={<main className="muse-page" aria-busy="true"><p className="small-label">Opening the studio…</p></main>}><ShowcaseStudio/></Suspense>;}
