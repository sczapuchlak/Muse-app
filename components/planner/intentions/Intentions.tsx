"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { createTask } from "@/lib/planner";
import { projectEvents } from "@/lib/planner-occurrences";
import { rhythmLabel } from "@/lib/rituals";
import { intentionName, intentionPeriods, intentionRange, intentionTense, intentionTitle, isIntentionPeriod, shiftIntention, type IntentionPeriod, type IntentionRange } from "@/lib/intentions/periods";
import { canAddItem, chosenIds, kindOf, listPrompts, MAX_SECTIONS, moveSection, newSection, pageHasContent, promptSection, refStatus, removeSection, sectionKinds, seedSections, templates, writingPrompts,
  type IntentionSection, type LinkItem, type Ref, type SectionContent, type SectionKindKey, type SectionType } from "@/lib/intentions/model";
import { deleteIntentions, missingTable, readIntentions, saveIntentions, type IntentionPage } from "@/lib/intentions/persistence";
import { readReview } from "@/lib/reflections/persistence";
import { usePlanner } from "../../PlannerStore";
import { useRitualView } from "../../rituals/ConnectedRituals";
import { useAspirations } from "../../envision/aspirations/useAspirations";
import { useBucketList } from "../../envision/bucket/useBucketList";
import { useVisionBoards } from "../../envision/vision/useVisionBoards";
import { LazyPreview } from "../../envision/vision/BoardThumb";
import { periodLabel } from "@/lib/vision-boards/model";
import { MuseChoiceMenu } from "../../MuseChoiceMenu";
import { PromptLibrary } from "./PromptLibrary";
import { MuseIcon } from "../../MuseIcon";
import { MuseStar } from "../../MuseStar";
import { PeriodTitle } from "../PeriodTitle";
import "../reflections/Reflections.css";
import "./Intentions.css";

type Client = ReturnType<typeof createMuseBrowserClient>;
const uid = () => crypto.randomUUID();
const periodKey = "muse.intentions.period";

/**
 * Planner → Intentions (#117): the "before" to Reflections' "after". One page per week, month, quarter or year,
 * written before living it. Everything is optional; an empty period is simply an empty period.
 */
export function Intentions({ date, today, onDate, requestedPeriod }: { date: string; today: string; onDate: (d: string) => void; requestedPeriod?: string | null }) {
  const clientRef = useRef<Client | null>(null), client = useCallback(() => clientRef.current ??= createMuseBrowserClient(), []);
  const [period, setPeriodState] = useState<IntentionPeriod>(isIntentionPeriod(requestedPeriod) ? requestedPeriod : "month");
  // A link's ?period= wins; otherwise the last period used on this device.
  // A linked period is remembered too, so the next date change (which drops ?period=) keeps it.
  useEffect(() => { const t = window.setTimeout(() => { try { if (isIntentionPeriod(requestedPeriod)) { setPeriodState(requestedPeriod); localStorage.setItem(periodKey, requestedPeriod); return; } const v = localStorage.getItem(periodKey); if (isIntentionPeriod(v)) setPeriodState(v); } catch { /* defaults */ } }, 0); return () => window.clearTimeout(t); }, [requestedPeriod]);
  const setPeriod = (p: IntentionPeriod) => { setPeriodState(p); try { localStorage.setItem(periodKey, p); } catch { /* this device */ } };
  const anchor = date || today;
  const range = useMemo(() => anchor ? intentionRange(period, anchor) : null, [period, anchor]);
  const noun = period;
  // Stepping lands on the period's start, or on today when today is inside it (so switching to Week shows this week).
  const step = (by: number) => { const d = shiftIntention(period, anchor, by), r = intentionRange(period, d); onDate(today && today >= r.start && today <= r.end ? today : d); };
  return <section className="muse-intentions" data-period={period} aria-label="Intentions">
    <div className="muse-reflections-toolbar">
      {range && <PeriodTitle title={intentionTitle(range)} date={anchor} onChange={onDate} />}
      <div className="muse-reflections-tools">
        <div className="muse-segmented" role="group" aria-label="Intention period">{intentionPeriods.map((p) => <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>)}</div>
        <div className="muse-reflections-nav" role="group" aria-label={`Move by ${noun}`}>
          <button type="button" className="muse-button" aria-label={`Previous ${noun}`} onClick={() => step(-1)}>‹</button>
          <button type="button" className="muse-button" disabled={!today} onClick={() => onDate(today)}>This {noun}</button>
          <button type="button" className="muse-button" aria-label={`Next ${noun}`} onClick={() => step(1)}>›</button>
        </div>
      </div>
    </div>
    {range ? <ChapterLoader key={`${period}/${range.start}`} range={range} today={today} client={client} /> : <p className="muse-reflections-quiet" role="status">Opening your planner…</p>}
  </section>;
}

