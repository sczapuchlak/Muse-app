import {Suspense} from 'react';
import {Insights} from '@/components/insights/Insights';
import {InsightsGlance} from '@/components/insights/glance/InsightsGlance';
import {CLASSIC_INSIGHTS} from '@/lib/insights/flags';
// #97: Life at a Glance is the Insights page. The detailed Insights stay intact behind CLASSIC_INSIGHTS (lib/insights/flags.ts).
export default function Page(){return <Suspense fallback={<main className="muse-page" aria-busy="true"><h1>Insights</h1><p>A little perspective is on its way…</p></main>}>{CLASSIC_INSIGHTS?<Insights/>:<InsightsGlance/>}</Suspense>;}
