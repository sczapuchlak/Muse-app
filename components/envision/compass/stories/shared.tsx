"use client";
import { useMemo, useState } from "react";
import { MuseModal } from "@/components/MuseModal";
import { useWhimsyData } from "@/components/whimsy/WhimsyData";
import { categoryInfo, type Category } from "@/lib/inner-compass/categories";
import { blankDiscovery, LIMITS } from "@/lib/inner-compass/model";
import type { Ref, RefKind } from "@/lib/inner-compass/modules";
import type { VisionBoard } from "@/lib/vision-boards/model";
import type { BoardImage } from "@/lib/constellation-board";
import type { Compass } from "../useInnerCompass";
import { CategoryChips, AreaPicker } from "../parts";
import type { RefSource, Sources } from "./Fields";

const short = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

/** Every reference picker reads records where they live. Nothing is copied except a name (and date) snapshot. */
export function useRefSources(compass: Compass, boards: VisionBoard[]): Record<RefKind, RefSource> {
  const { records } = useWhimsyData();
  return useMemo(() => {
    const discoveries: Ref[] = compass.discoveries.filter((d) => !d.archivedAt).map((d) => ({ id: d.id, label: d.title, category: d.category }));
    const visions: Ref[] = boards.map((b) => ({ id: b.id, label: b.title || "Untitled Vision", category: b.format === "book" ? "book" : "board" }));
    const explorations: Ref[] = compass.responses.map((r) => ({ id: r.id, label: r.explorationTitle, date: r.completedOn }));
    const tarot: Ref[] = (records?.tarot ?? []).map((t) => ({ id: t.id, label: t.question?.trim() || "A reading", date: t.date }));
    const dreams: Ref[] = (records?.dreams ?? []).map((d) => ({ id: d.id, label: d.title?.trim() || d.text.slice(0, 60) || "A dream", date: d.date }));
    const by = (list: Ref[]) => (id: string) => list.find((x) => x.id === id);
    return {
      discovery: { options: discoveries, live: by(discoveries), href: (r) => `/envision?view=inner-compass&d=${r.id}`, noun: "Connect a discovery", empty: "No discoveries yet. They live in My Inner World." },
      vision: { options: visions, live: by(visions), href: (r) => `/envision?view=vision-boards&board=${r.id}`, noun: "Link a Vision", empty: "No Visions yet. Make one in Envision → Visions." },
      exploration: { options: explorations, live: by(explorations), href: () => "/envision?view=inner-compass&space=explore", noun: "Link an exploration", empty: "Answer an exploration in My Inner World, then link it here." },
      tarot: { options: tarot, live: by(tarot), href: () => "/whimsy/tarot", noun: "Link a reading", empty: "No saved Tarot readings yet." },
      dream: { options: dreams, live: by(dreams), href: () => "/whimsy/dreamscapes", noun: "Link a dream", empty: "No saved dreams yet." },
    };
  }, [compass.discoveries, compass.responses, boards, records]);
}
export const withUpload = (refs: Record<RefKind, RefSource>, today: string, upload: (file: File) => Promise<BoardImage | null>): Sources => ({ ...refs, today, upload });
export const shortDate = short;

/**
 * "Save as Inner World discovery": the person chooses the collection and the words; the Chapter or Experience it came
 * from is kept as its origin. Muse never proposes or infers a discovery.
 */
export function SaveAsDiscovery({ text, origin, compass, onClose, returnFocus }: { text: string; origin: { kind: "chapter" | "experience"; id: string; label: string }; compass: Compass; onClose: () => void; returnFocus: HTMLElement | null }) {
  const [category, setCategory] = useState<Category>("beliefs"), [title, setTitle] = useState(text.slice(0, LIMITS.title)), [meaning, setMeaning] = useState(""), [done, setDone] = useState(false);
  return <MuseModal id="muse-save-discovery" label="Save as a discovery" title="Save as an Inner World discovery" returnFocus={returnFocus} onClose={onClose}>
    <form className="muse-compass-editor muse-stories-save-discovery" onSubmit={async (e) => { e.preventDefault(); if (!title.trim()) return; const s = await compass.save({ ...blankDiscovery(category), title: title.trim(), meaning, source: origin }); if (s) setDone(true); }}>
      {done ? <><p>Saved to {categoryInfo[category].title}, with “{origin.label}” kept as where it came from.</p><div className="muse-compass-form-actions"><button type="button" className="muse-button button-primary" onClick={onClose}>Done</button></div></>
        : <>
          <CategoryChips value={category} onChange={setCategory} />
          <label className="muse-compass-statement"><span>{categoryInfo[category].statement}</span><textarea rows={2} required maxLength={LIMITS.title} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
          <label><span>What it means to me <small className="small-label">· optional</small></span><textarea rows={3} maxLength={LIMITS.meaning} value={meaning} onChange={(e) => setMeaning(e.target.value)} /></label>
          <p className="muse-compass-quiet">From {origin.kind === "chapter" ? "the Chapter" : "the Experience"} “{origin.label}”.</p>
          <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!title.trim() || compass.status.saving}>Save discovery</button></div>
        </>}
    </form>
  </MuseModal>;
}

/** Life Atlas areas for a Chapter or Experience: descriptive links only, never ratings. */
export function AreasField({ compass, value, onChange }: { compass: Compass; value: string[]; onChange: (ids: string[]) => void }) {
  return <AreaPicker areas={compass.areas} value={value} onChange={onChange} />;
}
