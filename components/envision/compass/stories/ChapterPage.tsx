"use client";
import { useState } from "react";
import { MuseModal } from "@/components/MuseModal";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseOverflowMenu } from "@/components/MuseOverflowMenu";
import { blankChapter, blankExperience, chapterStatus, closingPrompts, rangeLabel, statusLabels, type Chapter, type ClosingAnswers } from "@/lib/inner-compass/stories";
import { copyContent, itemHeadline, type Ref } from "@/lib/inner-compass/modules";
import type { VisionBoard } from "@/lib/vision-boards/model";
import type { Compass } from "../useInnerCompass";
import type { Stories } from "./useStories";
import { CoverArt, CoverPicker } from "./Cover";
import { ModuleBoard } from "./ModuleBoard";
import { withUpload, useRefSources, SaveAsDiscovery, AreasField, shortDate } from "./shared";
import { ReflectionComposer, ReflectionList } from "../Reflections";
import { ExperienceTile } from "./Experiences";
import { plural } from "../parts";

/** One Chapter: its cover and words, the modules the person chose, and the gentle rituals of closing and carrying forward. */
export function ChapterPage({ c, stories, compass, boards, today, onBack, onOpenChapter, onOpenExperience }: {
  c: Chapter; stories: Stories; compass: Compass; boards: VisionBoard[]; today: string; onBack: () => void; onOpenChapter: (id: string) => void; onOpenExperience: (id: string) => void;
}) {
  const [dialog, setDialog] = useState<"details" | "cover" | "close" | "carry" | "delete" | null>(null), [opener, setOpener] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState<string | null>(null), [reflecting, setReflecting] = useState(false), [quick, setQuick] = useState("");
  const open = (d: typeof dialog) => { setOpener(document.activeElement as HTMLElement | null); setDialog(d); };
  const status = chapterStatus(c, today);
  const refs = useRefSources(compass, boards);
  const sources = withUpload(refs, today, (f) => stories.upload(c.id, f));
  const areas = compass.areas.filter((a) => stories.areasOf({ chapterId: c.id }).includes(a.id));
  const linked = stories.chapterExperiences.filter((j) => j.a === c.id).sort((a, b) => a.position - b.position).map((j) => stories.experiences.find((e) => e.id === j.b)).filter((e): e is NonNullable<typeof e> => !!e);
  const reflections = compass.reflections.filter((r) => r.chapterId === c.id);
  const origin = { kind: "chapter" as const, id: c.id, label: c.title };
  const saveDiscovery = (text: string) => { setOpener(document.activeElement as HTMLElement | null); setSaving(text); };
  const actions = [
    { id: "details", label: "Edit details", onSelect: () => open("details") },
    { id: "primary", label: c.isPrimary ? "No longer my primary chapter" : "Make my primary chapter", onSelect: () => void stories.makePrimary(c.isPrimary ? null : c) },
    { id: "daily", label: c.showOnDaily ? "Hide from the Daily Edit" : "Show on the Daily Edit", onSelect: () => void stories.saveChapter({ ...c, showOnDaily: !c.showOnDaily }) },
    status === "completed" && c.closedAt ? { id: "reopen", label: "Reopen this chapter", onSelect: () => void stories.saveChapter({ ...c, closedAt: null }) } : { id: "close", label: "Close this chapter…", onSelect: () => open("close") },
    { id: "carry", label: "Carry forward into a new chapter…", onSelect: () => open("carry") },
    { id: "archive", label: c.archivedAt ? "Restore from the archive" : "Archive", onSelect: () => void stories.saveChapter({ ...c, archivedAt: c.archivedAt ? null : new Date().toISOString(), isPrimary: c.archivedAt ? c.isPrimary : false }) },
    { id: "delete", label: "Delete…", destructive: true, onSelect: () => open("delete") },
  ];

  return <article className="muse-stories-page" aria-labelledby="chapter-title">
    <button type="button" className="muse-stories-back" onClick={onBack}><svg viewBox="0 0 8 12" width="7" height="10" aria-hidden="true"><path d="m6.5 1-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg> All chapters</button>
    <header className="muse-stories-hero">
      <CoverArt cover={c.cover} boards={boards} size="lg" className="muse-stories-hero-cover">
        <p className="muse-stories-current-kicker">{c.isPrimary ? "Primary · " : ""}{statusLabels[status]} chapter</p>
        <h2 id="chapter-title" className="muse-stories-current-title">{c.title}</h2>
        {c.subtitle && <p className="muse-stories-current-subtitle">{c.subtitle}</p>}
        {c.word && c.word !== c.title && <p className="muse-stories-word">{c.word}</p>}
        <p className="muse-stories-current-range type-numeric">{rangeLabel(c.startsOn, c.endsOn)}</p>
      </CoverArt>
      <div className="muse-stories-hero-tools">
        <button type="button" className="muse-button" onClick={() => open("cover")}><MuseIcon name="appearance" size={15} /> Cover</button>
        <button type="button" className="muse-button" onClick={() => open("details")}><MuseIcon name="edit" size={15} /> Details</button>
        <MuseOverflowMenu label="Chapter options" actions={actions} />
      </div>
    </header>

    <div className="muse-stories-meta">
      {c.isPrimary && <span className="muse-compass-chip" data-on>Primary chapter</span>}
      {c.showOnDaily && <span className="muse-compass-chip">On the Daily Edit</span>}
      {areas.map((a) => <span key={a.id} className="muse-compass-chip" data-quiet><span className="muse-compass-area-dot" style={{ background: a.color }} aria-hidden="true" /> {a.label}</span>)}
      {c.carriedFrom ? <button type="button" className="text-button" onClick={() => onOpenChapter(c.carriedFrom!)}>Carried forward from {c.carriedFromTitle}</button> : c.carriedFromTitle && <span className="muse-compass-quiet">Carried forward from {c.carriedFromTitle}</span>}
    </div>
    {c.meaning && <p className="muse-stories-meaning">{c.meaning}</p>}
    {c.closedAt && <section className="muse-stories-closing" aria-label="Closing reflections">
      <p className="muse-kicker">Closed {shortDate(c.closedAt)}</p>
      {closingPrompts.filter((p) => c.closing[p.key]).map((p) => <div key={p.key}><h4>{p.text}</h4><p>{c.closing[p.key]}</p></div>)}
      {!Object.keys(c.closing).length && <p className="muse-compass-quiet">Closed without words, which is a fine way to close.</p>}
      <div className="muse-compass-hero-actions"><button type="button" className="muse-button" onClick={() => open("carry")}>Carry something forward</button><button type="button" className="text-button" onClick={() => void stories.saveChapter({ ...c, closedAt: null })}>Reopen</button></div>
    </section>}

    <ModuleBoard owner="chapter" ownerId={c.id} ownerLabel={c.title} stories={stories} sources={sources} addLabel="Add to chapter" onSaveDiscovery={saveDiscovery}
      linked={(type) => type === "experiences" ? <div className="muse-stories-linked-exps">
        {linked.length ? <ul className="muse-stories-exp-tiles">{linked.map((e) => <li key={e.id}><ExperienceTile e={e} boards={boards} onOpen={() => onOpenExperience(e.id)} />
          <button type="button" className="text-button" onClick={() => void stories.unlinkChapter(c.id, e.id)}>Unlink</button></li>)}</ul> : <p className="muse-compass-quiet">Moments from this season. Each stays its own record, wherever else it appears.</p>}
        <div className="muse-compass-hero-actions">
          <form className="muse-stories-quick" onSubmit={async (ev) => { ev.preventDefault(); if (!quick.trim()) return; const e = await stories.createExperience({ ...blankExperience(), title: quick.trim(), happenedOn: today }, { chapterId: c.id }); if (e) setQuick(""); }}>
            <label className="sr-only" htmlFor="chapter-quick-exp">New experience</label><input id="chapter-quick-exp" maxLength={200} value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="A new experience…" />
            <button type="submit" className="muse-button" disabled={!quick.trim()}>Add</button></form>
          {stories.experiences.filter((e) => !linked.some((x) => x.id === e.id) && !e.archivedAt).length > 0 && <MuseChoiceMenu label="Link an experience" valueLabel="＋ Link an existing experience" variant="chip" icon="link" searchable selectedIds={[]}
            options={stories.experiences.filter((e) => !linked.some((x) => x.id === e.id) && !e.archivedAt).map((e) => ({ id: e.id, label: e.happenedOn ? `${e.title} · ${e.happenedOn}` : e.title }))} onSelect={(id) => void stories.linkChapter(c.id, id)} />}
        </div>
      </div> : type === "reflections" ? <div className="muse-stories-linked-reflections">
        {reflecting ? <ReflectionComposer compass={compass} today={today} about={{ chapterId: c.id, chapterTitle: c.title }} images={{ upload: (f) => stories.upload(c.id, f) }} onDone={() => setReflecting(false)} />
          : <button type="button" className="muse-button" onClick={() => setReflecting(true)}><MuseIcon name="notes" size={15} /> Write a reflection</button>}
        <ReflectionList compass={compass} today={today} items={reflections} images={{ upload: (f) => stories.upload(c.id, f) }} onSaveDiscovery={saveDiscovery} />
        {!reflections.length && !reflecting && <p className="muse-compass-quiet">What am I noticing? What feels different from when I began? No schedule, no streaks.</p>}
      </div> : null} />

    {dialog === "cover" && <CoverPicker cover={c.cover} boards={boards} title={c.title} returnFocus={opener} onClose={() => setDialog(null)} upload={(f) => stories.upload(c.id, f)}
      onSave={async (cover) => { const before = c.cover.image; const s = await stories.saveChapter({ ...c, cover }); if (s && before && before.path !== cover.image?.path) await stories.forgetImages([before]); return s; }} />}
    {dialog === "details" && <ChapterDetails c={c} stories={stories} compass={compass} returnFocus={opener} onClose={() => setDialog(null)} />}
    {dialog === "close" && <CloseChapter c={c} stories={stories} today={today} returnFocus={opener} onClose={() => setDialog(null)} onCarry={() => setDialog("carry")} />}
    {dialog === "carry" && <CarryForward c={c} stories={stories} today={today} returnFocus={opener} onClose={() => setDialog(null)} onCreated={(id) => { setDialog(null); onOpenChapter(id); }} />}
    {dialog === "delete" && <MuseModal id="muse-delete-chapter" label="Delete chapter" title="Delete this chapter?" returnFocus={opener} onClose={() => setDialog(null)}>
      <div className="muse-compass-editor"><p>“{c.title}” and its modules will be deleted. Its {plural(linked.length, "linked experience")} stay in My Experiences, and reflections keep their words. Archiving keeps everything instead.</p>
        <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={() => setDialog(null)}>Keep it</button><button type="button" className="muse-button muse-compass-danger" onClick={async () => { if (await stories.removeChapter(c)) onBack(); }}>Delete chapter</button></div></div>
    </MuseModal>}
    {saving !== null && <SaveAsDiscovery text={saving} origin={origin} compass={compass} returnFocus={opener} onClose={() => setSaving(null)} />}
  </article>;
}