/** One period's page. Keyed by period and start, so moving to another period starts fresh. */
function ChapterLoader({ range, today, client }: { range: IntentionRange; today: string; client: () => Client }) {
  const [page, setPage] = useState<IntentionPage | null | undefined>(undefined), [error, setError] = useState(""), [status, setStatus] = useState("");
  const saved = useRef<IntentionPage | null>(null), pending = useRef<IntentionPage | null>(null), timer = useRef<number | null>(null), queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => { let live = true;
    readIntentions(client(), range.period, range.start).then((p) => { if (live) { saved.current = p; setPage(p); } })
      .catch((e) => { if (live) { setPage(null); setError(missingTable(e) ? "Intentions isn’t available on this server yet. Your tasks and reflections are unaffected." : e instanceof Error ? e.message : "Intentions couldn’t load."); } });
    return () => { live = false; }; }, [client, range.period, range.start]);

  const persist = useCallback((next: IntentionPage) => { queue.current = queue.current.then(async () => { setStatus("Saving…");
    try { const out = await saveIntentions(client(), { ...next, revision: saved.current?.revision ?? 0 }); saved.current = out; setPage((c) => c && c.id === out.id ? { ...c, revision: out.revision } : c); setStatus("Saved"); }
    catch (e) { setStatus(""); setError(e instanceof Error ? e.message : "That didn’t save. Your words are still here."); } }); }, [client]);
  /** Every change shows at once and saves shortly after, in order, against the last saved revision. */
  const change = useCallback((fn: (p: IntentionPage) => IntentionPage, delay = 700) => {
    setPage((cur) => { if (!cur) return cur; const next = fn(cur); pending.current = next; if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { timer.current = null; pending.current = null; persist(next); }, delay);
      return next; });
  }, [persist]);
  // Moving to another period mid-sentence still saves what was typed.
  useEffect(() => () => { if (timer.current) { window.clearTimeout(timer.current); if (pending.current) persist(pending.current); } }, [persist]);

  async function begin(blank: boolean) {
    const p: IntentionPage = { id: uid(), period: range.period, start: range.start, end: range.end, sections: blank ? [] : seedSections(range.period), revision: 0 };
    setPage(p); setStatus("Saving…");
    try { const out = await saveIntentions(client(), p); saved.current = out; setPage(out); setStatus("Saved"); }
    catch (e) { setError(e instanceof Error ? e.message : "That didn’t save."); const again = await readIntentions(client(), range.period, range.start).catch(() => null); if (again) { saved.current = again; setPage(again); } }
  }
  async function clear() {
    if (!page) return;
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; pending.current = null; }
    try { await queue.current; if (saved.current) await deleteIntentions(client(), page.id); saved.current = null; setPage(null); setStatus(""); }
    catch (e) { setError(e instanceof Error ? e.message : "That page couldn’t be cleared."); }
  }
  const tense = intentionTense(range, today);
  return <>
    {error && <p className="muse-reflections-alert" role="alert">{error} <button type="button" className="muse-reflections-pill" onClick={() => setError("")}>Dismiss</button></p>}
    {page === undefined ? <p className="muse-reflections-quiet" role="status">Opening this chapter…</p>
      : page === null ? <StartChapter range={range} tense={tense} onBegin={(blank) => void begin(blank)} />
      : <Chapter page={page} range={range} today={today} tense={tense} status={status} change={change} client={client} onClear={() => void clear()} />}
    <ReflectionsLink range={range} client={client} />
  </>;
}

// ---------- An empty period ----------
function StartChapter({ range, tense, onBegin }: { range: IntentionRange; tense: "past" | "current" | "future"; onBegin: (blank: boolean) => void }) {
  const t = templates[range.period];
  return <div className="muse-intentions-start">
    <p className="muse-reflections-kicker">{tense === "future" ? "Planning ahead" : tense === "past" ? "Looking back" : "A new chapter"} <MuseStar size={14} prismatic /></p>
    <h2>{range.period === "week" ? "What would make this week feel right?" : range.period === "month" ? `What do you want ${intentionName(range)} to feel like?` : range.period === "quarter" ? `Where is ${intentionName(range)} taking you?` : `Imagine ${intentionName(range)}.`}</h2>
    <p className="muse-reflections-quiet">{tense === "past" ? "This period has passed. You can still write down what you meant it to be." : "Nothing here is required. Start with the page below, or with a blank page and add only what helps."}</p>
    <div className="muse-intentions-template">
      <div className="muse-intentions-template-head"><strong>{t.name}</strong><span>{t.tagline}</span></div>
      <ol>{t.seeds.map((s, i) => { const k = sectionKinds.find((x) => x.key === s.key)!; return <li key={i}><span aria-hidden="true">{k.emoji}</span>{s.title ?? k.title}</li>; })}</ol>
    </div>
    <div className="muse-reflections-actions">
      <button type="button" className="muse-button button-primary" onClick={() => onBegin(false)}>Begin this {range.period}</button>
      <button type="button" className="muse-reflections-pill" onClick={() => onBegin(true)}>Start with a blank page</button>
    </div>
  </div>;
}

