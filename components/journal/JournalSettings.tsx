"use client";
import { useState } from "react";
import { MuseModal } from "../MuseModal";
import { MuseSegmented } from "../design/MuseSegmented";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { ManageTags } from "./TagManager";
import { MemoryStudio } from "./MemoryStudio";
import { useJournal } from "./useJournal";
import { suggestedGlobalPreferences } from "@/lib/journal/presets";
import { formatUsd } from "@/lib/journal/pricing";
import { aiAction } from "@/lib/journal/ai-client";

type Tab = "preferences" | "tags" | "memory" | "privacy";

/**
 * Journal settings: global preferences (every journal and companion), what the journal remembers, and privacy,
 * AI usage and export.
 */
export function JournalSettings({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("preferences");
  return <MuseModal id="mj-settings" label="Journal settings" title="Journal settings" returnFocus={null} onClose={onClose} size="tall">
    <MuseSegmented label="Settings" value={tab} onChange={setTab} options={[{ id: "preferences", label: "Preferences" }, { id: "tags", label: "Tags" }, { id: "memory", label: "Memory" }, { id: "privacy", label: "Privacy & usage" }]} />
    <div className="mj-modal-scroll">{tab === "preferences" ? <Preferences /> : tab === "tags" ? <ManageTags /> : tab === "memory" ? <MemoryStudio /> : <Privacy />}</div>
  </MuseModal>;
}

function Preferences() {
  const j = useJournal();
  const [p, setP] = useState(j.state.prefs), [saved, setSaved] = useState(false);
  return <form className="mj-form" onSubmit={async (e) => { e.preventDefault(); const out = await j.savePrefs(p); if (out) { setP(out); setSaved(true); } }}>
    <label className="editor-label">How you’d like every companion to talk with you<textarea className="mj-prompt" rows={9} value={p.globalInstructions} onChange={(e) => { setP({ ...p, globalInstructions: e.target.value }); setSaved(false); }} placeholder={suggestedGlobalPreferences} /></label>
    {!p.globalInstructions.trim() && <button type="button" className="mj-link" onClick={() => setP({ ...p, globalInstructions: suggestedGlobalPreferences })}>Start from these suggestions</button>}
    <p className="mj-note">These apply in every journal. A companion’s personality and a journal’s own instructions come after them, and the more specific one wins if they disagree. Muse’s privacy and safety rules always come first.</p>
    <label className="mj-toggle muse-check-row"><input type="checkbox" checked={p.greetOnNew} onChange={(e) => { setP({ ...p, greetOnNew: e.target.checked }); setSaved(false); }} /> Start new entries with a greeting from my companion</label>
    <label className="mj-toggle muse-check-row"><input type="checkbox" checked={p.analysisAuto} onChange={(e) => { setP({ ...p, analysisAuto: e.target.checked }); setSaved(false); }} /> Write a short analysis when I finish an entry</label>
    <label className="mj-toggle muse-check-row"><input type="checkbox" checked={p.onThisDay} onChange={(e) => { setP({ ...p, onThisDay: e.target.checked }); setSaved(false); }} /> Offer “On this day” entries from earlier years on Today</label>
    <label className="mj-toggle muse-check-row"><input type="checkbox" checked={p.showOnDaily} onChange={(e) => { setP({ ...p, showOnDaily: e.target.checked }); setSaved(false); }} /> Show a Journal card on the Daily Edit</label>
    <label className="editor-label">Open Today in<MuseChoiceMenu label="Default journal" valueLabel={j.state.journals.find((x) => x.id === p.defaultJournalId)?.name ?? "The first journal"} selectedIds={p.defaultJournalId ? [p.defaultJournalId] : []} options={[{ id: "", label: "The first journal" }, ...j.state.journals.map((x) => ({ id: x.id, label: x.name }))]} onSelect={(id) => { setP({ ...p, defaultJournalId: id || null }); setSaved(false); }} /></label>
    {j.status.error && <p className="mj-error" role="alert">{j.status.error}</p>}
    <div className="mj-form-actions">{saved && <span className="mj-note" role="status">Saved.</span>}<button type="submit" className="muse-button button-primary" disabled={j.status.saving}>Save preferences</button></div>
  </form>;
}

function Privacy() {
  const { ai, refreshAi } = useJournal();
  const a = ai.allowance;
  const [editing, setEditing] = useState(false), [error, setError] = useState("");
  const [monthly, setMonthly] = useState(String(a?.monthlyLimit ?? 10)), [warnAt, setWarnAt] = useState(String(a?.warnAt ?? 7.5)), [daily, setDaily] = useState(String(a?.dailyLimit ?? 2));
  async function saveBudget() {
    setError("");
    try { await aiAction({ action: "budget", monthly: Number(monthly), warnAt: Number(warnAt), daily: Number(daily) }); await refreshAi(); setEditing(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Not saved."); }
  }
  return <div className="mj-form">
    <h3 className="mj-section-title">Your journal is private</h3>
    <p className="mj-note">Entries, memories and photos belong to your account alone; other Muse accounts can’t see them. Entry photos are never sent to an AI. Photos you attach to a message go to your companion with that message only, never again on their own.</p>
    <h3 className="mj-section-title">AI</h3>
    {ai.enabled ? <>
      <p className="mj-note">Replies come from OpenAI ({ai.provider === "mock" ? "local test stand-in" : ai.model}), called from Muse’s server. Each request sends the companion and journal instructions, your preferences, the current conversation and only the memories and entries chosen for it. OpenAI doesn’t train on API data by default and keeps abuse-monitoring logs for up to 30 days.</p>
      {a && <div className="mj-budget" data-state={a.exhausted ? "out" : a.warning ? "warn" : undefined}>
        <div className="mj-row-between"><b>{formatUsd(a.spentMonth)} of {formatUsd(a.monthlyLimit)} this month</b><span className="mj-note">{a.requestsMonth} requests</span></div>
        <div className="mj-budget-bar" role="meter" aria-valuemin={0} aria-valuemax={a.monthlyLimit} aria-valuenow={a.spentMonth} aria-label="This month’s AI budget used"><span style={{ width: `${Math.min(100, (a.spentMonth / Math.max(0.01, a.monthlyLimit)) * 100)}%` }} /><i style={{ left: `${Math.min(100, (a.warnAt / Math.max(0.01, a.monthlyLimit)) * 100)}%` }} title={`Warning at ${formatUsd(a.warnAt)}`} /></div>
        {a.exhausted ? <p className="mj-note">The budget is used up, so new AI requests are paused. Writing, History, search, tags and saved analyses all keep working.</p> : a.warning ? <p className="mj-note">You’ve passed the {formatUsd(a.warnAt)} warning.</p> : null}
      </div>}
      {a && <dl className="mj-usage"><div><dt>Today</dt><dd>{formatUsd(a.spentToday)} of {formatUsd(a.dailyLimit)}</dd></div>
        {Object.entries(a.byKind).filter(([, v]) => v.requests).map(([k, v]) => <div key={k}><dt>{({ reply: "Replies", opening: "Openings", analysis: "Analyses", report: "Weekly reflections", test: "Studio tests" } as Record<string, string>)[k] ?? k}</dt><dd>{v.requests} · {formatUsd(v.cost)}</dd></div>)}</dl>}
      <p className="mj-note">Costs are Muse’s estimate from token counts. Replies, openings, analyses, weekly reflections and Studio tests share this budget; each request reserves a generous estimate before it starts. These limits are Muse’s own (UTC day and month), not a billing cap at OpenAI, so set a budget alert in your OpenAI project too.</p>
      {a && (editing ? <form className="mj-form" onSubmit={(e) => { e.preventDefault(); void saveBudget(); }}>
        <div className="mj-form-row">
          <label className="editor-label">Monthly budget ($)<input type="number" min={0} max={a.ceiling} step="0.5" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></label>
          <label className="editor-label">Warn me at ($)<input type="number" min={0} step="0.5" value={warnAt} onChange={(e) => setWarnAt(e.target.value)} /></label>
          <label className="editor-label">Daily guard ($)<input type="number" min={0} step="0.25" value={daily} onChange={(e) => setDaily(e.target.value)} /></label>
        </div>
        <p className="mj-note">Up to {formatUsd(a.ceiling)} a month. Changing this never buys credits; that only happens in your OpenAI account.</p>
        {error && <p className="mj-error" role="alert">{error}</p>}
        <div className="mj-form-actions"><button type="button" className="muse-button" onClick={() => setEditing(false)}>Cancel</button><button type="submit" className="muse-button button-primary">Save budget</button></div>
      </form> : <div className="mj-form-actions"><button type="button" className="muse-button" onClick={() => setEditing(true)}>Change budget</button></div>)}
    </> : <p className="mj-note">{ai.entitled ? "AI is allowed for your account but not set up on this server yet." : "AI isn’t on for your account. Everything else in the journal works."}</p>}
    <h3 className="mj-section-title">Export</h3>
    <p className="mj-note">Everything you’ve written, with dates, journals, companions, titles, tags, summaries, bookmarks and memories.</p>
    <div className="mj-form-actions"><a className="muse-button" href="/api/journal/export?format=md" download>Readable (Markdown)</a><a className="muse-button button-primary" href="/api/journal/export?format=json" download>Complete (JSON)</a></div>
  </div>;
}