function ChapterDetails({ c, stories, compass, returnFocus, onClose }: { c: Chapter; stories: Stories; compass: Compass; returnFocus: HTMLElement | null; onClose: () => void }) {
  const [d, setD] = useState(c), [areas, setAreas] = useState(stories.areasOf({ chapterId: c.id }));
  return <MuseModal id="muse-chapter-details" label="Chapter details" title="Chapter details" returnFocus={returnFocus} onClose={onClose} size="tall">
    <form className="muse-compass-editor" onSubmit={async (e) => { e.preventDefault(); if (!d.title.trim()) return; const s = await stories.saveChapter(d); if (!s) return; await stories.setAreasFor({ chapterId: c.id }, areas); if (d.isPrimary !== c.isPrimary) await stories.makePrimary(d.isPrimary ? s : null); onClose(); }}>
      <div className="muse-compass-fields">
        <label className="muse-compass-statement"><span>Name</span><input required maxLength={160} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
        <label><span>Subtitle <small className="small-label">· optional</small></span><input maxLength={200} value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} /></label>
        <label><span>Guiding word <small className="small-label">· optional</small></span><input maxLength={60} value={d.word} onChange={(e) => setD({ ...d, word: e.target.value })} /></label>
        <label><span>What this chapter means to me <small className="small-label">· optional</small></span><textarea rows={4} maxLength={4000} value={d.meaning} onChange={(e) => setD({ ...d, meaning: e.target.value })} /></label>
        <div className="muse-compass-row2"><label><span>Begins</span><input type="date" value={d.startsOn ?? ""} onChange={(e) => setD({ ...d, startsOn: e.target.value || null })} /></label>
          <label><span>Ends <small className="small-label">· empty means open-ended</small></span><input type="date" min={d.startsOn ?? undefined} value={d.endsOn ?? ""} onChange={(e) => setD({ ...d, endsOn: e.target.value || null })} /></label></div>
        <AreasField compass={compass} value={areas} onChange={setAreas} />
        <label className="muse-compass-check"><input type="checkbox" checked={d.isPrimary} onChange={(e) => setD({ ...d, isPrimary: e.target.checked })} /><span>My primary chapter (only one at a time)</span></label>
        <label className="muse-compass-check"><input type="checkbox" checked={d.showOnDaily} onChange={(e) => setD({ ...d, showOnDaily: e.target.checked })} /><span>Show it on the Daily Edit, with its word and featured mantras</span></label>
      </div>
      <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!d.title.trim() || stories.status.saving}>Save</button></div>
    </form>
  </MuseModal>;
}