/** Contextual link to the same period's Reflections (Reflections keep weeks, months and years). */
function ReflectionsLink({ range, client }: { range: IntentionRange; client: () => Client }) {
  const [exists, setExists] = useState<boolean | null>(null);
  const reflectable = range.period !== "quarter";
  useEffect(() => { if (!reflectable) return; let live = true;
    readReview(client(), range.period as "week" | "month" | "year", range.start).then((r) => { if (live) setExists(!!r); }).catch(() => { if (live) setExists(null); });
    return () => { live = false; }; }, [client, range.period, range.start, reflectable]);
  if (!reflectable) return <p className="muse-intentions-pair muse-reflections-quiet">Reflections are kept by week, month and year, so a quarter has no matching reflection.</p>;
  const href = `/planner?view=reflections&period=${range.period}&date=${range.start}`;
  return <p className="muse-intentions-pair"><span className="muse-reflections-quiet">After</span><Link className="muse-reflections-pill" href={href}>{exists ? `Read your ${intentionName(range)} reflection` : `Reflect on ${intentionName(range)}`} <MuseIcon name="arrow" size={14} /></Link></p>;
}

// ---------- The page ----------
type Change = (fn: (p: IntentionPage) => IntentionPage, delay?: number) => void;
type Lookups = ReturnType<typeof useLookups>;
/** Live records, read where they live. Nothing is copied into the page except a name snapshot per reference. */
function useLookups(range: IntentionRange, today: string) {
  const { state: planner, dispatch, canEdit } = usePlanner();
  const { state: rituals } = useRitualView();
  const asp = useAspirations();
  const bucket = useBucketList(today);
  const vision = useVisionBoards();
  const events = useMemo(() => projectEvents(planner.events, planner.eventExceptions, range.start, range.end).filter((e) => e.status !== "canceled"), [planner.events, planner.eventExceptions, range.start, range.end]);
  return {
    aspirations: asp.aspirations.filter((a) => a.status !== "archived"), aspirationsLoaded: asp.status.loaded,
    aspiration: (id: string) => asp.aspirations.find((a) => a.id === id),
    rituals: rituals.rituals.filter((r) => r.status !== "archived"), ritual: (id: string) => rituals.rituals.find((r) => r.id === id),
    dreams: bucket.entries.filter((e) => !e.archivedAt), dreamsLoaded: bucket.status.loaded, dream: (id: string) => bucket.entries.find((e) => e.id === id),
    boards: vision.boards, boardsLoaded: vision.status.loaded, board: (id: string) => vision.boards.find((b) => b.id === id),
    tasks: planner.tasks, task: (id: string) => planner.tasks.find((t) => t.id === id),
    events, event: (id: string) => planner.events.find((e) => e.id === id),
    workspaces: planner.workspaces, dispatch, canEdit,
  };
}
function liveLabel(r: Ref, L: Lookups): { label: string } | undefined {
  if (r.kind === "aspiration") { const a = L.aspiration(r.id); return a && { label: a.title }; }
  if (r.kind === "ritual") { const x = L.ritual(r.id); return x && { label: x.name }; }
  if (r.kind === "bucket") { const d = L.dream(r.id); return d && { label: d.title }; }
  if (r.kind === "board") { const b = L.board(r.id); return b && { label: b.title }; }
  if (r.kind === "task") { const t = L.task(r.id); return t && { label: t.title }; }
  const e = L.event(r.id); return e && { label: e.title };
}
const refHref = (r: Ref, range: IntentionRange) => r.kind === "aspiration" ? `/envision?open=${r.id}` : r.kind === "bucket" ? "/envision?view=bucket" : r.kind === "board" ? `/envision?view=vision-boards&board=${r.id}` : r.kind === "ritual" ? "/rituals"
  : r.kind === "event" ? `/planner?view=agenda&date=${r.date ?? range.start}` : "/planner";
const shortDate = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

