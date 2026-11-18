"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MuseMark, type MuseMarkIcon, type MuseTone } from "../design/MuseHeading";
import { MuseSegmented } from "../design/MuseSegmented";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { Thread, Thinking, Prose, type ThreadMessage } from "./Thread";
import { blankCompanion } from "./JournalsView";
import { newId, useJournal } from "./useJournal";
import { aiStream, AiError } from "@/lib/journal/ai-client";
import * as P from "@/lib/journal/persistence";
import { companionIcons, companionPreset } from "@/lib/journal/presets";
import { formatUsd } from "@/lib/journal/pricing";
import type { Companion, CompanionVersion } from "@/lib/journal/model";

type Words = Pick<Companion, "name" | "description" | "icon" | "tone" | "instructions" | "conversationPrefs" | "openingStyle">;
const words = (c: Words): Words => ({ name: c.name, description: c.description, icon: c.icon, tone: c.tone, instructions: c.instructions, conversationPrefs: c.conversationPrefs, openingStyle: c.openingStyle });
const same = (a: Words, b: Words) => JSON.stringify(words(a)) === JSON.stringify(words(b));
const storeKey = (id: string) => `muse.journal.studio.${id}`;
type Compare = { message: string; history: { role: "user" | "assistant"; body: string }[]; a: { words: Words; label: string; text: string; error?: string }; b: { words: Words; label: string; text: string; error?: string }; busy: boolean };

/**
 * The Companion Studio and Playground (Companion Playground addendum). Edit the personality on one side and talk to
 * it on the other, with the same model, application rules and instruction layers as real journaling. Test chats live
 * only in this page: nothing becomes an entry, a memory, a tag or a ritual day unless you choose "Keep as Journal
 * Entry". Unsaved edits never change the companion until you press Save; they're also kept on this device in case
 * the page closes.
 */