/** Closing is optional and gentle: every prompt can be skipped, and the Chapter can be reopened any time. */
function CloseChapter({ c, stories, today, returnFocus, onClose, onCarry }: { c: Chapter; stories: Stories; today: string; returnFocus: HTMLElement | null; onClose: () => void; onCarry: () => void }) {
  const [answers, setAnswers] = useState<ClosingAnswers>(c.closing), [setEnd, setSetEnd] = useState(!c.endsOn), [done, setDone] = useState(false);
  return <MuseModal id="muse-close-chapter" label="Close this chapter" title={`Closing “${c.title}”`} returnFocus={returnFocus} onClose={onClose} size="tall">
    {done ? <div className="muse-compass-editor"><p>Closed and kept, exactly as it was. You can reopen it whenever you like.</p>
      <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onCarry}>Carry something forward</button><button type="button" className="muse-button button-primary" onClick={onClose}>Done</button></div></div>
      : <form className="muse-compass-editor" onSubmit={async (e) => { e.preventDefault(); const s = await stories.saveChapter({ ...c, closing: answers, closedAt: new Date().toISOString(), endsOn: c.endsOn ?? (setEnd ? (c.startsOn && c.startsOn > today ? c.startsOn : today) : null), isPrimary: false }); if (s) setDone(true); }}>
        <p className="muse-compass-quiet">Answer any, all or none. Everything in the chapter stays exactly as it is.</p>
        {closingPrompts.map((p) => <label key={p.key}><span>{p.text}</span><textarea rows={2} maxLength={6000} value={answers[p.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [p.key]: e.target.value || undefined })} /></label>)}
        {!c.endsOn && <label className="muse-compass-check"><input type="checkbox" checked={setEnd} onChange={(e) => setSetEnd(e.target.checked)} /><span>Mark today as its last day</span></label>}
        <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Not yet</button><button type="submit" className="muse-button button-primary" disabled={stories.status.saving}>Close chapter</button></div>
      </form>}
  </MuseModal>;
}

