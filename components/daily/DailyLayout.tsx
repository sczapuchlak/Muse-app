"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import "./DailyLayout.css";

/**
 * Daily Edit arrangement (Nov 18, Stephanie): the cards keep their own data; this only remembers which column each sits
 * in and in what order, per account (phone and computer match). Unknown names are dropped and new cards join their
 * default column, so adding or retiring a card never breaks a saved layout. Only the Daily Edit is arrangeable.
 */
export type DailyCardKey = "forecast" | "priorities" | "movement" | "water" | "goals" | "mood" | "reflection" | "dayInThree" | "books" | "rituals" | "schedule" | "meals" | "pulse" | "dreams" | "fortune" | "chapter" | "journal";
export type DailyLayout = { left: DailyCardKey[]; right: DailyCardKey[]; hidden?: DailyCardKey[] };
export const dailyCards: { key: DailyCardKey; label: string; icon: MuseIconName }[] = [
  { key: "forecast", label: "Cosmic Forecast", icon: "moon" }, { key: "priorities", label: "Today’s priorities", icon: "focus" },
  { key: "movement", label: "Movement", icon: "movement" }, { key: "water", label: "Water", icon: "water" },
  { key: "goals", label: "Wellness goals", icon: "chart" }, { key: "mood", label: "Mood", icon: "mood" },
  { key: "reflection", label: "A little reflection", icon: "journal" }, { key: "dayInThree", label: "Day in Three", icon: "sparkle" },
  { key: "books", label: "Bookshelf", icon: "bookshelf" }, { key: "rituals", label: "Little Rituals", icon: "rituals" },
  { key: "schedule", label: "Today’s plan", icon: "calendar" }, { key: "meals", label: "Meals", icon: "meals" },
  { key: "pulse", label: "Day Pulse", icon: "insights" }, { key: "dreams", label: "Dreams", icon: "dreams" },
  { key: "fortune", label: "Fortune", icon: "wand" }, { key: "chapter", label: "Your chapter", icon: "envision" },
  { key: "journal", label: "Journal", icon: "notes" },
];
export const defaultDailyLayout: DailyLayout = {
  left: ["forecast", "priorities", "movement", "water", "goals", "mood", "reflection", "dayInThree"],
  right: ["books", "rituals", "schedule", "meals", "pulse", "dreams", "fortune", "chapter", "journal"],
};
const known = new Set<string>(dailyCards.map((c) => c.key));
/** The approved phone order (one column) until you arrange your own; after that, your order everywhere. */
const phoneDefault: Partial<Record<DailyCardKey, number>> = { forecast: 1, books: 2, schedule: 3, priorities: 4, rituals: 5, water: 6, movement: 7, goals: 7, meals: 8, mood: 9, pulse: 10, reflection: 11, dayInThree: 12 };
export const phoneOrder = (layout: DailyLayout, custom: boolean, k: DailyCardKey) => custom ? [...layout.left, ...layout.right].indexOf(k) + 1 : phoneDefault[k] ?? 13;
const label = (k: DailyCardKey) => dailyCards.find((c) => c.key === k)!;

/** A saved layout, made whole: unknown names dropped, duplicates removed, missing cards appended to their default column. */
export function normalizeLayout(raw: unknown): DailyLayout {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<"left" | "right" | "hidden", unknown>>, seen = new Set<string>();
  const pick = (v: unknown) => (Array.isArray(v) ? v : []).filter((k): k is DailyCardKey => typeof k === "string" && known.has(k) && !seen.has(k) && Boolean(seen.add(k)));
  const left = pick(r.left), right = pick(r.right);
  for (const k of defaultDailyLayout.left) if (!seen.has(k)) { left.push(k); seen.add(k); }
  for (const k of defaultDailyLayout.right) if (!seen.has(k)) { right.push(k); seen.add(k); }
  const hidden = (Array.isArray(r.hidden) ? r.hidden : []).filter((k, i, all): k is DailyCardKey => typeof k === "string" && known.has(k) && all.indexOf(k) === i);
  return { left, right, hidden };
}
const sameLayout = (a: DailyLayout, b: DailyLayout) => a.left.join() === b.left.join() && a.right.join() === b.right.join() && (a.hidden ?? []).join() === (b.hidden ?? []).join();
const CACHE = "muse.daily.layout";

