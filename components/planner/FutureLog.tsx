"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { deleteFutureEntry, entriesOn, entryEnd, readFutureLog, saveFutureEntry, sortEntries, validEntry, FUTURE_NOTE_MAX, FUTURE_TITLE_MAX, type FutureEntry } from "@/lib/future-log";
import { markIconName, markIcons } from "@/lib/muse-marks";
import { accentStyle } from "@/lib/appearance-values";
import { paintAccent, type MarkStyle, type Paint } from "@/lib/planner-customization";
import { MusePaintPicker, paintSwatchStyle } from "../MusePaintPicker";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import { MarkGlyph, MarkQuickPick } from "./MuseMarks";
import { useAgendaData } from "./AgendaData";
import { shiftDate } from "@/lib/dates";
import { GlassPopover } from "../GlassPopover";
import { monthGrid } from "@/lib/agenda";

/**
 * Future Log (#104 §5): one shared, in-memory view of the year's lightweight entries. Entries never become events
 * or tasks on their own; "Make it an event" hands the title and date to the normal event editor.
 */
type Snap = { byYear: Record<string, FutureEntry[]>; error: string; v: number };
let snap: Snap = { byYear: {}, error: "", v: 0 };
const listeners = new Set<() => void>(), pending = new Map<string, Promise<void>>();
let client: ReturnType<typeof createMuseBrowserClient> | null = null;
const db = () => client ??= createMuseBrowserClient();
const emit = (patch: Partial<Snap>) => { snap = { ...snap, ...patch, v: snap.v + 1 }; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
function load(year: string, force = false) {
  if (!force && snap.byYear[year]) return; if (pending.has(year)) return pending.get(year);
  const run = readFutureLog(db(), year).then((list) => emit({ byYear: { ...snap.byYear, [year]: list }, error: "" }), (e) => emit({ error: e instanceof Error ? e.message : "The Future Log couldn’t load." })).finally(() => pending.delete(year));
  pending.set(year, run); return run;
}
const none: FutureEntry[] = [];
const put = (year: string, list: FutureEntry[]) => emit({ byYear: { ...snap.byYear, [year]: list } });

export function useFutureLog(year: string) {
  const s = useSyncExternalStore(subscribe, () => snap, () => snap);
  useEffect(() => { void load(year); }, [year]);
  const entries = s.byYear[year];
  const save = useCallback(async (e: FutureEntry, isNew: boolean) => {
    const saved = await saveFutureEntry(db(), e, isNew), y = saved.month.slice(0, 4);
    put(y, [...(snap.byYear[y] ?? []).filter((x) => x.id !== saved.id), saved]);
    if (!isNew && e.month.slice(0, 4) !== year) put(year, (snap.byYear[year] ?? []).filter((x) => x.id !== saved.id));
    return saved;
  }, [year]);
  const remove = useCallback(async (id: string) => { await deleteFutureEntry(db(), id); put(year, (snap.byYear[year] ?? []).filter((x) => x.id !== id)); }, [year]);
  const forMonth = useCallback((m: string) => sortEntries((entries ?? []).filter((e) => e.month === m)), [entries]);
  return { loaded: !!entries, error: s.error, entries: entries ?? none, forMonth, save, remove, retry: () => load(year, true) };
}

export function FutureEntryGlyph({ entry }: { entry: FutureEntry }) {
  if (!entry.icon) return <span className="muse-future-bullet" aria-hidden="true" style={accentStyle(entry.color ?? "primary")} />;
  return <MarkGlyph mark={{ icon: entry.icon, color: entry.color ?? "primary", gradient: entry.gradient, title: entry.title, linked: false, missing: false }} size={13} />;
}

export function FutureEntryEditor({ entry, month, year, onDone, onMakeEvent }: { entry?: FutureEntry; month: string; year: string; onDone: () => void; onMakeEvent: (title: string, date: string) => void }) {
  const { save, remove, forMonth } = useFutureLog(year);
  const { library, changeLibrary } = useAgendaData();
  const [d, setD] = useState<FutureEntry>(() => entry ?? { id: crypto.randomUUID(), month, date: null, title: "", note: null, icon: null, color: "primary", done: false, position: forMonth(month).length, revision: 1 });
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [confirming, setConfirming] = useState(false), [styled, setStyled] = useState(!!entry?.icon);
  const set = (p: Partial<FutureEntry>) => setD((x) => ({ ...x, ...p }));
  const paint: Paint = d.gradient ? { kind: "gradient", gradient: d.gradient } : { kind: "solid", color: d.color ?? "primary" };
  const setPaint = (p: Paint | undefined) => { if (p) set(p.kind === "solid" ? { color: p.color, gradient: undefined } : { color: paintAccent(p), gradient: p.gradient }); };
  const apply = (s: Omit<MarkStyle, "id">) => { setStyled(true); set({ icon: s.icon, ...(s.paint.kind === "solid" ? { color: s.paint.color, gradient: undefined } : { color: paintAccent(s.paint), gradient: s.paint.gradient }) }); };
  async function submit(e: FormEvent) {
    e.preventDefault(); const problem = validEntry(d); if (problem) { setError(problem); return; }
    setBusy(true); setError("");
    try { await save({ ...d, icon: styled ? d.icon : null }, !entry); onDone(); } catch (x) { setError(x instanceof Error ? x.message : "That didn’t save."); } finally { setBusy(false); }
  }
  const first = `${d.month}-01`, last = `${d.month}-${String(new Date(Date.UTC(+d.month.slice(0, 4), +d.month.slice(5, 7), 0)).getUTCDate()).padStart(2, "0")}`;
  return <form className="muse-future-editor" onSubmit={submit}>
    <label className="muse-mark-field"><span>What’s coming up</span>
      <input autoFocus required maxLength={FUTURE_TITLE_MAX} value={d.title} placeholder="Mom’s birthday, Lisbon trip, Concert…" onChange={(e) => set({ title: e.target.value })} /></label>
    <div className="muse-future-when" role="group" aria-label="When">
      <button type="button" className="choice-button" data-chip-size="compact" aria-pressed={!d.date} onClick={() => set({ date: null, endDate: null })}>Sometime this month</button>
      <label className="muse-mark-field"><span className="sr-only">Day</span><input type="date" min={first} max={last} value={d.date ?? ""} onChange={(e) => { const v = e.target.value || null; set({ date: v, endDate: v && d.endDate && d.endDate > v ? d.endDate : null }); }} /></label>
      {d.date && <label className="muse-mark-field muse-future-through"><span>Through <small>optional · trips</small></span><input type="date" min={shiftDate(d.date, 1)} max={shiftDate(d.date, 366)} value={d.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value || null })} /></label>}
    </div>
    <label className="muse-mark-field"><span>Note <small>optional</small></span>
      <input maxLength={FUTURE_NOTE_MAX} value={d.note ?? ""} placeholder="Book flights by March…" onChange={(e) => set({ note: e.target.value || null })} /></label>
    <details className="muse-future-style" open={styled || undefined} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open && !d.icon) { setStyled(true); set({ icon: "star" }); } }}>
      <summary>Mark & color</summary>
      <MarkQuickPick saved={library.markStyles} onPick={apply} />
      <fieldset className="muse-mark-icons"><legend>Symbol</legend>
        {markIcons.map((i) => <label key={i.id} title={i.label} style={accentStyle(d.color ?? "primary")} data-paint={d.gradient ? "gradient" : undefined}>
          <input type="radio" name="future-icon" value={i.id} checked={styled && d.icon === i.id} onChange={() => { setStyled(true); set({ icon: i.id }); }} aria-label={i.label} />
          <span style={d.gradient && d.icon === i.id ? paintSwatchStyle(paint) : undefined}><MuseIcon name={markIconName(i.id) as MuseIconName} size={16} /></span></label>)}
      </fieldset>
      <MusePaintPicker label="Color" value={paint} onChange={setPaint} palette={library.palette}
        onSaveColor={(color) => changeLibrary({ type: "palette/color", color })} onSaveGradient={(gradient) => changeLibrary({ type: "palette/gradient", gradient })}
        onForget={(x) => changeLibrary("color" in x ? { type: "palette/remove-color", color: x.color } : { type: "palette/remove-gradient", gradient: x.gradient })} />
      {styled && <button type="button" className="text-button" onClick={() => { setStyled(false); set({ icon: null, gradient: undefined }); }}>Use a simple bullet</button>}
    </details>
    {entry && <label className="muse-agenda-check"><input type="checkbox" checked={d.done} onChange={(e) => set({ done: e.target.checked })} /> Done or happened</label>}
    {error && <p className="muse-agenda-warning" role="alert">{error}</p>}
    <div className="editor-actions">
      <button type="submit" className="muse-button button-primary" disabled={busy}>{entry ? "Save" : "Add to Future Log"}</button>
      <button type="button" className="muse-button button-ghost" onClick={onDone}>Cancel</button>
      {entry && <button type="button" className="text-button" title="Opens the event editor with this title and date. The entry stays until you remove it." onClick={() => onMakeEvent(d.title, d.date ?? first)}>Make it an event</button>}
      {entry && (confirming
        ? <span className="muse-mark-confirm" role="group" aria-label="Confirm removing this entry">Remove it?<button type="button" className="text-button" onClick={async () => { try { await remove(entry.id); onDone(); } catch (x) { setError(x instanceof Error ? x.message : "That wasn’t removed."); } }}>Remove</button><button type="button" className="text-button" onClick={() => setConfirming(false)}>Keep</button></span>
        : <button type="button" className="text-button" onClick={() => setConfirming(true)}>Remove</button>)}
    </div>
  </form>;
}