/** Carry Forward: choose words, mantras, intentions and discoveries to begin a new Chapter with, keeping where each came from. */
function CarryForward({ c, stories, today, returnFocus, onClose, onCreated }: { c: Chapter; stories: Stories; today: string; returnFocus: HTMLElement | null; onClose: () => void; onCreated: (id: string) => void }) {
  const mods = stories.modulesOf("chapter", c.id).filter((m) => ["words", "mantras", "intentions", "discoveries"].includes(m.type));
  const choices = mods.flatMap((m) => m.type === "discoveries" ? (m.content.refs ?? []).map((r) => ({ key: `${m.id}:${r.id}`, m, label: r.label, ref: r as Ref | undefined, itemId: undefined as string | undefined }))
    : (m.content.items ?? []).filter((i) => itemHeadline(m.type, i)).map((i) => ({ key: `${m.id}:${i.id}`, m, label: itemHeadline(m.type, i), ref: undefined, itemId: i.id })));
  const [picked, setPicked] = useState<Set<string>>(new Set()), [name, setName] = useState("");
  const kind = (t: string) => t === "words" ? "Guiding word" : t === "mantras" ? "Mantra" : t === "intentions" ? "Intention" : "Discovery";
  async function go() {
    const t = name.trim(); if (!t) return;
    const next = await stories.saveChapter({ ...blankChapter(), title: t, startsOn: today, carriedFrom: c.id, carriedFromTitle: c.title });
    if (!next) return;
    let pos = 0;
    for (const m of mods) {
      const chosen = choices.filter((x) => x.m.id === m.id && picked.has(x.key)); if (!chosen.length) continue;
      const content = m.type === "discoveries" ? { refs: chosen.map((x) => x.ref!) } : copyContent(m.type, { items: (m.content.items ?? []).filter((i) => chosen.some((x) => x.itemId === i.id)) }, { id: c.id, label: c.title });
      await stories.saveModule({ id: crypto.randomUUID(), owner: { kind: "chapter", id: next.id }, type: m.type, position: pos++, title: m.title, collapsed: false, content, revision: 0, updatedAt: "" });
    }
    onCreated(next.id);
  }
  return <MuseModal id="muse-carry-forward" label="Carry forward" title="Carry forward" returnFocus={returnFocus} onClose={onClose} size="tall">
    <form className="muse-compass-editor" onSubmit={(e) => { e.preventDefault(); void go(); }}>
      <p className="muse-compass-quiet">Begin a new chapter with a few things from “{c.title}”. They’re copied with a note of where they came from; this chapter keeps its own.</p>
      <label className="muse-compass-statement"><span>New chapter name</span><input required autoFocus maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder="The Next Season" /></label>
      {choices.length ? <fieldset className="muse-stories-carry"><legend>Bring along</legend>{choices.map((x) => <label key={x.key} className="muse-compass-check"><input type="checkbox" checked={picked.has(x.key)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(x.key); else n.delete(x.key); return n; })} /><span><small className="muse-stories-label">{kind(x.m.type)}</small> {x.label}</span></label>)}</fieldset>
        : <p className="muse-compass-quiet">This chapter has no guiding words, mantras, intentions or discoveries yet. You can still begin the next one.</p>}
      <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!name.trim() || stories.status.saving}>Begin the new chapter</button></div>
    </form>
  </MuseModal>;
}