function Chapter({ page, range, today, tense, status, change, client, onClear }: { page: IntentionPage; range: IntentionRange; today: string; tense: string; status: string; change: Change; client: () => Client; onClear: () => void }) {
  const L = useLookups(range, today);
  const [arranging, setArranging] = useState(false), [confirm, setConfirm] = useState<string | "page" | null>(null), [adding, setAdding] = useState(false);
  const [promptAnchor, setPromptAnchor] = useState<HTMLElement | null>(null), [promptOpen, setPromptOpen] = useState(false);
  const usedQuestions = useMemo(() => new Set(page.sections.flatMap((x) => { const q = (x.content as { question?: string }).question; return q ? [q] : []; })), [page.sections]);
  const setSections = (fn: (s: IntentionSection[]) => IntentionSection[], delay?: number) => change((p) => ({ ...p, sections: fn(p.sections) }), delay);
  const update = (id: string, fn: (s: IntentionSection) => IntentionSection, delay?: number) => setSections((list) => list.map((s) => s.id === id ? fn(s) : s), delay);
  const visible = page.sections.filter((s) => arranging || !s.hidden), hiddenCount = page.sections.filter((s) => s.hidden).length;
  return <article className="muse-intentions-page" data-period={range.period} data-arranging={arranging || undefined}>
    <header className="muse-intentions-cover">
      <div>
        <h2 className="muse-reflections-kicker">{templates[range.period].name} <MuseStar size={14} prismatic />{tense === "future" && <span className="muse-reflections-badge">Planned ahead</span>}</h2>
      </div>
      <div className="muse-reflections-actions">
        <span className="muse-reflections-quiet" role="status">{status}</span>
        <button type="button" className="muse-button" disabled={page.sections.length >= MAX_SECTIONS} onClick={(e) => { setPromptAnchor(e.currentTarget); setPromptOpen(true); }}><MuseIcon name="sparkle" size={15} />Prompts</button>
        <button type="button" className="muse-button" aria-pressed={arranging} onClick={() => { setArranging(!arranging); setAdding(false); setConfirm(null); }}>{arranging ? "Done arranging" : "Arrange sections"}</button>
      </div>
    </header>

    <div className="muse-intentions-grid">
      {visible.map((s, i) => <SectionFrame key={s.id} section={s} arranging={arranging} first={i === 0} last={i === visible.length - 1}
        onTitle={(title) => update(s.id, (x) => ({ ...x, title }))}
        onCollapse={() => update(s.id, (x) => ({ ...x, collapsed: !x.collapsed }), 0)}
        onMove={(by) => setSections((list) => moveSection(list, s.id, by), 0)}
        onHide={() => update(s.id, (x) => ({ ...x, hidden: !x.hidden || undefined }), 0)}
        onRemove={() => { const r = removeSection(page.sections, s.id); if (r.needsConfirmation) setConfirm(s.id); else setSections(() => r.sections, 0); }}
        confirming={confirm === s.id} onConfirm={(yes) => { if (yes) setSections((list) => removeSection(list, s.id, true).sections, 0); setConfirm(null); }}>
        <SectionBody section={s} range={range} L={L} onChange={(content, delay) => update(s.id, (x) => ({ ...x, content } as IntentionSection), delay)} />
      </SectionFrame>)}
      {visible.length === 0 && <div className="muse-reflections-empty"><MuseStar size={20} prismatic /><p>A blank page, ready when you are.</p>{!arranging && <button type="button" className="muse-button button-primary" onClick={() => { setArranging(true); setAdding(true); }}>Add a section</button>}</div>}
    </div>

    {!arranging && hiddenCount > 0 && <p className="muse-reflections-quiet">{hiddenCount} hidden {hiddenCount === 1 ? "section keeps its" : "sections keep their"} words. <button type="button" className="text-button" onClick={() => setArranging(true)}>Arrange sections</button> to show {hiddenCount === 1 ? "it" : "them"}.</p>}
    {arranging && <div className="muse-reflections-add">
      {page.sections.length < MAX_SECTIONS && (adding
        ? <div className="muse-reflections-library" role="group" aria-label="Add a section">{sectionKinds.map((k) => <button key={k.key} type="button" onClick={() => { setSections((list) => [...list, newSection(k.key as SectionKindKey, uid())], 0); setAdding(false); }}><span aria-hidden="true">{k.emoji}</span><strong>{k.title}</strong><small>{k.hint}</small></button>)}</div>
        : <button type="button" className="muse-reflections-add-trigger" onClick={() => setAdding(true)}><MuseIcon name="plus" size={16} />Add a section</button>)}
      {confirm === "page" ? <div className="muse-reflections-confirm" role="alertdialog" aria-label="Clear this page">
        <p><strong>Clear the whole {range.period}’s page?</strong> {pageHasContent(page.sections) ? "Everything written here is deleted." : "It has nothing written yet."} Your aspirations, rituals, dreams, tasks and events stay exactly as they are.</p>
        <div className="muse-reflections-actions"><button type="button" className="muse-button" data-destructive onClick={() => { setConfirm(null); setArranging(false); onClear(); }}>Clear page</button><button type="button" className="muse-reflections-pill" onClick={() => setConfirm(null)}>Keep it</button></div>
      </div> : <button type="button" className="text-button muse-intentions-clear" onClick={() => setConfirm("page")}>Clear this page…</button>}
    </div>}
    {promptOpen && <PromptLibrary period={range.period} client={client} usedQuestions={usedQuestions} returnFocus={promptAnchor} onClose={() => setPromptOpen(false)}
      onAdd={(p) => setSections((list) => list.length >= MAX_SECTIONS ? list : [...list, promptSection(p, uid())], 0)} />}
  </article>;
}

