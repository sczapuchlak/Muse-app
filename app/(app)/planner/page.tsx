import { Suspense } from "react";
import { Planner } from "@/components/planner/Planner";

export default function PlannerPage() {
  return <Suspense fallback={<main className="muse-page" aria-busy="true"><h1>Planner</h1><p>Opening your plan…</p></main>}><Planner /></Suspense>;
}