const shortDay = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const longDay = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
export const futureWhen = (e: FutureEntry) => { const end = entryEnd(e); return !e.date ? "Sometime this month" : end && end !== e.date ? `${shortDay(e.date)} – ${shortDay(end)}` : shortDay(e.date); };

/**
 * #12: a compact calendar for one Future Log month. Only Future Log entries highlight days (never events, tasks or
 * Google events); a trip highlights its whole range as one band. Hover or focus shows a tooltip; a click or tap
 * opens a small list of that day's entries, and choosing one opens the entry's usual editor.
 */
export function FutureMiniMonth({ month, entries, onOpen }: { month: string; entries: FutureEntry[]; onOpen: (anchor: HTMLElement, entry: FutureEntry) => void }) {
  const [openDay, setOpenDay] = useState<string | null>(null), anchor = useRef<HTMLButtonElement | null>(null);
  const first = `${month}-01`, last = `${month}-31`;
  const dated = entries.filter((e) => e.date && e.date <= last && entryEnd(e)! >= first);
  const cells = monthGrid(first).flat(), on = (day: string) => entriesOn(dated, day);
  const items = openDay ? on(openDay) : [];
  return <div className="muse-future-mini">
    <div className="muse-future-mini-grid" role="group" aria-label={`${longDay(first).split(" ")[1]} at a glance`}>
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={`h${i}`} className="muse-future-mini-weekday" aria-hidden="true">{d}</span>)}
      {cells.map((day, i) => {
        if (!day) return <span key={i} aria-hidden="true" />;
        const here = on(day), n = Number(day.slice(8)), col = i % 7;
        if (!here.length) return <span key={i} className="muse-future-mini-day">{n}</span>;
        const joins = (other: string) => on(other).some((e) => here.includes(e));
        const prev = shiftDate(day, -1), next = shiftDate(day, 1);
        const start = col === 0 || prev < first || !joins(prev), end = col === 6 || !next.startsWith(month) || !joins(next);
        const lead = here.find((e) => entryEnd(e) !== e.date) ?? here[0];
        return <button key={i} type="button" className="muse-future-mini-day" data-on data-start={start || undefined} data-end={end || undefined} data-many={here.length > 1 || undefined} data-col={col}
          style={accentStyle(lead.color ?? "primary")} aria-haspopup="dialog" aria-expanded={openDay === day}
          aria-label={`${longDay(day)}: ${here.map((e) => e.title).join(", ")}`}
          onClick={(e) => { anchor.current = e.currentTarget; setOpenDay(openDay === day ? null : day); }}>
          {n}<span className="muse-future-mini-tip" aria-hidden="true">{here.slice(0, 3).map((e) => <span key={e.id}><strong>{e.title}</strong> {futureWhen(e)}</span>)}{here.length > 3 && <span>+{here.length - 3} more</span>}</span>
        </button>;
      })}
    </div>
    <GlassPopover id={`future-mini-${month}`} label="Future Log plans on this day" title={openDay ? longDay(openDay) : undefined} open={!!openDay} anchorRef={anchor} onClose={() => setOpenDay(null)} width={280}>
      <ul className="muse-future-mini-list">{items.map((e) => <li key={e.id}><button type="button" onClick={() => { const a = anchor.current; setOpenDay(null); if (a) onOpen(a, e); }}>
        <FutureEntryGlyph entry={e} /><span><strong>{e.title}</strong><small>{futureWhen(e)}{e.note ? ` · ${e.note}` : ""}</small></span></button></li>)}</ul>
    </GlassPopover>
  </div>;
}