function SectionFrame({ section: s, arranging, first, last, onTitle, onCollapse, onMove, onHide, onRemove, confirming, onConfirm, children }: {
  section: IntentionSection; arranging: boolean; first: boolean; last: boolean; onTitle: (t: string) => void; onCollapse: () => void; onMove: (by: -1 | 1) => void; onHide: () => void; onRemove: () => void;
  confirming: boolean; onConfirm: (yes: boolean) => void; children: ReactNode }) {
  const k = kindOf(s), bodyId = `intention-${s.id}`;
  return <section className="muse-intentions-section" data-type={s.type} data-kind={k.key} data-prompt={(s.content as { question?: string }).question ? true : undefined} data-hidden={s.hidden || undefined} data-collapsed={s.collapsed || undefined} aria-label={s.title}>
    <header className="muse-intentions-section-head">
      <span className="muse-intentions-section-icon" aria-hidden="true">{k.emoji}</span>
      {arranging ? <input className="muse-reflections-module-title" aria-label="Section title" maxLength={60} value={s.title} onChange={(e) => onTitle(e.target.value)} /> : <h3>{s.title}</h3>}
      {arranging ? <div className="muse-reflections-module-tools">
        <button type="button" className="muse-reflections-icon" aria-label={`Move ${s.title} earlier`} disabled={first} onClick={() => onMove(-1)}>↑</button>
        <button type="button" className="muse-reflections-icon" aria-label={`Move ${s.title} later`} disabled={last} onClick={() => onMove(1)}>↓</button>
        <button type="button" className="muse-reflections-icon" aria-pressed={!!s.hidden} aria-label={s.hidden ? `Show ${s.title}` : `Hide ${s.title} (keeps its words)`} title={s.hidden ? "Show" : "Hide (keeps its words)"} onClick={onHide}><MuseIcon name={s.hidden ? "eye-off" : "eye"} size={15} /></button>
        <button type="button" className="muse-reflections-icon" aria-label={`Remove ${s.title}`} title="Remove" onClick={onRemove}><MuseIcon name="trash" size={15} /></button>
      </div> : <button type="button" className="muse-reflections-icon muse-intentions-collapse" aria-expanded={!s.collapsed} aria-controls={bodyId} aria-label={s.collapsed ? `Expand ${s.title}` : `Collapse ${s.title}`} onClick={onCollapse}><MuseIcon name="chevron" size={15} /></button>}
    </header>
    {confirming && <div className="muse-reflections-confirm" role="alertdialog" aria-label={`Remove ${s.title}`}>
      <p><strong>Delete “{s.title}” and what’s written in it?</strong> Hiding keeps the words instead. Linked records stay where they are.</p>
      <div className="muse-reflections-actions"><button type="button" className="muse-button" data-destructive onClick={() => onConfirm(true)}>Delete section and its content</button><button type="button" className="muse-reflections-pill" onClick={() => { onConfirm(false); onHide(); }}>Hide instead</button><button type="button" className="muse-reflections-pill" onClick={() => onConfirm(false)}>Cancel</button></div>
    </div>}
    <div id={bodyId} className="muse-intentions-section-body" hidden={!arranging && s.collapsed}>{(s.content as { question?: string }).question && <p className="muse-intentions-question">{(s.content as { question?: string }).question}</p>}{children}</div>
  </section>;
}

// ---------- Section bodies ----------
type BodyProps = { section: IntentionSection; range: IntentionRange; L: Lookups; onChange: (c: SectionContent[SectionType], delay?: number) => void };
const Remove = ({ onClick, label }: { onClick: () => void; label: string }) => <button type="button" className="muse-reflections-icon" aria-label={label} onClick={onClick}>×</button>;
const AddItem = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => <button type="button" className="muse-reflections-additem" onClick={onClick}><MuseIcon name="plus" size={14} />{children}</button>;

