import { Suspense } from "react";
import { Money } from "@/components/money/Money";

export default function Page() { return <Suspense fallback={<main className="muse-page"><p>Opening Money…</p></main>}><Money/></Suspense>; }
