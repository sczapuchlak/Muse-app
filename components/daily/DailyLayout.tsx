"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import "./DailyLayout.css";

/**
 * Daily Edit arrangement (Nov 18, Stephanie): the cards keep their own data; this only remembers where each sits, per
 * account. The two-column view (computer) and the one-column view (phone, or any narrow window) are arranged
 * separately: moving Reading to the top on a phone never moves it into a computer column. Each view also has its own
 * hidden cards. Unknown names are dropped and new cards join their default place, so adding or retiring a card never
 * breaks a saved layout. Only the Daily Edit is arrangeable.
 */
export type DailyCardKey = "forecast" | "priorities" | "movement" | "water" | "goals" | "mood" | "dayInThree" | "books" | "rituals" | "schedule" | "meals" | "pulse" | "dreams" | "fortune" | "chapter" | "journal";
export type DailyLayout = { left: DailyCardKey[]; right: DailyCardKey[]; hidden?: DailyCardKey[]; phone?: DailyCardKey[]; phoneHidden?: DailyCardKey[] };
export type ArrangeMode = "columns" | "phone";
export const dailyCards: { key: DailyCardKey; label: string; icon: MuseIconName }[] = [
  { key: "forecast", label: "Cosmic Forecast", icon: "moon" }, { key: "priorities", label: "Today’s priorities", icon: "focus" },
  { key: "movement", label: "Movement", icon: "movement" }, { key: "water", label: "Water", icon: "water" },
  { key: "goals", label: "Wellness goals", icon: "chart" }, { key: "mood", label: "Mood", icon: "mood" },
  { key: "dayInThree", label: "Day in Three", icon: "sparkle" },
  { key: "books", label: "Bookshelf", icon: "bookshelf" }, { key: "rituals", label: "Little Rituals", icon: "rituals" },
  { key: "schedule", label: "Today’s plan", icon: "calendar" }, { key: "meals", label: "Meals", icon: "meals" },
  { key: "pulse", label: "Day Pulse", icon: "insights" }, { key: "dreams", label: "Dreams", icon: "dreams" },
  { key: "fortune", label: "Fortune", icon: "wand" }, { key: "chapter", label: "Your chapter", icon: "envision" },
  { key: "journal", label: "Journal", icon: "notes" },
];
export const defaultDailyLayout: DailyLayout = {
  left: ["forecast", "priorities", "movement", "water", "goals", "mood", "dayInThree"],
  right: ["books", "rituals", "schedule", "meals", "pulse", "dreams", "fortune", "chapter", "journal"],
};
const known = new Set<string>(dailyCards.map((c) => c.key));
/** The approved one-column (phone) order, used until you arrange your phone yourself. */
export const defaultPhoneOrder: DailyCardKey[] = ["forecast", "books", "schedule", "priorities", "rituals", "water", "movement", "goals", "meals", "mood", "pulse", "dayInThree", "dreams", "fortune", "chapter", "journal"];
const phoneList = (l: DailyLayout) => l.phone ?? defaultPhoneOrder;
/** Where a card sits in the one-column view (its CSS order there). */
export const phoneOrder = (layout: DailyLayout, k: DailyCardKey) => phoneList(layout).indexOf(k) + 1;
/** The hidden cards for the view on screen. */
export const hiddenFor = (layout: DailyLayout, mode: ArrangeMode) => (mode === "phone" ? layout.phoneHidden : layout.hidden) ?? [];
const label = (k: DailyCardKey) => dailyCards.find((c) => c.key === k)!;

/** A saved layout, made whole: unknown names dropped, duplicates removed, missing cards added in their default place. */
export function normalizeLayout(raw: unknown): DailyLayout {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof DailyLayout, unknown>>, seen = new Set<string>();
  const pick = (v: unknown) => (Array.isArray(v) ? v : []).filter((k): k is DailyCardKey => typeof k === "string" && known.has(k) && !seen.has(k) && Boolean(seen.add(k)));
  const left = pick(r.left), right = pick(r.right);
  for (const k of defaultDailyLayout.left) if (!seen.has(k)) { left.push(k); seen.add(k); }
  for (const k of defaultDailyLayout.right) if (!seen.has(k)) { right.push(k); seen.add(k); }
  const set = (v: unknown) => (Array.isArray(v) ? v : []).filter((k, i, all): k is DailyCardKey => typeof k === "string" && known.has(k) && all.indexOf(k) === i);
  const out: DailyLayout = { left, right, hidden: set(r.hidden) };
  if (Array.isArray(r.phone)) { const phone = set(r.phone); for (const k of defaultPhoneOrder) if (!phone.includes(k)) phone.push(k); out.phone = phone; }
  if (Array.isArray(r.phoneHidden)) out.phoneHidden = set(r.phoneHidden);
  return out;
}
const CACHE = "muse.daily.layout";