function SectionBody(props: BodyProps) {
  const { section: s, onChange } = props;
  switch (s.type) {
    case "theme": { const c = s.content as SectionContent["theme"];
      return <div className="muse-intentions-theme">
        <input className="muse-intentions-word-input" aria-label={`${s.title}: a word or phrase`} placeholder={props.range.period === "year" ? "One word for the year…" : "A word or theme…"} maxLength={60} value={c.word} onChange={(e) => onChange({ ...c, word: e.target.value })} />
        <textarea className="muse-intentions-writing" aria-label={`${s.title}: what it means to you`} placeholder="What it means to you…" maxLength={2000} rows={2} value={c.text} onChange={(e) => onChange({ ...c, text: e.target.value })} />
      </div>; }
    case "writing": { const c = s.content as SectionContent["writing"];
      return <textarea className="muse-intentions-writing" data-prompt={c.prompt} aria-label={s.title} placeholder={writingPrompts[c.prompt] || "Write anything…"} maxLength={8000} rows={c.prompt === "promise" ? 2 : 4} value={c.text} onChange={(e) => onChange({ ...c, text: e.target.value })} />; }
    case "list": return <TextList {...props} />;
    case "priorities": return <Priorities {...props} />;
    case "forward": return <Forward {...props} />;
    default: return <Linked {...props} />;
  }
}

function TextList({ section: s, onChange }: BodyProps) {
  const c = s.content as SectionContent["list"], set = (items: typeof c.items, delay?: number) => onChange({ ...c, items }, delay);
  return <div className="muse-intentions-list">
    {listPrompts[c.prompt] && <p className="muse-reflections-quiet">{listPrompts[c.prompt]}</p>}
    <ul>{c.items.map((it) => <li key={it.id} className="muse-reflections-row">
      <input className="muse-intentions-line" aria-label={`${s.title} item`} maxLength={300} value={it.text} placeholder="Write it down…" onChange={(e) => set(c.items.map((x) => x.id === it.id ? { ...x, text: e.target.value } : x))} />
      <Remove label={`Remove ${it.text || "item"}`} onClick={() => set(c.items.filter((x) => x.id !== it.id), 0)} /></li>)}</ul>
    {canAddItem("list", c.items.length) && <AddItem onClick={() => set([...c.items, { id: uid(), text: "" }], 0)}>Add</AddItem>}
  </div>;
}

function RefChip({ r, L, range }: { r: Ref; L: Lookups; range: IntentionRange }) {
  const st = refStatus(r, liveLabel(r, L));
  const kind = r.kind === "aspiration" ? "Aspiration" : r.kind === "task" ? "Task" : r.kind === "event" ? "Event" : r.kind === "ritual" ? "Ritual" : r.kind === "board" ? "Vision board" : "Dream";
  return <span className="muse-intentions-ref" data-kind={r.kind} data-missing={st.missing || undefined}>
    <span className="muse-sr-only">{kind}: </span>{st.missing ? <span>{st.label}</span> : <Link href={refHref(r, range)}>{st.label}</Link>}
    {r.date && <small>{shortDate(r.date)}</small>}{st.note && <small>{st.note}</small>}
  </span>;
}

