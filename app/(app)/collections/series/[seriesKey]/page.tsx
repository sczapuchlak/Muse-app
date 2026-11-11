import {Suspense} from 'react';
import {SeriesRoute} from '@/components/collections/SeriesRoute';

type Params=Promise<{seriesKey:string}>;
async function Series({params}:{params:Params}){const {seriesKey}=await params;return <SeriesRoute seriesKey={decodeURIComponent(seriesKey)}/>;}
/** A book series in Collections (#136): a saved series id, or `<source>-<id>` for a catalog series. */
export default function Page({params}:{params:Params}){
 return <Suspense fallback={<main className="muse-page muse-series-route" aria-busy="true"/>}><Series params={params}/></Suspense>;
}
