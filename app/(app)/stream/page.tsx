import {Suspense} from "react";
import type {Metadata} from "next";
import {Stream} from "@/components/stream/Stream";

export const metadata:Metadata={title:"Stream of Consciousness · Muse"};
export default function Page(){return <Suspense fallback={<main className="muse-page" role="status" aria-busy="true">Tuning into the stream…</main>}><Stream/></Suspense>;}