/** The account's Daily Edit layout: shown at once from this device's copy, then confirmed from the account. */
export function useDailyLayout() {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [layout, setLayout] = useState<DailyLayout>(defaultDailyLayout), [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => { try { const cached = localStorage.getItem(CACHE); if (cached && live) setLayout(normalizeLayout(JSON.parse(cached))); } catch { /* per device only */ } }, 0);
    void (async () => {
      const { data } = await client.from("daily_edit_layouts").select("layout").maybeSingle();
      if (!live || !data) return;
      const next = normalizeLayout(data.layout); setLayout(next);
      try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* per device only */ }
    })();
    return () => { live = false; window.clearTimeout(t); };
  }, [client]);
  const save = useCallback(async (next: DailyLayout) => {
    setLayout(next); setError("");
    try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* per device only */ }
    const auth = await client.auth.getUser(), uid = auth.data.user?.id;
    if (!uid) { setError("Sign in to save your layout."); return false; }
    const r = await client.from("daily_edit_layouts").upsert({ user_id: uid, layout: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (r.error) { setError("Your layout is saved on this device but couldn’t reach your account. It will try again next time."); return false; }
    return true;
  }, [client]);
  return { layout, save, error };
}

/** True while the Daily Edit is one column (the same 880px content width its stylesheet uses). */
export function useOneColumn() {
  const [one, setOne] = useState(false);
  useEffect(() => {
    const host = document.querySelector<HTMLElement>(".muse-app-content") ?? document.body;
    const check = () => setOne(host.clientWidth <= 880);
    check();
    const ro = new ResizeObserver(check); ro.observe(host);
    return () => ro.disconnect();
  }, []);
  return one;
}

type Col = "left" | "right" | "phone";
type Drag = { key: DailyCardKey; pointerId: number };
const listOf = (d: DailyLayout, c: Col) => (c === "phone" ? phoneList(d) : d[c]);

/**
 * Arrange mode: every card as a compact tile. On a computer, the two columns; on a phone (or a narrow window), the one
 * column you scroll. Drag a tile by its handle (mouse or finger) or use the small buttons; the eye hides a card from
 * this view only.
 */
