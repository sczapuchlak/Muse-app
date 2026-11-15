"use client";
import { useMemo, useState } from "react";
import { MuseModal } from "@/components/MuseModal";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseSearch } from "@/components/design/MuseSearch";
import { categoryInfo } from "@/lib/inner-compass/categories";
import { families, wordLibrary } from "@/lib/inner-compass/library";
import { blankDiscovery, type Discovery } from "@/lib/inner-compass/model";
import type { Compass } from "./useInnerCompass";
import { CategoryMark, ink, plural } from "./parts";

type Pick = { word: string; gloss: string; stance?: string; meaning: string };
type Step = "explore" | "narrow" | "define";
const label = { values: "Values garden", character: "Character garden" } as const;

/**
 * The optional Values (or Character) exercise: explore a curated library, gather the words that resonate, sort them
 * loosely, define them in your own words, keep them. There is no ranking and no limit of five; you can come back
 * any time for more. Words you already hold are shown as yours and aren't added twice.
 */
export function WordGarden({ kind, compass, onClose, returnFocus }: { kind: "values" | "character"; compass: Compass; onClose: () => void; returnFocus: HTMLElement | null }) {
  const info = categoryInfo[kind], library = wordLibrary[kind];
  const owned = useMemo(() => new Set(compass.discoveries.filter((d) => d.category === kind).map((d) => d.title.trim().toLowerCase())), [compass.discoveries, kind]);
  const [step, setStep] = useState<Step>("explore"), [query, setQuery] = useState(""), [family, setFamily] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]), [own, setOwn] = useState(""), [leaving, setLeaving] = useState(false), [done, setDone] = useState<number | null>(null);
  const has = (w: string) => picks.some((p) => p.word.toLowerCase() === w.toLowerCase());
  const toggle = (word: string, gloss: string) => setPicks((list) => has(word) ? list.filter((p) => p.word.toLowerCase() !== word.toLowerCase()) : [...list, { word, gloss, meaning: "" }]);
  const shown = library.filter((w) => (!family || w.family === family) && (!query.trim() || `${w.word} ${w.gloss}`.toLowerCase().includes(query.trim().toLowerCase())));
  const patch = (word: string, p: Partial<Pick>) => setPicks((list) => list.map((x) => x.word === word ? { ...x, ...p } : x));
  const close = () => { if (picks.length && done === null && !leaving) setLeaving(true); else onClose(); };

  async function keep() {
    const now = new Date().toISOString();
    const list: Discovery[] = picks.filter((p) => !owned.has(p.word.toLowerCase())).map((p) => ({ ...blankDiscovery(kind, now), title: p.word, meaning: p.meaning.trim(), details: p.stance ? { stance: p.stance } : {}, source: { kind: "garden", id: null, label: label[kind].toLowerCase() } }));
    const saved = await compass.saveMany(list);
    if (saved) setDone(saved.length);
  }

  return <MuseModal id="muse-compass-garden" label={label[kind]} returnFocus={returnFocus} onClose={close} size="tall">
    <div className="muse-compass-garden" style={ink(kind)}>
      <header className="muse-compass-garden-head">
        <p className="muse-kicker"><CategoryMark category={kind} /> {label[kind]}</p>
        <h2>{done !== null ? "Planted." : step === "explore" ? (kind === "values" ? "Which words feel true?" : "Which qualities are yours, or calling to you?") : step === "narrow" ? "Gather them loosely" : "In your own words"}</h2>
        <ol className="muse-compass-steps" aria-label="Steps">{(["explore", "narrow", "define"] as Step[]).map((s, i) => <li key={s} aria-current={step === s && done === null ? "step" : undefined}><span className="type-numeric">{i + 1}</span>{s === "explore" ? "Explore" : s === "narrow" ? "Gather" : "Define"}</li>)}</ol>
      </header>

      {leaving && <div className="muse-compass-confirm" role="alertdialog" aria-label="Leave without saving?"><p>Leave without keeping these {plural(picks.length, "word")}? Nothing has been saved.</p><div><button type="button" className="muse-button" onClick={() => setLeaving(false)}>Stay</button><button type="button" className="muse-button" onClick={onClose}>Leave</button></div></div>}

      {done !== null ? <div className="muse-compass-garden-done">
        <p>{done ? <>{plural(done, info.noun, info.noun === "quality" ? "qualities" : `${info.noun}s`)} added to {info.title}. You can define, connect or evolve each one there, and come back to the garden whenever you like.</> : "Those words were already in your collection, so nothing new was added."}</p>
        <button type="button" className="muse-button button-primary" onClick={onClose}>Back to {info.title}</button>
      </div>
      : step === "explore" ? <>
        <p className="muse-compass-quiet">{kind === "values" ? "Tap any that resonate, even a little. You’re not choosing forever, and there is no limit." : "Choose qualities you recognize in yourself, want to cultivate, are curious about, or have rediscovered."}</p>
        <div className="muse-compass-garden-tools">
          <MuseSearch label="Search words" value={query} onChange={setQuery} placeholder={kind === "values" ? "Freedom, depth, play…" : "Patience, wit, courage…"} />
          <div className="muse-chip-row" role="group" aria-label="Families" data-scroll><button type="button" aria-pressed={!family} onClick={() => setFamily(null)}>All</button>{families(kind).map((f) => <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(family === f ? null : f)}>{f}</button>)}</div>
        </div>
        <ul className="muse-compass-words">{shown.map((w) => { const mine = owned.has(w.word.toLowerCase()); return <li key={`${w.family}-${w.word}`}>
          <button type="button" aria-pressed={has(w.word) || mine} disabled={mine} onClick={() => toggle(w.word, w.gloss)}><b>{w.word}</b><small>{mine ? "Already yours" : w.gloss}</small></button>
        </li>; })}</ul>
        {!shown.length && <p className="muse-compass-quiet">No word in the library matches. Add it as your own below.</p>}
        <form className="muse-compass-own" onSubmit={(e) => { e.preventDefault(); const w = own.trim(); if (w && !has(w) && !owned.has(w.toLowerCase())) toggle(w.slice(0, 60), "Your own word"); setOwn(""); }}>
          <label htmlFor="compass-own-word">A word that isn’t here</label><input id="compass-own-word" maxLength={60} value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Your own word" /><button type="submit" className="muse-button" disabled={!own.trim()}>Add</button>
        </form>
      </>
      : step === "narrow" ? <>
        <p className="muse-compass-quiet">Keep as many as feel true. If it helps, say where each one sits for you; you can leave it blank.</p>
        <ul className="muse-compass-gathered">{picks.map((p) => <li key={p.word}>
          <span className="muse-compass-gathered-word">{p.word}</span>
          <div className="muse-chip-row" role="group" aria-label={`Where ${p.word} sits`} data-scroll>{info.stances!.map((s) => <button key={s.id} type="button" aria-pressed={p.stance === s.id} onClick={() => patch(p.word, { stance: p.stance === s.id ? undefined : s.id })}>{s.label}</button>)}</div>
          <button type="button" className="muse-compass-x" aria-label={`Let go of ${p.word}`} onClick={() => setPicks((l) => l.filter((x) => x.word !== p.word))}>×</button>
        </li>)}</ul>
      </>
      : <>
        <p className="muse-compass-quiet">What does each word mean to you? A phrase is plenty, and you can skip any.</p>
        <ul className="muse-compass-define">{picks.map((p) => <li key={p.word}><label><span><b>{p.word}</b> means, to me…</span><textarea rows={2} maxLength={4000} value={p.meaning} placeholder={p.gloss === "Your own word" ? "" : p.gloss} onChange={(e) => patch(p.word, { meaning: e.target.value })} /></label></li>)}</ul>
      </>}

      {done === null && <footer className="muse-compass-garden-foot">
        <span className="muse-compass-quiet type-numeric">{plural(picks.length, "word")} gathered</span>
        <div>
          {step !== "explore" && <button type="button" className="muse-button" onClick={() => setStep(step === "define" ? "narrow" : "explore")}>Back</button>}
          {step === "explore" && <button type="button" className="muse-button button-primary" disabled={!picks.length} onClick={() => setStep("narrow")}>Gather {picks.length || ""}</button>}
          {step === "narrow" && <button type="button" className="muse-button button-primary" disabled={!picks.length} onClick={() => setStep("define")}>Define them</button>}
          {step === "define" && <button type="button" className="muse-button button-primary" disabled={!picks.length || compass.status.saving} onClick={() => void keep()}><MuseIcon name="sparkle" size={15} /> Keep {plural(picks.length, "word")}</button>}
        </div>
      </footer>}
    </div>
  </MuseModal>;
}
