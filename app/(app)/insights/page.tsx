import {Suspense} from 'react';
import {Insights} from '@/components/insights/Insights';
export default function Page(){return <Suspense fallback={<main className="muse-page" aria-busy="true"><h1>Insights</h1><p>A little perspective is on its way…</p></main>}><Insights/></Suspense>;}
