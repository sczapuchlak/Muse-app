"use client";
import { useRef, useState, useSyncExternalStore, type ClipboardEvent, type KeyboardEvent } from "react";
import { MuseHeading } from "../design/MuseHeading";
import { MuseIcon } from "../MuseIcon";
import { weekDates } from "@/lib/dates";
import { mealLabels, mealSlots, type MealSlot } from "@/lib/models";
import { ideasIn, MEAL_IDEA_MAX, weekStartOf, type MealIdea } from "@/lib/meal-ideas";
import { useMealIdeas } from "./useMealIdeas";

const hints: Record<MealSlot, string> = { breakfast: "Overnight oats, egg bites…", lunch: "Grain bowls, big salad…", dinner: "Sheet-pan salmon, tacos…", snacks: "Apples and peanut butter…" };
const range = (date: string) => { const w = weekDates(date), f = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)); return `${f(w[0], { month: "short", day: "numeric" })} – ${f(w[6], w[0].slice(5, 7) === w[6].slice(5, 7) ? { day: "numeric" } : { month: "short", day: "numeric" })}`; };
// Open or closed is remembered on this device (a viewing preference, not saved data).
const openKey = "muse.mealIdeas.open";
const openListeners = new Set<() => void>();
const readOpen = () => { try { return localStorage.getItem(openKey) !== "0"; } catch { return true; } };
const setOpenPref = (open: boolean) => { try { localStorage.setItem(openKey, open ? "1" : "0"); } catch { /* still toggles for this visit */ } openListeners.forEach((l) => l()); };
const subscribeOpen = (l: () => void) => { openListeners.add(l); return () => { openListeners.delete(l); }; };
const lines = (text: string) => text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s+/, "").trim()).filter(Boolean);

/**
 * Meal ideas for the week (Wellness → Meals, under the week's plan): four cards of loose ideas to shop from. Not planned
 * meals; nothing is placed on a day. Type an idea and press Enter for the next; edit any idea in place; Backspace on an
 * empty idea removes it. A pasted list becomes one idea per line. Ideas belong to the week shown above.
 */
export function MealIdeas({ date }: { date: string }) {
  const weekStart = weekStartOf(date), { ideas, status, previousCount, add, edit, remove, bringForward } = useMealIdeas(weekStart);
  const stored = useSyncExternalStore(subscribeOpen, readOpen, () => true), [session, setSession] = useState<boolean | null>(null), open = session ?? stored;
  const toggle = () => { setSession(!open); setOpenPref(!open); };
  return <section className="muse-meal-ideas" aria-labelledby="meal-ideas-title" data-closed={!open || undefined}>
    <MuseHeading icon="utensils" tone={4} size="lg" level={2} id="meal-ideas-title" kicker={`Week of ${range(date)}`} title="Meal ideas"
      description={open ? "Loose ideas for the week, to shop from. Not a plan." : `${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"} this week`}
      aside={<span className="muse-meal-ideas-aside">
        {open && !status.loading && !ideas.length && previousCount > 0 && <button type="button" className="muse-button" onClick={bringForward}><MuseIcon name="undo" size={15} /> Start from last week ({previousCount})</button>}
        <small className="muse-meal-ideas-status" role="status">{status.loading ? "Loading…" : status.saving ? "Saving…" : ""}</small>
        <button type="button" className="muse-meal-ideas-toggle" aria-expanded={open} aria-controls="meal-ideas-cards" aria-label={open ? "Close meal ideas" : "Open meal ideas"} onClick={toggle}><MuseIcon name="chevron" size={16} /></button>
      </span>} />
    {status.error && <p className="field-error" role="alert">{status.error}</p>}
    <div id="meal-ideas-cards" className="muse-meal-ideas-grid" hidden={!open} aria-busy={status.loading || undefined}>
      {mealSlots.map((slot) => <IdeaCard key={`${weekStart}-${slot}`} slot={slot} ideas={ideasIn(ideas, slot)} disabled={status.loading} onAdd={(t) => add(slot, t)} onEdit={edit} onRemove={remove} />)}
    </div>
  </section>;
}

function IdeaCard({ slot, ideas, disabled, onAdd, onEdit, onRemove }: { slot: MealSlot; ideas: MealIdea[]; disabled: boolean; onAdd: (t: string | string[]) => void; onEdit: (id: string, t: string) => void; onRemove: (id: string) => void }) {
  const [draft, setDraft] = useState(""), adder = useRef<HTMLInputElement>(null), list = useRef<HTMLUListElement>(null);
  const focusLine = (i: number) => window.requestAnimationFrame(() => { const all = list.current?.querySelectorAll<HTMLInputElement>("input"); const el = i < 0 || !all?.[i] ? adder.current : all[i]; el?.focus(); if (el) el.setSelectionRange(el.value.length, el.value.length); });
  const addMany = (text: string) => onAdd(lines(text));
  const lineKeys = (e: KeyboardEvent<HTMLInputElement>, idea: MealIdea, i: number) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") { e.preventDefault(); focusLine(-1); }
    else if (e.key === "Backspace" && !idea.text) { e.preventDefault(); onRemove(idea.id); focusLine(i - 1); }
    else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); focusLine(i - 1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); focusLine(i + 1 < ideas.length ? i + 1 : -1); }
  };
  const paste = (e: ClipboardEvent<HTMLInputElement>) => { const text = e.clipboardData.getData("text"); if (lines(text).length < 2) return; e.preventDefault(); addMany(text); };
  return <section className="muse-meal-idea-card" data-slot={slot} aria-label={`${mealLabels[slot]} ideas`}>
    <header><h3>{mealLabels[slot]}</h3>{ideas.length > 0 && <span className="muse-meal-idea-count">{ideas.length}</span>}</header>
    <ul ref={list}>{ideas.map((idea, i) => <li key={idea.id}>
      <input aria-label={`${mealLabels[slot]} idea ${i + 1}`} maxLength={MEAL_IDEA_MAX} value={idea.text} disabled={disabled}
        onChange={(e) => onEdit(idea.id, e.target.value)} onKeyDown={(e) => lineKeys(e, idea, i)} onPaste={paste} onBlur={() => { if (!idea.text.trim()) onRemove(idea.id); }} />
      <button type="button" className="muse-meal-idea-remove" aria-label={`Remove ${idea.text || "idea"}`} onClick={() => onRemove(idea.id)}>×</button>
    </li>)}</ul>
    <form className="muse-meal-idea-add" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onAdd(draft); setDraft(""); } }}>
      <MuseIcon name="plus" size={14} />
      <input ref={adder} aria-label={`Add a ${mealLabels[slot].toLowerCase()} idea`} maxLength={MEAL_IDEA_MAX} value={draft} disabled={disabled} placeholder={ideas.length ? "Add another…" : hints[slot]}
        onChange={(e) => setDraft(e.target.value)} onPaste={paste}
        onKeyDown={(e) => { if (e.key === "Backspace" && !draft && ideas.length) { e.preventDefault(); focusLine(ideas.length - 1); } else if (e.key === "ArrowUp" && ideas.length) { e.preventDefault(); focusLine(ideas.length - 1); } }} />
    </form>
  </section>;
}
