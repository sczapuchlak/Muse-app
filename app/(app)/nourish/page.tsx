import { Suspense } from "react";
import { Nourish } from "@/components/nourish/Nourish";
export default function NourishPage(){return <Suspense fallback={<main className="muse-page" aria-busy="true"><h1>Wellness</h1><p>Opening Wellness…</p></main>}><Nourish/></Suspense>;}
