"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseJournalStats } from "../design/MuseJournal";
import { MuseMark, type MuseMarkIcon } from "../design/MuseHeading";
import { Composer, clearLocalDraft } from "./Composer";
import { JournalHeroArt, EmptyPageArt } from "./JournalArt";
import { EntryCard } from "./EntryCard";
import { activeCompanions, activeJournals, newId, useJournal } from "./useJournal";
import { greeting, formatDay } from "./format";
import * as P from "@/lib/journal/persistence";
import { entryTitle, isListed, type Conversation, type Mode } from "@/lib/journal/model";
import { companionPresets, journalPresets } from "@/lib/journal/presets";
import { addDays, onThisDay, streak } from "@/lib/journal/stats";

/**
 * Today (Journal V1 §4, §9–10): the conversational entry point. Choose a journal and companion, then start a
 * conversation (the companion opens), pick Morning Intention or Evening Reflection, or just start writing. Nothing is
 * created until you press something or write: an unsent draft becomes a resumable draft entry only once it has words.
 */
export function Today({ open }: { open: (id: string, opts?: { opening?: boolean }) => void }) {
  const j = useJournal();
  const { state, today, ai } = j;
  const journals = activeJournals(state), companions = activeCompanions(state);
  const [journalId, setJournalId] = useState<string | null>(null);
  const journal = journals.find((x) => x.id === journalId) ?? journals.find((x) => x.id === state.prefs.defaultJournalId) ?? journals[0] ?? null;
  const [companionId, setCompanionId] = useState<string | null>(null);
  const companion = companions.find((c) => c.id === companionId) ?? companions.find((c) => c.id === journal?.defaultCompanionId) ?? companions[0] ?? null;
  const hour = new Date().getHours();
  const [mode, setMode] = useState<Mode>("open");
  const [busy, setBusy] = useState(false);
  const draftConv = useRef<string | null>(null);

  const listed = state.conversations.filter(isListed);
  const days = useMemo(() => new Set(listed.map((c) => c.localDate)), [listed]);
  const todays = state.conversations.filter((c) => c.localDate === today && c.status !== "draft" && (c.userWords > 0 || c.status === "active"));
  const unfinished = state.conversations.filter((c) => c.status === "active" && c.localDate < today && c.localDate >= addDays(today, -14));
  const drafts = state.conversations.filter((c) => c.status === "draft" && c.draft.trim());
  const yesterday = listed.find((c) => c.localDate === addDays(today, -1) && c.title);
  const past = state.prefs.onThisDay ? onThisDay(state.conversations, today) : [];

  if (!state.journals.length) return <Starters />;

  const key = `new:${journal?.id ?? "none"}:${mode}`;
  async function start(opening: boolean, m: Mode = mode) {
    if (!journal) return;
    setBusy(true);
    const c = await j.startConversation({ journalId: journal.id, companion: ai.enabled ? companion : null, mode: m });
    setBusy(false);
    if (c) open(c.id, { opening: opening && ai.enabled });
  }
  /** A first message from Today: becomes (or joins the draft of) a new conversation, then opens it. */
  async function sendFirst(text: string) {
    if (!journal) return false;
    let id = draftConv.current ?? reuseDraft();
    if (!id) { const c = await j.startConversation({ journalId: journal.id, companion: ai.enabled ? companion : null, mode }); if (!c) return false; id = c.id; }
    try {
      await P.addMessage(j.client, j.userId, { id: newId(), conversationId: id, body: text, localDate: today });
      draftConv.current = null; clearLocalDraft(key);
      await j.refreshConversation(id);
      open(id, { opening: false, });
      return true;
    } catch { return false; }
  }
  /** After a reload, the unsent words on this device belong to the draft entry already saved for them. */
  const reuseDraft = () => (draftConv.current = drafts.find((c) => c.journalId === journal?.id && c.mode === mode && c.localDate === today)?.id ?? null);
  async function saveDraft(text: string) {
    if (!journal) return;
    if (!draftConv.current) reuseDraft();
    if (!draftConv.current && text.trim()) { const c = await j.startConversation({ journalId: journal.id, companion: ai.enabled ? companion : null, mode, status: "draft", draft: text }); draftConv.current = c?.id ?? null; }
    else if (draftConv.current) {
      if (!text.trim()) { const id = draftConv.current; draftConv.current = null; await j.deleteConversation(id); }
      else await P.saveDraft(j.client, j.userId, draftConv.current, text).catch(() => undefined);
    }
  }
  const tone = journal?.tone ?? 5;
  const invitation = yesterday ? `Yesterday you wrote about “${yesterday.title}”. Pick it back up, or start somewhere new.` : todays.length ? "You’ve already been here today. Keep going, or start something new." : "A place to think out loud. Talk it through, or simply write.";

  return <div className="mj-today" style={{ "--journal-a": `var(--chart-${tone})`, "--journal-b": `var(--chart-${(tone % 8) + 1})` } as React.CSSProperties}>
    <section className="muse-journal-hero mj-hero" aria-labelledby="mj-hero-title">
      <div className="muse-journal-hero-copy">
        <p className="muse-kicker">{formatDay(today)}</p>
        <h2 id="mj-hero-title" className="muse-journal-title">{greeting(hour)}.</h2>
        <p>{invitation}</p>
        <div className="mj-pickers">
          <MuseChoiceMenu label="Journal" icon="notes" valueLabel={journal?.name ?? "Choose a journal"} selectedIds={journal ? [journal.id] : []}
            options={journals.map((x) => ({ id: x.id, label: x.name, leading: <MuseMark icon={x.icon as MuseMarkIcon} tone={x.tone} size="sm" /> }))} onSelect={(id) => { setJournalId(id); setCompanionId(null); }} />
          {ai.enabled && companions.length > 0 && <MuseChoiceMenu label="Companion" icon="sparkle" valueLabel={companion?.name ?? "Companion"} selectedIds={companion ? [companion.id] : []}
            options={companions.map((c) => ({ id: c.id, label: c.name, leading: <MuseMark icon={c.icon as MuseMarkIcon} tone={c.tone} size="sm" /> }))} onSelect={setCompanionId} />}
        </div>
        <div className="mj-modes" role="radiogroup" aria-label="Kind of conversation">
          {([["open", "Open conversation"], ["morning", "Morning intention"], ["evening", "Evening reflection"]] as [Mode, string][]).map(([id, label]) =>
            <button key={id} type="button" role="radio" aria-checked={mode === id} className="mj-mode" data-mode={id} data-suggested={(id === "morning" && hour >= 5 && hour < 12) || (id === "evening" && hour >= 17) || undefined} onClick={() => setMode(id)}>{label}</button>)}
        </div>
        <div className="muse-journal-actions">
          {ai.enabled && companion && <button type="button" className="muse-button button-primary" disabled={busy || !journal} onClick={() => void start(true)}>Talk with {companion.name.replace(/^The /, "")}</button>}
          <MuseJournalStats label="Your writing" items={[{ label: "Streak", value: `${streak(days, today)} ${streak(days, today) === 1 ? "day" : "days"}` }, { label: "Entries", value: listed.length }]} />
        </div>
      </div>
      <div className="muse-journal-art" aria-hidden="true"><JournalHeroArt /></div>
    </section>

    <section className="mj-quick muse-journal-archive" aria-labelledby="mj-quick-title">
      <h3 id="mj-quick-title" className="mj-section-title">{ai.enabled ? "Or start by writing" : "Write"}</h3>
      <Composer storageKey={key} placeholder={mode === "morning" ? "How are you starting the day?" : mode === "evening" ? "How was today?" : "What’s on your mind?"} busy={busy} onSend={sendFirst} onDraft={saveDraft}
        hint={ai.enabled ? `Your first message starts a conversation in ${journal?.name ?? "your journal"}${companion ? ` with ${companion.name}` : ""}.` : undefined} sendLabel={ai.enabled ? "Send" : "Save"} />
      {ai.enabled && ai.allowance?.warning && <p className="mj-note" data-soft>{ai.allowance.exhausted ? "This month’s AI budget is used up, so replies are paused. Writing still saves." : `You’ve used ${"$" + ai.allowance.spentMonth.toFixed(2)} of this month’s ${"$" + ai.allowance.monthlyLimit.toFixed(2)} AI budget.`}</p>}
      {!ai.enabled && <p className="mj-note">{ai.entitled && !ai.configured ? "AI replies aren’t set up yet, so the journal works as a private diary for now." : "Your journal is private. Each message saves as you write; finish an entry whenever you like."}</p>}
    </section>

    {(drafts.length > 0 || todays.length > 0 || unfinished.length > 0) && <section className="mj-continue" aria-labelledby="mj-continue-title">
      <h3 id="mj-continue-title" className="mj-section-title">Continue</h3>
      <div className="mj-cards">
        {drafts.map((c) => <DraftCard key={c.id} c={c} onOpen={() => { if (c.journalId !== journal?.id) setJournalId(c.journalId); open(c.id); }} />)}
        {[...todays, ...unfinished].map((c) => <EntryCard key={c.id} c={c} onOpen={() => open(c.id)} />)}
      </div>
    </section>}

    {past.length > 0 && <OnThisDay entries={past} open={open} />}
  </div>;
}

