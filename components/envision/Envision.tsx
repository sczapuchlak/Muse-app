"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MusePageHeader } from "../MusePageHeader";
import { MuseSectionNav } from "../MuseSectionNav";
import { MuseStar } from "../MuseStar";
import { useDailyData } from "../daily/DailyData";
import { useMuseToday } from "../useMuseToday";
import { Aspirations } from "./aspirations/Aspirations";
import { BucketList } from "./bucket/BucketList";
import { envisionTabs, parseEnvisionTab } from "@/lib/envision";
import "./Envision.css";

/**
 * Envision (#117): the home for Muse's future-facing experiences. Aspirations and the Bucket List moved here from
 * Rituals unchanged (same components, records and settings); Vision Boards is the next feature's destination.
 */
function EnvisionView() {
  const { profile } = useDailyData();
  const today = useMuseToday(profile.timeZone);
  const view = parseEnvisionTab(useSearchParams()?.get("view"));
  return <main className="muse-page muse-envision-page">
    <MusePageHeader title="Envision" />
    <MuseSectionNav label="Envision views" current={view} items={envisionTabs.map((t) => ({ id: t.id, label: t.label, href: t.id === "aspirations" ? "/envision" : `/envision?view=${t.id}` }))} />
    {view === "aspirations" && <Aspirations />}
    {view === "vision-boards" && <VisionBoardsEmpty />}
    {view === "bucket" && (today ? <BucketList today={today} /> : <p className="small-label" role="status">Loading…</p>)}
    <footer className="muse-footer">Everything in Envision is private and saves to your account.</footer>
  </main>;
}

/** Vision Boards isn't built yet: an honest, inviting empty state — no placeholder editor or pretend controls. */
function VisionBoardsEmpty() {
  return <section className="muse-envision-empty" aria-labelledby="muse-vision-boards-title">
    <div className="muse-envision-collage" aria-hidden="true">
      <span data-tile="sky" /><span data-tile="word">dream</span><span data-tile="bloom" /><span data-tile="photo" /><span data-tile="word" data-alt>bold</span><span data-tile="sun" />
      <MuseStar size={22} prismatic className="muse-envision-collage-star" />
    </div>
    <div className="muse-envision-empty-copy">
      <p className="muse-envision-kicker">Vision Boards <MuseStar size={13} prismatic /></p>
      <h2 id="muse-vision-boards-title">A canvas for the life you’re imagining</h2>
      <p>Vision Boards are coming next: collage pictures, words and color into a board for a season, a dream or a whole year, and connect it to an Aspiration or your Intentions when you want to.</p>
      <p className="muse-envision-quiet">Until then, your <Link href="/envision">Aspirations</Link> and <Link href="/envision?view=bucket">Bucket List</Link> are ready, and <Link href="/planner?view=intentions">Intentions</Link> in Planner can hold what this chapter is about.</p>
    </div>
  </section>;
}

export function Envision() { return <Suspense fallback={<main className="muse-page muse-envision-page" aria-busy="true"><h1>Envision</h1></main>}><EnvisionView /></Suspense>; }