/** Top priorities: freeform, optionally pointing at an Aspiration or a Task. "Make a task" is explicit and once-only. */
function Priorities({ section: s, range, L, onChange }: BodyProps) {
  const c = s.content as SectionContent["priorities"], set = (items: typeof c.items, delay?: number) => onChange({ ...c, items }, delay);
  const making = useRef(new Set<string>());
  const options = [...L.aspirations.map((a) => ({ id: `aspiration:${a.id}`, label: `🌱 ${a.title}` })), ...L.tasks.filter((t) => !t.complete).slice(0, 200).map((t) => ({ id: `task:${t.id}`, label: `☐ ${t.title}` }))];
  function link(itemId: string, choice: string) {
    const [kind, id] = [choice.slice(0, choice.indexOf(":")), choice.slice(choice.indexOf(":") + 1)];
    const label = kind === "aspiration" ? L.aspiration(id)?.title : L.task(id)?.title;
    if (!label) return;
    set(c.items.map((x) => x.id === itemId ? { ...x, text: x.text || label, ref: { kind: kind as "aspiration" | "task", id, label } } : x), 0);
  }
  function makeTask(itemId: string) {
    const item = c.items.find((x) => x.id === itemId);
    if (!item || !item.text.trim() || item.taskId || item.ref?.kind === "task" || making.current.has(itemId) || !L.canEdit || !L.workspaces.length) return;
    making.current.add(itemId);
    const id = uid();
    L.dispatch({ type: "task/add", task: createTask(item.text, L.workspaces[0].id, id, new Date().toISOString()) });
    set(c.items.map((x) => x.id === itemId ? { ...x, taskId: id } : x), 0);
  }
  return <div className="muse-intentions-priorities">
    <ol>{c.items.map((it, i) => { const task = it.taskId ? L.task(it.taskId) : undefined;
      return <li key={it.id}>
        <span className="muse-intentions-number" aria-hidden="true">{i + 1}</span>
        <div className="muse-intentions-priority">
          <div className="muse-reflections-row">
            <input className="muse-intentions-line" aria-label={`Priority ${i + 1}`} maxLength={200} value={it.text} placeholder="An area of focus…" onChange={(e) => set(c.items.map((x) => x.id === it.id ? { ...x, text: e.target.value } : x))} />
            <Remove label={`Remove priority ${i + 1}`} onClick={() => set(c.items.filter((x) => x.id !== it.id), 0)} />
          </div>
          <div className="muse-intentions-priority-links">
            {it.ref ? <><RefChip r={it.ref} L={L} range={range} /><button type="button" className="text-button" onClick={() => set(c.items.map((x) => x.id === it.id ? { ...x, ref: undefined } : x), 0)}>Unlink</button></>
              : options.length > 0 && <MuseChoiceMenu label="Link to an aspiration or task" valueLabel="Link…" variant="chip" searchable options={options} selectedIds={[]} onSelect={(choice) => link(it.id, choice)} />}
            {it.taskId ? (task ? <span className="muse-intentions-ref" data-kind="task"><span className="muse-sr-only">Task: </span><Link href="/planner">{task.complete ? "✓ " : ""}Task in your Task List</Link></span>
              : <span className="muse-intentions-ref" data-missing><span>The task made from this was deleted</span></span>)
              : it.ref?.kind !== "task" && <button type="button" className="muse-reflections-pill" disabled={!it.text.trim() || !L.canEdit || !L.workspaces.length} title={!L.workspaces.length ? "Create a workspace in Planner first" : undefined} onClick={() => makeTask(it.id)}>＋ Make it a task</button>}
          </div>
        </div>
      </li>; })}</ol>
    {canAddItem("priorities", c.items.length) ? <AddItem onClick={() => set([...c.items, { id: uid(), text: "" }], 0)}>Add a priority</AddItem> : <p className="muse-reflections-quiet">Five is plenty. Focus is the point.</p>}
  </div>;
}

/** Looking forward to: freeform, optionally pointing at an Agenda event in this period. Events are never copied. */
function Forward({ section: s, range, L, onChange }: BodyProps) {
  const c = s.content as SectionContent["forward"], set = (items: typeof c.items, delay?: number) => onChange({ ...c, items }, delay);
  const chosen = new Set(c.items.map((x) => x.event && `${x.event.id}|${x.event.date}`));
  const options = L.events.map((e) => ({ id: `${e.seriesId ?? e.id}|${e.occurrenceDate ?? e.date}`, label: `${shortDate(e.occurrenceDate ?? e.date)} · ${e.title}` })).filter((o) => !chosen.has(o.id));
  function addEvent(choice: string) {
    const [id, date] = choice.split("|"), e = L.events.find((x) => (x.seriesId ?? x.id) === id && (x.occurrenceDate ?? x.date) === date);
    if (!e) return;
    set([...c.items, { id: uid(), text: "", event: { kind: "event", id, label: e.title, date } }], 0);
  }
  return <div className="muse-intentions-list">
    <ul>{c.items.map((it) => <li key={it.id} className="muse-reflections-row">
      {it.event && <RefChip r={it.event} L={L} range={range} />}
      <input className="muse-intentions-line" aria-label={it.event ? `Note about ${it.event.label}` : "Something to look forward to"} maxLength={200} value={it.text} placeholder={it.event ? "Why it’s exciting…" : "Something to look forward to…"} onChange={(e) => set(c.items.map((x) => x.id === it.id ? { ...x, text: e.target.value } : x))} />
      <Remove label={`Remove ${it.event?.label ?? (it.text || "item")}`} onClick={() => set(c.items.filter((x) => x.id !== it.id), 0)} /></li>)}</ul>
    {canAddItem("forward", c.items.length) && <div className="muse-reflections-row">
      <AddItem onClick={() => set([...c.items, { id: uid(), text: "" }], 0)}>Add</AddItem>
      {options.length > 0 && <MuseChoiceMenu label="Add from your Agenda" valueLabel="From Agenda…" variant="chip" searchable options={options} selectedIds={[]} onSelect={addEvent} />}
    </div>}
  </div>;
}