export function CompanionStudio({ companionId, onClose }: { companionId: string | "new"; onClose: () => void }) {
  const j = useJournal();
  const { state, ai } = j;
  const saved = useMemo(() => (companionId === "new" ? null : state.companions.find((c) => c.id === companionId) ?? null), [companionId, state.companions]);
  const [base, setBase] = useState<Companion>(() => saved ?? blankCompanion(state.companions.length));
  const [d, setD] = useState<Words>(() => words(base));
  const storeId0 = saved?.id ?? "new";
  const [recovered, setRecovered] = useState<{ words: Words; at: string } | null>(() => { try { const raw = typeof window === "undefined" ? null : localStorage.getItem(storeKey(storeId0)); if (!raw) return null; const r = JSON.parse(raw) as { words: Words; at: string }; return same(r.words, base) ? null : r; } catch { return null; } });
  const [pane, setPane] = useState<"edit" | "test">("edit");
  const [versions, setVersions] = useState<CompanionVersion[]>([]);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const dirty = !same(d, base);
  const storeId = saved?.id ?? "new";

  useEffect(() => { if (saved) void P.companionVersions(j.client, j.userId, saved.id).then(setVersions).catch(() => undefined); }, [saved, j.client, j.userId, saved?.version]);
  // Draft recovery: words you didn't save are kept on this device until you save or discard them.
  useEffect(() => { try { if (dirty) localStorage.setItem(storeKey(storeId), JSON.stringify({ words: d, at: new Date().toISOString() })); else localStorage.removeItem(storeKey(storeId)); } catch { /* storage unavailable */ } }, [d, dirty, storeId]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);

  const set = (p: Partial<Words>) => setD((x) => ({ ...x, ...p }));
  async function save() {
    setError("");
    const out = await j.saveCompanion({ ...base, ...d, name: d.name.trim() || "My companion" });
    if (out) { setBase(out); setD(words(out)); try { localStorage.removeItem(storeKey(storeId)); localStorage.removeItem(storeKey(out.id)); } catch { /* */ } setNotice(`Saved as version ${out.version}. New conversations use it; past ones keep the words they had.`); }
    else setError(j.status.error || "Not saved.");
  }
  function close() { if (dirty && !window.confirm("Leave without saving? Your unsaved changes stay on this device and come back when you reopen the studio.")) return; onClose(); }
  const preset = companionPreset(base.presetKey);
  const previous = versions.find((v) => v.version === base.version - 1);
  const used = ai.allowance;

  return <section className="mj-studio" aria-labelledby="mj-studio-title" style={{ "--journal-a": `var(--chart-${d.tone})`, "--journal-b": `var(--chart-${(d.tone % 8) + 1})` } as React.CSSProperties}>
    <header className="mj-studio-head muse-journal-hero">
      <div className="mj-studio-who"><MuseMark icon={d.icon as MuseMarkIcon} tone={d.tone} size="lg" />
        <div><p className="muse-kicker">Companion studio{saved ? ` · version ${base.version}` : ""}{dirty ? " · unsaved changes" : ""}</p><h2 id="mj-studio-title" className="muse-journal-title">{d.name || "A new companion"}</h2>
          <p className="mj-note">A little studio for shaping how your companion talks with you. Try it, change it, compare, and keep the one you enjoy.</p></div></div>
      <div className="mj-studio-actions">
        <button type="button" className="muse-button button-ghost" onClick={close}>← Journals</button>
        <button type="button" className="muse-button" disabled={!dirty} onClick={() => { if (window.confirm("Discard your unsaved changes?")) setD(words(base)); }}>Discard changes</button>
        <button type="button" className="muse-button button-primary" disabled={(!dirty && Boolean(saved)) || j.status.saving || !d.instructions.trim()} onClick={() => void save()}>{saved ? "Save companion" : "Create companion"}</button>
      </div>
    </header>
    {recovered && <div className="mj-error" data-soft role="status"><span>You have unsaved changes from {new Date(recovered.at).toLocaleString()}.</span><button type="button" className="muse-button" onClick={() => { setD(recovered.words); setRecovered(null); }}>Bring them back</button><button type="button" className="muse-button button-ghost" onClick={() => { setRecovered(null); try { localStorage.removeItem(storeKey(storeId)); } catch { /* */ } }}>Discard</button></div>}
    {notice && <p className="mj-note" role="status">{notice}</p>}
    {error && <p className="mj-error" role="alert">{error}</p>}
    <MuseSegmented className="mj-studio-switch" label="Studio pane" value={pane} onChange={setPane} options={[{ id: "edit", label: "Instructions" }, { id: "test", label: "Test conversation" }]} />
    <div className="mj-studio-panes" data-pane={pane}>
      <div className="mj-studio-edit muse-journal-archive">
        <label className="editor-label">Name<input type="text" value={d.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} placeholder="The Night Owl" /></label>
        <label className="editor-label">Description<input type="text" value={d.description} maxLength={600} onChange={(e) => set({ description: e.target.value })} placeholder="Wry, curious, never in a hurry" /></label>
        <div className="mj-form-row">
          <span className="editor-label">Icon<span className="mj-icon-pick">{companionIcons.map((i) => <button type="button" key={i} aria-pressed={d.icon === i} aria-label={i} onClick={() => set({ icon: i })}><MuseMark icon={i as MuseMarkIcon} tone={d.tone} size="sm" /></button>)}</span></span>
          <span className="editor-label">Colour<span className="mj-tone-pick">{([1, 2, 3, 4, 5, 6, 7, 8] as MuseTone[]).map((t) => <button type="button" key={t} aria-pressed={d.tone === t} aria-label={`Colour ${t}`} style={{ background: `linear-gradient(135deg,var(--chart-${t}),var(--chart-${(t % 8) + 1}))` }} onClick={() => set({ tone: t })} />)}</span></span>
        </div>
        <label className="editor-label">Personality<textarea className="mj-prompt" rows={14} value={d.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="Paste or write the personality in your own words: tone, how direct to be, humour, questions versus advice, what to avoid…" /></label>
        <small className="mj-note">{d.instructions.length.toLocaleString()} characters. Write as much as you like (up to 40,000).</small>
        <label className="editor-label">Conversation preferences<textarea rows={3} value={d.conversationPrefs} onChange={(e) => set({ conversationPrefs: e.target.value })} placeholder="Short replies. One question at a time. Push back when I’m being unfair to myself." /></label>
        <label className="editor-label">How it opens a conversation<textarea rows={2} value={d.openingStyle} onChange={(e) => set({ openingStyle: e.target.value })} placeholder="Pick up something from yesterday if it’s natural; otherwise ask what’s on my mind." /></label>
        <div className="mj-form-actions">
          {preset && <button type="button" className="muse-button button-ghost" onClick={() => set({ name: preset.name, description: preset.description, instructions: preset.instructions, conversationPrefs: preset.conversationPrefs, openingStyle: preset.openingStyle })}>Restore original instructions</button>}
          {previous && <button type="button" className="muse-button button-ghost" onClick={() => set({ name: previous.name, description: previous.description, instructions: previous.instructions, conversationPrefs: previous.conversationPrefs, openingStyle: previous.openingStyle })}>Restore previous version ({previous.version})</button>}
        </div>
        {versions.length > 1 && <details className="mj-history"><summary>Version history ({versions.length})</summary><ol className="mj-versions">{versions.map((v) => <li key={v.id}>
          <span><b>Version {v.version}</b> · {new Date(v.savedAt).toLocaleString()}{v.version === base.version && " · current"}</span>
          <p>{v.instructions.slice(0, 180)}{v.instructions.length > 180 ? "…" : ""}</p>
          {v.version !== base.version && <button type="button" className="muse-button button-ghost" onClick={() => set({ name: v.name, description: v.description, instructions: v.instructions, conversationPrefs: v.conversationPrefs, openingStyle: v.openingStyle })}>Use these words</button>}
        </li>)}</ol><p className="mj-note">Using older words loads them into the editor; Save makes them a new version. Nothing is ever deleted from this history.</p></details>}
      </div>
      <Playground draft={d} saved={saved ? words(base) : null} companion={saved} usage={used} onKeep={(w) => setD(w)} />
    </div>
  </section>;
}

function Playground({ draft, saved, companion, usage, onKeep }: { draft: Words; saved: Words | null; companion: Companion | null; usage: ReturnType<typeof useJournal>["ai"]["allowance"]; onKeep: (w: Words) => void }) {
  const j = useJournal();
  const [journalId, setJournalId] = useState<string | null>(companion?.preferredJournalId ?? j.state.journals.find((x) => x.defaultCompanionId === companion?.id)?.id ?? null);
  const [useContext, setUseContext] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [text, setText] = useState("");
  const [stream, setStream] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState<Compare | null>(null);
  const [keeping, setKeeping] = useState(false), [kept, setKept] = useState<string | null>(null);
  const session = useRef(newId());
  const busy = stream !== null || Boolean(compare?.busy);
  const today = j.today;

  const body = (w: Words, history: { role: "user" | "assistant"; body: string }[]) => ({ action: "test", requestKey: newId(), companion: { name: w.name, instructions: w.instructions, conversationPrefs: w.conversationPrefs, openingStyle: w.openingStyle }, journalId, useContext: useContext && Boolean(journalId), messages: history, localDate: today });
  async function send() {
    const msg = text.trim(); if (!msg || busy) return;
    const history = [...messages.map((m) => ({ role: m.role, body: m.body })), { role: "user" as const, body: msg }];
    setMessages((l) => [...l, { id: newId(), role: "user", body: msg, createdAt: new Date().toISOString(), correctedAt: null }]); setText(""); setError(""); setStream("");
    try {
      const out = await aiStream<{ text: string }>(body(draft, history), (d) => setStream((s) => (s ?? "") + d));
      setMessages((l) => [...l, { id: newId(), role: "assistant", body: out.text, createdAt: new Date().toISOString(), correctedAt: null }]);
    } catch (e) { setError(e instanceof AiError ? e.message : "No reply this time. Your instructions are untouched."); setText(msg); setMessages((l) => l.slice(0, -1)); }
    finally { setStream(null); void j.refreshAi(); }
  }
  async function runCompare(message: string, a: Words, b: Words) {
    const history = [...messages.map((m) => ({ role: m.role, body: m.body })), { role: "user" as const, body: message }];
    const next: Compare = { message, history, a: { words: a, label: saved && same(a, saved) ? "Version A — Current personality" : "Version A", text: "" }, b: { words: b, label: "Version B — Revised personality", text: "" }, busy: true };
    setCompare(next); setError("");
    const one = async (side: "a" | "b") => {
      try { const out = await aiStream<{ text: string }>(body(next[side].words, history), (d) => setCompare((c) => (c ? { ...c, [side]: { ...c[side], text: c[side].text + d } } : c))); setCompare((c) => (c ? { ...c, [side]: { ...c[side], text: out.text } } : c)); }
      catch (e) { setCompare((c) => (c ? { ...c, [side]: { ...c[side], error: e instanceof Error ? e.message : "No reply." } } : c)); }
    };
    await one("a"); await one("b"); // One after the other, so the per-minute limit and costs stay predictable.
    setCompare((c) => (c ? { ...c, busy: false } : c)); void j.refreshAi();
  }
  async function keep() {
    const target = journalId ?? j.state.journals[0]?.id; if (!target || !messages.length) return;
    if (!window.confirm(`Copy this test conversation into ${j.state.journals.find((x) => x.id === target)?.name ?? "your journal"} as a finished entry?`)) return;
    const c = await j.keepTest({ key: session.current, journalId: target, companionId: companion?.id ?? null, companionName: draft.name || "Companion", messages: messages.map((m) => ({ role: m.role, body: m.body })) });
    if (c) { setKept(c.id); setKeeping(false); }
  }
  function reset() { setMessages([]); setCompare(null); setError(""); setKept(null); session.current = newId(); }
  const who = { name: draft.name || "Companion", icon: draft.icon, tone: draft.tone };
  const canCompare = Boolean(saved) && !same(draft, saved!);
  const display: ThreadMessage[] = stream !== null ? [...messages, { id: "s", role: "assistant", body: stream || " ", createdAt: new Date().toISOString(), correctedAt: null, streaming: true }] : messages;

  return <div className="mj-studio-test muse-journal-archive">
    <div className="mj-row-between"><h3 className="mj-section-title">Test conversation</h3>
      {usage && <small className="mj-note" title="Muse’s own limit for AI use; tests count toward it">Today {formatUsd(usage.spentToday)} of {formatUsd(usage.dailyLimit)}</small>}</div>
    {!j.ai.enabled ? <p className="mj-note" data-soft>{j.ai.entitled ? "Journal AI isn’t set up yet, so the studio can’t reply. Your instructions still save." : "AI isn’t turned on for your account, so the studio can’t reply. You can still write and save instructions."}</p> : <>
      <div className="mj-test-context">
        <MuseChoiceMenu label="Test in journal" icon="notes" valueLabel={j.state.journals.find((x) => x.id === journalId)?.name ?? "No journal"} selectedIds={journalId ? [journalId] : [""]} options={[{ id: "", label: "No journal" }, ...j.state.journals.map((x) => ({ id: x.id, label: x.name }))]} onSelect={(id) => { setJournalId(id || null); if (!id) setUseContext(false); }} />
        <label className="mj-toggle"><input type="checkbox" className="check-input" checked={useContext} disabled={!journalId} onChange={(e) => setUseContext(e.target.checked)} /> Test with my journal context</label>
      </div>
      <p className="mj-note">{useContext ? "This test can read the same memories and recent entries a real conversation in that journal would." : "This test doesn’t see any of your journal entries or memories."} Test chats aren’t saved, don’t count as journaling, and don’t create memories or tags.</p>
      <div className="mj-test-thread">
        <Thread messages={display} companion={who} timeZone={j.timeZone} empty={<p className="mj-note mj-test-empty">Say something you might really say, like “Ugh, today was a lot.”</p>} />
        {stream === "" && <Thinking name={who.name} />}
      </div>
      {error && <p className="mj-error" role="alert">{error}</p>}
      <form className="mj-composer" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <textarea aria-label="Test message" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a test message" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover) and (pointer: fine)").matches) { e.preventDefault(); void send(); } }} />
        <div className="mj-composer-bar">
          <span className="mj-test-buttons">
            <button type="button" className="muse-button button-ghost" disabled={busy || (!messages.length && !compare)} onClick={reset}>Reset test</button>
            <button type="button" className="muse-button button-ghost" disabled={busy || !canCompare || !(text.trim() || messages.some((m) => m.role === "user"))} title={canCompare ? "Same message, saved words versus your edits" : "Edit the instructions to compare with the saved version"}
              onClick={() => { const msg = text.trim() || [...messages].reverse().find((m) => m.role === "user")!.body; if (!text.trim()) setMessages((l) => l.slice(0, l.findLastIndex((m) => m.role === "user"))); void runCompare(msg, saved!, draft); setText(""); }}>Compare responses</button>
            {messages.length > 1 && <button type="button" className="muse-button button-ghost" disabled={busy} onClick={() => setKeeping(true)}>Keep as journal entry</button>}
          </span>
          <button type="submit" className="muse-button button-primary" disabled={busy || !text.trim()}>{stream !== null ? "Replying…" : "Send"}</button>
        </div>
      </form>
      {keeping && <div className="mj-finish" role="group" aria-label="Keep as journal entry"><p><b>Keep this test as a journal entry?</b> It’s copied once into the journal chosen above ({j.state.journals.find((x) => x.id === journalId)?.name ?? j.state.journals[0]?.name}) as a finished entry. The test itself stays separate.</p>
        <div><button type="button" className="muse-button" onClick={() => setKeeping(false)}>Not now</button><button type="button" className="muse-button button-primary" onClick={() => void keep()}>Keep as entry</button></div></div>}
      {kept && <p className="mj-note" role="status">Kept. <a href={`/journal?entry=${kept}`}>Open the entry</a>.</p>}
      {compare && <div className="mj-compare" aria-live="polite">
        <p className="mj-note">Both versions answered “{compare.message.slice(0, 120)}{compare.message.length > 120 ? "…" : ""}” with the same conversation and settings. Replies vary even with identical words, so treat this as a feel, not a score.</p>
        <div className="mj-compare-grid">{(["a", "b"] as const).map((side) => <figure key={side} className="mj-compare-card" data-side={side}>
          <figcaption>{compare[side].label}</figcaption>
          {compare[side].error ? <p className="mj-error">{compare[side].error}</p> : compare[side].text ? <div className="mj-message-body"><Prose text={compare[side].text} /></div> : <Thinking name={side === "a" ? "Version A" : "Version B"} />}
          <button type="button" className="muse-button" disabled={compare.busy} onClick={() => { onKeep(compare[side].words); setCompare(null); }}>Keep version {side.toUpperCase()}</button>
        </figure>)}</div>
        <div className="mj-form-actions"><button type="button" className="muse-button button-ghost" disabled={compare.busy} onClick={() => setCompare(null)}>Reset comparison</button></div>
        <p className="mj-note">Keeping a version puts its words in the editor. Press Save companion to make it the one you journal with.</p>
      </div>}
    </>}
  </div>;
}