export function DailyArrange({ layout, mode, onDone, onCancel }: { layout: DailyLayout; mode: ArrangeMode; onDone: (next: DailyLayout) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<DailyLayout>(layout), [drag, setDrag] = useState<Drag | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const move = (key: DailyCardKey, to: Col, index: number) => setDraft((d) => {
    if (to === "phone") {
      const list = [...phoneList(d)], from = list.indexOf(key);
      list.splice(from, 1); if (from < index) index -= 1;
      list.splice(Math.max(0, Math.min(index, list.length)), 0, key);
      return { ...d, phone: list };
    }
    const from: "left" | "right" = d.left.includes(key) ? "left" : "right";
    const next = { ...d, left: d.left.filter((k) => k !== key), right: d.right.filter((k) => k !== key) };
    if (from === to && d[from].indexOf(key) < index) index -= 1;
    next[to].splice(Math.max(0, Math.min(index, next[to].length)), 0, key);
    return next;
  });
  const hiddenKey = mode === "phone" ? "phoneHidden" : "hidden";
  const toggleHidden = (key: DailyCardKey) => setDraft((d) => { const h = d[hiddenKey] ?? []; return { ...d, [hiddenKey]: h.includes(key) ? h.filter((k) => k !== key) : [...h, key] }; });
  const reset = () => setDraft((d) => mode === "phone" ? { ...d, phone: undefined, phoneHidden: [] } : { ...d, left: defaultDailyLayout.left, right: defaultDailyLayout.right, hidden: [] });
  const isDefault = mode === "phone" ? phoneList(draft).join() === defaultPhoneOrder.join() && !(draft.phoneHidden ?? []).length
    : draft.left.join() === defaultDailyLayout.left.join() && draft.right.join() === defaultDailyLayout.right.join() && !(draft.hidden ?? []).length;
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
      const to = col.dataset.col as Col, list = listOf(draftRef.current, to);
      const tiles = [...col.querySelectorAll<HTMLElement>(".muse-arrange-tile:not([data-dragging])")];
      const before = tiles.find((t) => { const r = t.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; })?.dataset.key as DailyCardKey | undefined;
      const target = before ? list.indexOf(before) : list.length, current = list.indexOf(drag.key);
      if (current >= 0 && (current === target || current + 1 === target)) return;
      move(drag.key, to, target);
    };
    const onMove = (e: PointerEvent) => { if (e.pointerId === drag.pointerId) { e.preventDefault(); over(e); } };
    const stop = (e: PointerEvent) => { if (e.pointerId === drag.pointerId) setDrag(null); };
    window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", stop); window.addEventListener("pointercancel", stop);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop); };
  }, [drag]);
  const hidden = draft[hiddenKey] ?? [];
  const col = (side: Col) => { const list = listOf(draft, side); return <ol className="muse-arrange-col" data-col={side} aria-label={side === "phone" ? "Your phone order" : side === "left" ? "First column" : "Second column"}>
    {list.map((k, i) => { const c = label(k), dragging = drag?.key === k, off = hidden.includes(k); return <li key={k} className="muse-arrange-tile" data-key={k} data-dragging={dragging || undefined} data-hidden={off || undefined}>
      <button type="button" className="muse-arrange-handle" aria-label={`Drag ${c.label}`} onPointerDown={(e) => start(e, k)}><MuseIcon name="grip" size={16} /></button>
      <span className="muse-arrange-mark"><MuseIcon name={c.icon} size={15} /></span>
      <span className="muse-arrange-name">{c.label}{off && <small className="muse-arrange-off"> · hidden</small>}</span>
      <span className="muse-arrange-moves">
        <button type="button" className="muse-icon-button muse-arrange-eye" aria-pressed={!off} aria-label={off ? `Show ${c.label}` : `Hide ${c.label}`} title={off ? "Show here" : "Hide here"} onClick={() => toggleHidden(k)}><MuseIcon name={off ? "eye-off" : "eye"} size={15} /></button>
        <button type="button" className="muse-icon-button" data-up aria-label={`Move ${c.label} up`} disabled={i === 0} onClick={() => move(k, side, i - 1)}><MuseIcon name="chevron" size={14} /></button>
        <button type="button" className="muse-icon-button" data-down aria-label={`Move ${c.label} down`} disabled={i === list.length - 1} onClick={() => move(k, side, i + 2)}><MuseIcon name="chevron" size={14} /></button>
        {side !== "phone" && <button type="button" className="muse-icon-button" data-across={side === "left" ? "right" : "left"} aria-label={`Move ${c.label} to the ${side === "left" ? "second" : "first"} column`} onClick={() => move(k, side === "left" ? "right" : "left", draft[side === "left" ? "right" : "left"].length)}><MuseIcon name="arrow" size={14} /></button>}
      </span>
    </li>; })}
  </ol>; };
  return <section className="muse-arrange" aria-label="Arrange the Daily Edit" data-mode={mode}>
    <div className="muse-arrange-head">
      <p className="mj-note">{mode === "phone"
        ? "Arranging your phone view: one column, top to bottom. Drag a card by its handle or use the arrows; the eye hides a card on your phone only. Your computer keeps its own two-column layout."
        : "Arranging your computer view: two columns. Drag a card by its handle or use the arrows; the eye hides a card on your computer only. Your phone keeps its own order."}</p>
      <div className="muse-arrange-actions">
        <button type="button" className="muse-button button-ghost" onClick={reset} disabled={isDefault}>Reset</button>
        <button type="button" className="muse-button button-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="muse-button button-primary" onClick={() => onDone(draft)}>Done</button>
      </div>
    </div>
    <div className="muse-arrange-board" ref={board} data-dragging={drag ? true : undefined}>{mode === "phone" ? col("phone") : <>{col("left")}{col("right")}</>}</div>
  </section>;
}