/** Aspirations, Rituals or Bucket List dreams chosen for this period: references with a small live summary. */
function Linked({ section: s, range, L, onChange }: BodyProps) {
  const c = s.content as SectionContent["aspirations"], set = (items: LinkItem[], delay?: number) => onChange({ items }, delay);
  const kind = s.type === "aspirations" ? "aspiration" : s.type === "rituals" ? "ritual" : s.type === "boards" ? "board" : "bucket";
  const taken = chosenIds(s as IntentionSection<"aspirations">);
  const pool = kind === "aspiration" ? L.aspirations.map((a) => ({ id: a.id, label: a.title })) : kind === "ritual" ? L.rituals.map((r) => ({ id: r.id, label: r.name })) : kind === "board" ? L.boards.map((b) => ({ id: b.id, label: b.title })) : L.dreams.map((d) => ({ id: d.id, label: d.title }));
  const options = pool.filter((o) => !taken.has(o.id));
  const noun = kind === "aspiration" ? "aspiration" : kind === "ritual" ? "ritual" : kind === "board" ? "board" : "dream";
  const article = kind === "aspiration" ? "an" : "a";
  const home = kind === "aspiration" ? { href: "/envision", label: "Aspirations in Envision" } : kind === "ritual" ? { href: "/rituals", label: "Rituals" } : kind === "board" ? { href: "/envision?view=vision-boards", label: "Vision Boards in Envision" } : { href: "/envision?view=bucket", label: "your Bucket List" };
  function summary(id: string): string | undefined {
    if (kind === "aspiration") { const a = L.aspiration(id); if (!a) return; const done = a.milestones.filter((m) => !!m.completedOn).length;
      return [a.status === "completed" ? "Completed" : a.status === "paused" ? "Paused" : undefined, a.milestones.length ? `${done} of ${a.milestones.length} milestones` : undefined, a.targetDate ? `target ${shortDate(a.targetDate)}` : undefined].filter(Boolean).join(" · ") || undefined; }
    if (kind === "ritual") { const r = L.ritual(id); return r ? rhythmLabel(r) : undefined; }
    if (kind === "board") { const b = L.board(id); return b ? [periodLabel(b.period, b.periodStart), `${b.elements.length} ${b.elements.length === 1 ? "piece" : "pieces"}`].filter(Boolean).join(" · ") : undefined; }
    const d = L.dream(id); if (!d) return;
    return d.status === "completed" ? `Done${d.completedOn ? ` ${d.completedOn.slice(0, 4)}` : ""}` : [d.status === "planned" ? "Planned" : d.status === "in_progress" ? "In progress" : "Dreaming", d.targetYear ? `for ${d.targetYear}` : undefined].filter(Boolean).join(" · ");
  }
  return <div className="muse-intentions-linked">
    {c.items.length > 0 && <ul>{c.items.map((it) => { const info = summary(it.ref.id);
      return <li key={it.id}>
        <div className="muse-intentions-linked-head"><RefChip r={it.ref} L={L} range={range} />{info && <small className="muse-reflections-quiet">{info}</small>}<Remove label={`Remove ${it.ref.label}`} onClick={() => set(c.items.filter((x) => x.id !== it.id), 0)} /></div>
        {kind === "board" && (() => { const board = L.board(it.ref.id); return board ? <Link href={refHref(it.ref, range)} className="muse-intentions-board" aria-label={`Open the board ${board.title}`}><LazyPreview board={board} /></Link> : null; })()}
        <input className="muse-intentions-line" aria-label={`Note about ${it.ref.label}`} maxLength={300} value={it.note} placeholder={kind === "ritual" ? "Why it matters this time…" : kind === "board" ? "What this board means for this period…" : "This period, I’ll…"} onChange={(e) => set(c.items.map((x) => x.id === it.id ? { ...x, note: e.target.value } : x))} />
      </li>; })}</ul>}
    {canAddItem(s.type, c.items.length) && (options.length > 0
      ? <MuseChoiceMenu label={`Choose ${article} ${noun}`} valueLabel={`＋ Choose ${article} ${noun}`} variant="chip" searchable options={options} selectedIds={[]} onSelect={(id) => { const o = options.find((x) => x.id === id); if (o) set([...c.items, { id: uid(), ref: { kind, id, label: o.label }, note: "" }], 0); }} />
      : <p className="muse-reflections-quiet">{pool.length ? `Every ${noun} is already here.` : <>No {noun}s yet. <Link href={home.href}>Add one in {home.label}</Link>.</>}</p>)}
  </div>;
}
