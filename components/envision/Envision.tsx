"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MusePageHeader } from "../MusePageHeader";
import { MuseSectionNav } from "../MuseSectionNav";
import { useDailyData } from "../daily/DailyData";
import { useMuseToday } from "../useMuseToday";
import { Aspirations } from "./aspirations/Aspirations";
import { BucketList } from "./bucket/BucketList";
import { VisionBoards } from "./vision/VisionBoards";
import { envisionTabs, parseEnvisionTab } from "@/lib/envision";
import "./Envision.css";

/**
 * Envision (#117): the home for Muse's future-facing experiences. Aspirations and the Bucket List moved here from
 * Rituals unchanged (same components, records and settings); Vision Boards (#118) lives in ./vision.
 */
function EnvisionView() {
  const { profile } = useDailyData();
  const today = useMuseToday(profile.timeZone);
  const view = parseEnvisionTab(useSearchParams()?.get("view"));
  return <main className="muse-page muse-envision-page">
    <MusePageHeader title="Envision" />
    <MuseSectionNav label="Envision views" current={view} items={envisionTabs.map((t) => ({ id: t.id, label: t.label, href: t.id === "aspirations" ? "/envision" : `/envision?view=${t.id}` }))} />
    {view === "aspirations" && <Aspirations />}
    {view === "vision-boards" && (today ? <VisionBoards today={today} /> : <p className="small-label" role="status">Loading…</p>)}
    {view === "bucket" && (today ? <BucketList today={today} /> : <p className="small-label" role="status">Loading…</p>)}
    <footer className="muse-footer">Everything in Envision is private and saves to your account.</footer>
  </main>;
}

export function Envision() { return <Suspense fallback={<main className="muse-page muse-envision-page" aria-busy="true"><h1>Envision</h1></main>}><EnvisionView /></Suspense>; }
