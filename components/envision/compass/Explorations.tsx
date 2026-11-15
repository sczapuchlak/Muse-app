"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { MuseModal } from "@/components/MuseModal";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseMark } from "@/components/design/MuseHeading";
import { categoryInfo, type Category } from "@/lib/inner-compass/categories";
import { explorations, exploration as find, themes, themeOrder, type Exploration, type ExplorationTheme } from "@/lib/inner-compass/library";
import { blankDiscovery, LIMITS, type Answer, type Discovery, type Response } from "@/lib/inner-compass/model";
import type { Compass } from "./useInnerCompass";
import { CategoryChips, ink, plural, shortDate } from "./parts";
import { ReflectionComposer, ReflectionList } from "./Reflections";

export const themeArt = (t: ExplorationTheme) => t === "identity" ? { glyph: "compass" as const, tone: 2 as const } : { glyph: categoryInfo[t].glyph, tone: categoryInfo[t].tone };
export const themeInk = (t: ExplorationTheme) => { const { tone } = themeArt(t); return { "--compass-ink": `var(--chart-${tone})`, "--compass-ink-b": `var(--chart-${tone % 8 + 1})` } as CSSProperties; };
export function ThemeMark({ theme, size = "sm" }: { theme: ExplorationTheme; size?: "sm" | "md" | "lg" }) { const a = themeArt(theme); return <MuseMark icon={a.glyph} tone={a.tone} size={size} />; }

/** The library of guided explorations: invitations, not assessments. Answer one prompt or all of them. */
export function Explorations({ compass, featured, onBegin, onRevisit }: { compass: Compass; featured: Exploration; onBegin: (key: string) => void; onRevisit: (id: string) => void }) {
  const [theme, setTheme] = useState<ExplorationTheme | "all">("all");
  const doneCount = useMemo(() => { const m = new Map<string, number>(); for (const r of compass.responses) m.set(r.explorationKey, (m.get(r.explorationKey) ?? 0) + 1); return m; }, [compass.responses]);
  const list = explorations.filter((e) => theme === "all" || e.category === theme);
  return <section className="muse-compass-explore" aria-labelledby="compass-explore-title">
    <article className="muse-compass-invite" style={themeInk(featured.category)}>
      <div>
        <p className="muse-kicker"><ThemeMark theme={featured.category} /> Today’s invitation · {themes[featured.category].label}</p>
        <h2 id="compass-explore-title" className="muse-compass-invite-title">{featured.title}</h2>
        <p className="muse-compass-invite-intro">{featured.intro}</p>
        <p className="muse-compass-invite-first"><span>First question</span> {featured.prompts[0].text}</p>
        <div className="muse-compass-hero-actions"><button type="button" className="muse-button button-primary" onClick={() => onBegin(featured.key)}><MuseIcon name="sparkle" size={15} /> Begin</button><span className="muse-compass-quiet">{plural(featured.prompts.length, "question")} · answer as few as you like</span></div>
      </div>
      <InviteArt />
    </article>

    <div className="muse-chip-row muse-compass-cats" role="group" aria-label="Themes" data-scroll>
      <button type="button" aria-pressed={theme === "all"} onClick={() => setTheme("all")}>All <small className="type-numeric">{explorations.length}</small></button>
      {themeOrder.map((t) => <button key={t} type="button" style={themeInk(t)} aria-pressed={theme === t} onClick={() => setTheme(t)}><ThemeMark theme={t} /> {themes[t].label}</button>)}
    </div>
    {theme !== "all" && <p className="muse-compass-collection-line">{themes[theme].line}</p>}
    <ul className="muse-compass-explore-grid">{list.map((e) => { const n = doneCount.get(e.key) ?? 0; return <li key={e.key} style={themeInk(e.category)}>
      <button type="button" className="muse-compass-explore-card" onClick={() => onBegin(e.key)}>
        <span className="muse-compass-card-top"><ThemeMark theme={e.category} /><span className="muse-compass-card-kind">{themes[e.category].label}</span>{n > 0 && <span className="muse-compass-chip">Explored{n > 1 ? ` ×${n}` : ""}</span>}</span>
        <span className="muse-compass-card-title">{e.title}</span>
        <span className="muse-compass-card-meaning">{e.intro}</span>
        <span className="muse-compass-card-foot"><span className="type-numeric">{plural(e.prompts.length, "question")}</span></span>
      </button>
    </li>; })}</ul>

    <section className="muse-compass-past" aria-labelledby="compass-past-title">
      <h3 id="compass-past-title" className="muse-compass-subhead">Explorations you’ve answered</h3>
      {compass.responses.length ? <ol className="muse-compass-past-list">{compass.responses.map((r) => { const e = find(r.explorationKey); return <li key={r.id} style={themeInk(e?.category ?? "identity")}>
        <button type="button" onClick={() => onRevisit(r.id)}><ThemeMark theme={e?.category ?? "identity"} /><span className="muse-compass-past-title">{r.explorationTitle}</span><span className="muse-compass-quiet type-numeric">{shortDate(r.completedOn)} · {plural(r.answers.length, "answer")}</span></button>
      </li>; })}</ol> : <p className="muse-compass-quiet">When you answer an exploration, it’s kept here to reread or continue. Leaving without saving keeps nothing.</p>}
    </section>
  </section>;
}