function DraftCard({ c, onOpen }: { c: Conversation; onOpen: () => void }) {
  return <button type="button" className="mj-card" data-draft onClick={onOpen}>
    <span className="mj-card-kicker">Unsent draft · {formatDay(c.localDate)}</span>
    <b className="mj-card-title">{entryTitle(c, "A thought in progress")}</b>
    <span className="mj-card-excerpt">{c.draft.slice(0, 180)}</span>
  </button>;
}

/** On This Day is a quiet door, not a surprise: it shows a count, and the entries only when asked. */
function OnThisDay({ entries, open }: { entries: Conversation[]; open: (id: string) => void }) {
  const [shown, setShown] = useState(false);
  return <section className="mj-onthisday muse-journal-archive" aria-labelledby="mj-otd-title">
    <div className="mj-row-between"><h3 id="mj-otd-title" className="mj-section-title">On this day</h3>
      <button type="button" className="muse-button button-ghost" aria-expanded={shown} onClick={() => setShown(!shown)}>{shown ? "Hide" : `Show ${entries.length} ${entries.length === 1 ? "entry" : "entries"} from earlier years`}</button></div>
    {shown && <div className="mj-cards">{entries.map((c) => <EntryCard key={c.id} c={c} onOpen={() => open(c.id)} showYear />)}</div>}
  </section>;
}