/** The account's Daily Edit layout: shown at once from this device's copy, then confirmed from the account. */
export function useDailyLayout() {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [layout, setLayout] = useState<DailyLayout>(defaultDailyLayout), [error, setError] = useState(""), [custom, setCustom] = useState(false);
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => { try { const cached = localStorage.getItem(CACHE); if (cached && live) { setLayout(normalizeLayout(JSON.parse(cached))); setCustom(true); } } catch { /* per device only */ } }, 0);
    void (async () => {
      const { data } = await client.from("daily_edit_layouts").select("layout").maybeSingle();
      if (!live || !data) return;
      const next = normalizeLayout(data.layout); setLayout(next); setCustom(true);
      try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* per device only */ }
    })();
    return () => { live = false; window.clearTimeout(t); };
  }, [client]);
  const save = useCallback(async (next: DailyLayout) => {
    setLayout(next); setCustom(true); setError("");
    try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* per device only */ }
    const auth = await client.auth.getUser(), uid = auth.data.user?.id;
    if (!uid) { setError("Sign in to save your layout."); return false; }
    const r = await client.from("daily_edit_layouts").upsert({ user_id: uid, layout: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (r.error) { setError("Your layout is saved on this device but couldn’t reach your account. It will try again next time."); return false; }
    return true;
  }, [client]);
  return { layout, save, error, custom };
}

type Drag = { key: DailyCardKey; pointerId: number };

/**
 * Arrange mode: every card as a compact tile in its column. Drag a tile by its handle (mouse or finger) to reorder or
 * move it across; the small buttons do the same without dragging. On a phone the columns stack, so the first column's
 * top is the top of the page.
 */