function InviteArt() {
  return <svg className="muse-compass-invite-art" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="86" className="muse-compass-invite-ring" /><circle cx="100" cy="100" r="62" className="muse-compass-invite-ring" data-dash />
    <path d="M100 30C103 88 112 97 170 100C112 103 103 112 100 170C97 112 88 103 30 100C88 97 97 88 100 30Z" className="muse-compass-invite-star" />
    <circle cx="150" cy="52" r="2.4" /><circle cx="44" cy="146" r="1.8" /><circle cx="160" cy="150" r="1.4" /><circle cx="56" cy="58" r="1.6" />
    <path d="M150 52 160 150M44 146 56 58" className="muse-compass-invite-line" />
  </svg>;
}

type Keep = { on: boolean; category: Category; title: string };
const firstSentence = (s: string) => (s.trim().match(/^[^.!?\n]{1,300}[.!?]?/)?.[0] ?? s.trim()).slice(0, LIMITS.title);

/**
 * One exploration, start to finish: a quiet introduction, the prompts on one page, and the option to keep any answer
 * as a discovery (in the collection it belongs to, in words the person can edit first). Closing before saving keeps
 * nothing. Reopening a past response lets the person reread, continue or reflect on it.
 */
export function ExplorationSession({ explorationKey, responseId, compass, today, onClose, onOpen, returnFocus }: { explorationKey?: string; responseId?: string; compass: Compass; today: string; onClose: () => void; onOpen: (id: string) => void; returnFocus: HTMLElement | null }) {
  const existing = responseId ? compass.responses.find((r) => r.id === responseId) : undefined;
  const e = find(existing?.explorationKey ?? explorationKey ?? "");
  const [stage, setStage] = useState<"intro" | "write" | "kept">(existing ? "write" : "intro");
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries((existing?.answers ?? []).map((a) => [a.key, a.text])));
  const [keep, setKeep] = useState<Record<string, Keep>>({}), [reflection, setReflection] = useState(existing?.reflection ?? "");
  const [leaving, setLeaving] = useState(false), [saved, setSaved] = useState<{ response: Response; kept: Discovery[] } | null>(null), [reflecting, setReflecting] = useState(false), [deleting, setDeleting] = useState(false);
  const response = saved?.response ?? existing;
  const keptBefore = response ? compass.discoveries.filter((d) => d.source?.kind === "exploration" && d.source.id === response.id) : [];
  if (!e && !existing) return null;
  const title = e?.title ?? existing!.explorationTitle;
  // Prompts as they were asked for a saved response; today's library otherwise (or for prompts it never answered).
  const prompts = e ? e.prompts.map((p) => ({ key: p.key, text: existing?.answers.find((a) => a.key === p.key)?.prompt || p.text })) : existing!.answers.map((a) => ({ key: a.key, text: a.prompt }));
  const touched = Object.values(answers).some((v) => v.trim()) || reflection.trim() !== (existing?.reflection ?? "").trim();
  const dirty = existing ? touched && (prompts.some((p) => (answers[p.key] ?? "") !== (existing.answers.find((a) => a.key === p.key)?.text ?? "")) || reflection !== existing.reflection) : touched;
  const close = () => { if (dirty && !saved && !leaving) setLeaving(true); else onClose(); };
  const saveAs = e?.saveAs ?? "patterns";

  async function save() {
    const list: Answer[] = prompts.map((p) => ({ key: p.key, prompt: p.text, text: answers[p.key] ?? "" })).filter((a) => a.text.trim());
    const r = await compass.saveResponse(existing ? { ...existing, answers: list, reflection } : { id: crypto.randomUUID(), explorationKey: e!.key, explorationTitle: e!.title, answers: list, reflection, completedOn: today, revision: 0, createdAt: "", updatedAt: "" });
    if (!r) return;
    const now = new Date().toISOString();
    const discoveries = Object.entries(keep).filter(([k, v]) => v.on && v.title.trim() && answers[k]?.trim()).map(([k, v]) => ({ ...blankDiscovery(v.category, now), title: v.title.trim(), meaning: v.title.trim() === answers[k].trim() ? "" : answers[k].trim().slice(0, LIMITS.meaning), source: { kind: "exploration" as const, id: r.id, label: r.explorationTitle } }));
    const kept = discoveries.length ? await compass.saveMany(discoveries) ?? [] : [];
    setSaved({ response: r, kept }); setKeep({}); setStage("kept");
  }

  return <MuseModal id="muse-compass-session" label={title} returnFocus={returnFocus} onClose={close} size="tall">
    <div className="muse-compass-session" style={themeInk(e?.category ?? "identity")}>
      {leaving && <div className="muse-compass-confirm" role="alertdialog" aria-label="Leave without saving?"><p>Leave without saving? What you’ve written here will be let go.</p><div><button type="button" className="muse-button" onClick={() => setLeaving(false)}>Keep writing</button><button type="button" className="muse-button" onClick={onClose}>Leave</button></div></div>}
      {stage === "intro" && e && <div className="muse-compass-session-intro">
        <p className="muse-kicker"><ThemeMark theme={e.category} size="md" /> {themes[e.category].label}</p>
        <h2>{e.title}</h2>
        <p className="muse-compass-session-lede">{e.intro}</p>
        <ol className="muse-compass-session-preview">{e.prompts.map((p) => <li key={p.key}>{p.text}</li>)}</ol>
        <p className="muse-compass-quiet">Answer as many as you like, in as few words as you like. Nothing is saved unless you choose to save it.</p>
        <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Not now</button><button type="button" className="muse-button button-primary" onClick={() => setStage("write")}>Begin</button></div>
      </div>}

      {stage === "write" && <form className="muse-compass-session-write" onSubmit={(ev) => { ev.preventDefault(); void save(); }}>
        <header><p className="muse-kicker">{e ? <><ThemeMark theme={e.category} /> {themes[e.category].label}</> : "Exploration"}{existing ? ` · ${shortDate(existing.completedOn)}` : ""}</p><h2>{title}</h2></header>
        <ol className="muse-compass-prompts">{prompts.map((p, i) => { const k = keep[p.key], text = answers[p.key] ?? ""; return <li key={p.key}>
          <label htmlFor={`compass-prompt-${p.key}`}><span className="muse-compass-prompt-n type-numeric" aria-hidden="true">{i + 1}</span><span className="muse-compass-prompt-text">{p.text}</span></label>
          <textarea id={`compass-prompt-${p.key}`} rows={3} maxLength={LIMITS.answer} value={text} onChange={(ev) => setAnswers((a) => ({ ...a, [p.key]: ev.target.value }))} />
          {text.trim() && (k?.on
            ? <div className="muse-compass-keep" style={ink(k.category)}>
                <p className="muse-compass-keep-head"><span>Keep as a discovery in</span><button type="button" className="text-button" onClick={() => setKeep((m) => ({ ...m, [p.key]: { ...k, on: false } }))}>Don’t keep</button></p>
                <CategoryChips value={k.category} onChange={(category) => setKeep((m) => ({ ...m, [p.key]: { ...k, category } }))} />
                <label><span className="sr-only">Discovery statement</span><textarea rows={2} maxLength={LIMITS.title} value={k.title} onChange={(ev) => setKeep((m) => ({ ...m, [p.key]: { ...k, title: ev.target.value } }))} /></label>
                <p className="muse-compass-quiet">Shorten it to the heart of it, if you like. Your full answer becomes its meaning.</p>
              </div>
            : <button type="button" className="text-button muse-compass-keep-toggle" onClick={() => setKeep((m) => ({ ...m, [p.key]: { on: true, category: k?.category ?? saveAs, title: k?.title || firstSentence(text) } }))}><MuseIcon name="sparkle" size={13} /> Keep as a discovery</button>)}
        </li>; })}</ol>
        <label className="muse-compass-session-reflect"><span>Anything else, in your own words <small className="small-label">· optional</small></span><textarea rows={4} maxLength={LIMITS.reflection} value={reflection} onChange={(ev) => setReflection(ev.target.value)} /></label>
        {keptBefore.length > 0 && <KeptList kept={keptBefore} onOpen={onOpen} />}
        <div className="muse-compass-form-actions">
          {existing && (deleting
            ? <span className="muse-compass-quiet">Delete this response? Discoveries you kept from it stay. <button type="button" className="text-button" onClick={() => setDeleting(false)}>Keep</button> <button type="button" className="text-button muse-compass-danger-text" onClick={async () => { if (await compass.removeResponse(existing.id)) onClose(); }}>Delete</button></span>
            : <button type="button" className="text-button muse-compass-danger-text" onClick={() => setDeleting(true)}><MuseIcon name="trash" size={13} /> Delete response</button>)}
          <button type="button" className="muse-button" onClick={close}>{existing ? "Close" : "Leave without saving"}</button>
          <button type="submit" className="muse-button button-primary" disabled={!Object.values(answers).some((v) => v.trim()) || compass.status.saving}>{existing ? "Save changes" : "Save exploration"}</button>
        </div>
      </form>}

      {stage === "kept" && saved && <div className="muse-compass-session-kept">
        <p className="muse-kicker">Saved · {shortDate(saved.response.completedOn)}</p>
        <h2>{title}</h2>
        <p>{plural(saved.response.answers.length, "answer")} kept. {saved.kept.length ? `${plural(saved.kept.length, "new discovery", "new discoveries")} joined your Inner World.` : "You can reread or continue it any time from Explorations."}</p>
        {saved.kept.length > 0 && <KeptList kept={saved.kept} onOpen={onOpen} />}
        <section className="muse-compass-detail-section">
          <h3>Reflections</h3>
          {reflecting ? <ReflectionComposer compass={compass} today={today} about={{ responseId: saved.response.id }} onDone={() => setReflecting(false)} />
            : <button type="button" className="muse-button" onClick={() => setReflecting(true)}><MuseIcon name="notes" size={15} /> Reflect on this</button>}
          <ReflectionList compass={compass} today={today} items={compass.reflections.filter((r) => r.responseId === saved.response.id)} />
        </section>
        <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={() => setStage("write")}>Reread my answers</button><button type="button" className="muse-button button-primary" onClick={onClose}>Done</button></div>
      </div>}
    </div>
  </MuseModal>;
}

function KeptList({ kept, onOpen }: { kept: Discovery[]; onOpen: (id: string) => void }) {
  return <section className="muse-compass-detail-section"><h3>Kept as discoveries</h3>
    <ul className="muse-compass-refs">{kept.map((d) => <li key={d.id} style={ink(d.category)}><button type="button" className="muse-compass-ref" onClick={() => onOpen(d.id)}>{categoryInfo[d.category].title.replace("My ", "")} · {d.title}</button></li>)}</ul>
  </section>;
}