/** First visit: choose which starter journals and companions to add. Nothing is created until you choose. */
function Starters() {
  const j = useJournal();
  const [journals, setJournals] = useState<string[]>(["everyday"]);
  const [companions, setCompanions] = useState<string[]>([]);
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const needed = new Set([...companions, ...journalPresets.filter((p) => journals.includes(p.key)).map((p) => p.companion)]);
  return <section className="muse-journal-hero mj-starters" aria-labelledby="mj-start-title">
    <div className="muse-journal-hero-copy">
      <p className="muse-kicker">Your journal</p>
      <h2 id="mj-start-title" className="muse-journal-title">A place to think out loud.</h2>
      <p>Choose a journal or two to begin. Each one is a space for a kind of conversation, with a companion whose personality you can rewrite completely. You can add, rename or remove any of them later.</p>
      <fieldset className="mj-starter-grid"><legend className="mj-section-title">Journals</legend>
        {journalPresets.map((p) => <label key={p.key} className="mj-starter" data-on={journals.includes(p.key) || undefined}>
          <input type="checkbox" className="check-input" checked={journals.includes(p.key)} onChange={() => toggle(journals, setJournals, p.key)} />
          <MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone} size="sm" /><span><b>{p.name}</b><small>{p.description}</small></span>
        </label>)}
      </fieldset>
      <fieldset className="mj-starter-grid"><legend className="mj-section-title">Companions</legend>
        {companionPresets.map((p) => <label key={p.key} className="mj-starter" data-on={needed.has(p.key) || undefined}>
          <input type="checkbox" className="check-input" checked={needed.has(p.key)} disabled={!companions.includes(p.key) && needed.has(p.key)} onChange={() => toggle(companions, setCompanions, p.key)} />
          <MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone} size="sm" /><span><b>{p.name}</b><small>{p.description}</small></span>
        </label>)}
      </fieldset>
      <div className="muse-journal-actions">
        <button type="button" className="muse-button button-primary" disabled={!journals.length || j.status.saving} onClick={() => void j.addStarters(journals, companions)}>{j.status.saving ? "Setting up…" : "Begin"}</button>
        <Link className="muse-button button-ghost" href="/journal?view=journals">Or make your own</Link>
      </div>
    </div>
    <div className="muse-journal-art" aria-hidden="true"><EmptyPageArt /></div>
  </section>;
}