export function DailyArrange({ layout, onDone, onCancel }: { layout: DailyLayout; onDone: (next: DailyLayout) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<DailyLayout>(layout), [drag, setDrag] = useState<Drag | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const move = (key: DailyCardKey, to: "left" | "right", index: number) => setDraft((d) => {
    const from: "left" | "right" = d.left.includes(key) ? "left" : "right";
    const next = { left: d.left.filter((k) => k !== key), right: d.right.filter((k) => k !== key), hidden: d.hidden ?? [] };
    if (from === to && d[from].indexOf(key) < index) index -= 1;
    next[to].splice(Math.max(0, Math.min(index, next[to].length)), 0, key);
    return next;
  });
  const toggleHidden = (key: DailyCardKey) => setDraft((d) => { const h = d.hidden ?? []; return { ...d, hidden: h.includes(key) ? h.filter((k) => k !== key) : [...h, key] }; });
  // The drag is followed on the window: a tile that crosses columns is re-created, which would drop pointer capture.
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const start = (e: ReactPointerEvent, key: DailyCardKey) => { setDrag({ key, pointerId: e.pointerId }); e.preventDefault(); };
  useEffect(() => {
    if (!drag) return;
    // Where would it land? The column under (or nearest) the pointer, before the first tile whose middle is below it.
    const over = (e: PointerEvent) => {
      const cols = [...(board.current?.querySelectorAll<HTMLElement>(".muse-arrange-col") ?? [])];
      const mid = (c: HTMLElement) => { const r = c.getBoundingClientRect(); return Math.abs(e.clientX - (r.left + r.width / 2)); };
      const col = cols.find((c) => { const r = c.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 40 && e.clientY <= r.bottom + 40; }) ?? [...cols].sort((x, y) => mid(x) - mid(y))[0];
      if (!col) return;
      const to = col.dataset.col as "left" | "right", d = draftRef.current;
      const tiles = [...col.querySelectorAll<HTMLElement>(".muse-arrange-tile:not([data-dragging])")];
      const before = tiles.find((t) => { const r = t.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; })?.dataset.key as DailyCardKey | undefined;
      const target = before ? d[to].indexOf(before) : d[to].length, current = d[to].indexOf(drag.key);
      if (current >= 0 && (current === target || current + 1 === target)) return;
      move(drag.key, to, target);
    };
    const onMove = (e: PointerEvent) => { if (e.pointerId === drag.pointerId) { e.preventDefault(); over(e); } };
    const stop = (e: PointerEvent) => { if (e.pointerId === drag.pointerId) setDrag(null); };
    window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", stop); window.addEventListener("pointercancel", stop);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop); };
  }, [drag]);
  const col = (side: "left" | "right") => <ol className="muse-arrange-col" data-col={side} aria-label={side === "left" ? "First column" : "Second column"}>
    {draft[side].map((k, i) => { const c = label(k), dragging = drag?.key === k, off = (draft.hidden ?? []).includes(k); return <li key={k} className="muse-arrange-tile" data-key={k} data-dragging={dragging || undefined} data-hidden={off || undefined}>
      <button type="button" className="muse-arrange-handle" aria-label={`Drag ${c.label}`} onPointerDown={(e) => start(e, k)}><MuseIcon name="grip" size={16} /></button>
      <span className="muse-arrange-mark"><MuseIcon name={c.icon} size={15} /></span>
      <span className="muse-arrange-name">{c.label}{off && <small className="muse-arrange-off"> · hidden</small>}</span>
      <span className="muse-arrange-moves">
        <button type="button" className="muse-icon-button muse-arrange-eye" aria-pressed={!off} aria-label={off ? `Show ${c.label} on the Daily Edit` : `Hide ${c.label} from the Daily Edit`} title={off ? "Show on the Daily Edit" : "Hide from the Daily Edit"} onClick={() => toggleHidden(k)}><MuseIcon name={off ? "eye-off" : "eye"} size={15} /></button>
        <button type="button" className="muse-icon-button" data-up aria-label={`Move ${c.label} up`} disabled={i === 0} onClick={() => move(k, side, i - 1)}><MuseIcon name="chevron" size={14} /></button>
        <button type="button" className="muse-icon-button" data-down aria-label={`Move ${c.label} down`} disabled={i === draft[side].length - 1} onClick={() => move(k, side, i + 2)}><MuseIcon name="chevron" size={14} /></button>
        <button type="button" className="muse-icon-button" data-across={side === "left" ? "right" : "left"} aria-label={`Move ${c.label} to the ${side === "left" ? "second" : "first"} column`} onClick={() => move(k, side === "left" ? "right" : "left", draft[side === "left" ? "right" : "left"].length)}><MuseIcon name="arrow" size={14} /></button>
      </span>
    </li>; })}
  </ol>;
  return <section className="muse-arrange" aria-label="Arrange the Daily Edit">
    <div className="muse-arrange-head">
      <p className="mj-note">Drag a card by its handle to move it, or use the arrows. Tap the eye to hide a card you don’t need; tap it again to bring it back. Your order is saved to your account, so your phone and computer match. On a phone the first column comes first.</p>
      <div className="muse-arrange-actions">
        <button type="button" className="muse-button button-ghost" onClick={() => setDraft({ ...defaultDailyLayout, hidden: [] })} disabled={sameLayout(draft, { ...defaultDailyLayout, hidden: [] })}>Reset</button>
        <button type="button" className="muse-button button-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="muse-button button-primary" onClick={() => onDone(draft)}>Done</button>
      </div>
    </div>
    <div className="muse-arrange-board" ref={board} data-dragging={drag ? true : undefined}>{col("left")}{col("right")}</div>
  </section>;
}
