import { Suspense } from "react";
import { Nourish } from "@/components/nourish/Nourish";
export default function NourishPage(){return <Suspense fallback={<main className="muse-page" aria-busy="true"><h1>Nourish</h1><p>Opening your meal plan…</p></main>}><Nourish/></Suspense>;}
