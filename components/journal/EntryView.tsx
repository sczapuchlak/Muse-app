"use client";
import { useCallback, useEffect, useState } from "react";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { MuseSegmented } from "../design/MuseSegmented";
import { MuseMark, type MuseMarkIcon } from "../design/MuseHeading";
import { MuseModal } from "../MuseModal";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { Thread, Prose, type ThreadMessage } from "./Thread";
import { EntryImages } from "./EntryImages";
import { TagEditor } from "./TagEditor";
import { EntryLinks } from "./EntryLinks";
import { tagsFor, useJournal } from "./useJournal";
import { formatDay } from "./format";
import * as P from "@/lib/journal/persistence";
import { AiError } from "@/lib/journal/ai-client";
import { entryTitle, tagKinds, type Analysis, type Conversation, type Correction, type Message } from "@/lib/journal/model";
import { saveDiscovery } from "@/lib/inner-compass/persistence";
import { blankDiscovery } from "@/lib/inner-compass/model";
import { categories, categoryInfo, type Category } from "@/lib/inner-compass/categories";

type Tab = "conversation" | "analysis";

/**
 * A finished entry (addendum §2–5): two views. Conversation is the original dialogue, read-only, with explicit
 * corrections that keep the earlier words, passage bookmarks and "Save as discovery". Analysis holds the editable
 * title and summary, AI notes (dismissable), people, places, topics and themes, suggested memories and connections.
 * Editing anything in Analysis never touches the dialogue.
 */
export function EntryView({ conversation: c, onClose }: { conversation: Conversation; onClose: () => void }) {
  const j = useJournal();
  const { client, userId, state, ai, timeZone } = j;
  const journal = state.journals.find((x) => x.id === c.journalId);
  const companion = state.companions.find((x) => x.id === c.companionId) ?? null;
  const who = companion ? { name: companion.name, icon: companion.icon, tone: companion.tone } : { name: c.companionName || "Companion", icon: "sparkle", tone: 5 as const };
  const [tab, setTab] = useState<Tab>("conversation");
  const [messages, setMessages] = useState<Message[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [correcting, setCorrecting] = useState<Message | null>(null);
  const [marking, setMarking] = useState<{ message: Message; excerpt: string } | null>(null);
  const [discovering, setDiscovering] = useState<Message | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, a] = await Promise.all([P.loadMessages(client, userId, c.id), P.loadAnalysis(client, userId, c.id)]);
      setMessages(m.messages); setCorrections(m.corrections); setAnalysis(a); setLoaded(true);
    } catch (e) { setError(e instanceof Error ? e.message : "This entry couldn’t load."); setLoaded(true); }
  }, [client, userId, c.id]);
  useEffect(() => {
    let live = true;
    Promise.all([P.loadMessages(client, userId, c.id), P.loadAnalysis(client, userId, c.id)]).then(([m, a]) => { if (!live) return; setMessages(m.messages); setCorrections(m.corrections); setAnalysis(a); setLoaded(true); })
      .catch((e) => { if (live) { setError(e instanceof Error ? e.message : "This entry couldn’t load."); setLoaded(true); } });
    return () => { live = false; };
  }, [client, userId, c.id]);
  // While the analysis is being written, look again every few seconds.
  useEffect(() => {
    if (c.analysisStatus !== "pending") return;
    const t = window.setInterval(() => { void j.refreshConversation(c.id).then((fresh) => { if (fresh?.analysisStatus !== "pending") { void load(); void j.refresh(); } }); }, 3500);
    return () => window.clearInterval(t);
  }, [c.analysisStatus, c.id, j, load]);

  const bookmarks = state.bookmarks.filter((b) => b.conversationId === c.id);
  async function saveTitle() { const saved = await j.updateMeta({ ...c, title: title.trim(), titleSource: "user" }); if (saved) setEditingTitle(false); }
  async function runAnalysis(regenerate: boolean) {
    setAnalysing(true); setError("");
    try { await j.analyse(c.id, regenerate); await load(); }
    catch (e) { setError(e instanceof AiError ? e.message : "The analysis couldn’t be written. Your entry is safe."); }
    finally { setAnalysing(false); }
  }
  const actions = (m: ThreadMessage) => {
    const msg = messages.find((x) => x.id === m.id); if (!msg) return null;
    const list = [
      { id: "mark", label: "Bookmark this", onSelect: () => setMarking({ message: msg, excerpt: (window.getSelection()?.toString().trim() || msg.body).slice(0, 4000) }) },
      ...(msg.role === "user" ? [{ id: "fix", label: "Correct a dictation slip", onSelect: () => setCorrecting(msg) }, { id: "discover", label: "Save as an Inner World discovery", onSelect: () => setDiscovering(msg) }] : []),
    ];
    const marked = bookmarks.some((b) => b.messageId === msg.id);
    return <>{marked && <span className="mj-fav" title="Bookmarked">❦</span>}<MuseOverflowMenu label="Message options" actions={list} /></>;
  };
  const thread: ThreadMessage[] = messages.map((m) => ({ ...m }));

  return <article className="mj-entry" aria-labelledby="mj-entry-title" style={{ "--journal-a": `var(--chart-${journal?.tone ?? 5})`, "--journal-b": `var(--chart-${((journal?.tone ?? 5) % 8) + 1})` } as React.CSSProperties}>
    <header className="mj-entry-head muse-journal-hero">
      <div className="mj-entry-head-copy">
        <button type="button" className="muse-button button-ghost mj-back" onClick={onClose}>← Back</button>
        <p className="muse-kicker">{formatDay(c.localDate)} · {journal?.name ?? "Journal"}{c.companionName ? ` · with ${c.companionName}` : ""}{c.origin === "playground" ? " · kept from the Playground" : ""}</p>
        {editingTitle ? <form className="mj-title-edit" onSubmit={(e) => { e.preventDefault(); void saveTitle(); }}>
          <input type="text" aria-label="Title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <button type="submit" className="muse-button button-primary">Save</button><button type="button" className="muse-button" onClick={() => { setTitle(c.title); setEditingTitle(false); }}>Cancel</button>
        </form> : <h2 id="mj-entry-title" className="muse-journal-title mj-entry-title">{entryTitle(c)}</h2>}
        <p className="mj-entry-facts">{c.userWords} words · {c.messageCount} messages{c.titleSource === "ai" && " · title suggested by AI"}{c.status === "active" && " · still open"}</p>
      </div>
      <div className="mj-entry-tools">
        <button type="button" className="muse-icon-button mj-star" aria-pressed={c.favorite} aria-label={c.favorite ? "Remove from favorites" : "Add to favorites"} onClick={() => void j.updateMeta({ ...c, favorite: !c.favorite })}>{c.favorite ? "★" : "☆"}</button>
        <MuseOverflowMenu label="Entry options" actions={[
          { id: "title", label: "Edit title", onSelect: () => setEditingTitle(true) },
          { id: "memory", label: c.excludeFromMemory ? "Let future conversations use this entry" : "Keep this entry out of future AI context", onSelect: () => void j.updateMeta({ ...c, excludeFromMemory: !c.excludeFromMemory }) },
          { id: "delete", label: "Delete entry", destructive: true, onSelect: () => void j.deleteConversation(c.id).then((ok) => ok && onClose()) },
        ]} />
      </div>
      <div className="mj-entry-switch">
        <MuseSegmented label="Entry view" value={tab} onChange={setTab} options={[{ id: "conversation", label: "Conversation" }, { id: "analysis", label: "Analysis" }]} />
        {c.excludeFromMemory && <span className="mj-chip">Kept out of AI context</span>}
        <span className="mj-chip-row">
          <span className="sr-only">Move to journal</span>
          <MuseChoiceMenu label="Journal" icon="notes" valueLabel={journal?.name ?? "Journal"} selectedIds={[c.journalId]} options={state.journals.map((x) => ({ id: x.id, label: x.name }))} onSelect={(id) => void j.updateMeta({ ...c, journalId: id })} />
        </span>
      </div>
    </header>
    {error && <p className="mj-error" role="alert">{error}</p>}

    {tab === "conversation" ? <section className="mj-entry-body muse-journal-archive" aria-label="Conversation">
      {!loaded ? <p className="small-label" role="status">Opening…</p> : <Thread messages={thread} companion={who} timeZone={timeZone} actions={actions} />}
      {corrections.length > 0 && <details className="mj-history"><summary>Original wording of {corrections.length} corrected {corrections.length === 1 ? "message" : "messages"}</summary>
        {corrections.map((x) => <blockquote key={x.id}><small>Before {new Date(x.correctedAt).toLocaleString("en-US", { timeZone })}</small><Prose text={x.previousBody} /></blockquote>)}</details>}
      <EntryImages conversation={c} />
      {bookmarks.length > 0 && <div className="mj-marks"><h3 className="mj-section-title">Bookmarked</h3>
        {bookmarks.map((b) => <figure key={b.id} className="mj-mark"><blockquote>{b.excerpt}</blockquote>{b.note && <figcaption>{b.note}</figcaption>}<button type="button" className="muse-button button-ghost" onClick={() => void j.deleteBookmark(b.id)}>Remove</button></figure>)}</div>}
    </section> : <AnalysisPanel c={c} analysis={analysis} ai={ai.enabled} analysing={analysing} onRun={runAnalysis} onChanged={load} />}

    {correcting && <CorrectDialog message={correcting} onClose={() => setCorrecting(null)} onSaved={(m) => { setMessages((list) => list.map((x) => (x.id === m.id ? m : x))); void load(); void j.refreshConversation(c.id); setCorrecting(null); }} />}
    {marking && <MuseModal id="mj-mark" label="Bookmark" title="Bookmark this passage" returnFocus={null} onClose={() => setMarking(null)}>
      <MarkForm excerpt={marking.excerpt} onSave={async (excerpt, note) => { await j.addBookmark({ conversationId: c.id, messageId: marking.message.id, excerpt, note }); setMarking(null); }} onCancel={() => setMarking(null)} />
    </MuseModal>}
    {discovering && <DiscoveryDialog message={discovering} conversation={c} onClose={() => setDiscovering(null)} />}
  </article>;
}

function MarkForm({ excerpt, onSave, onCancel }: { excerpt: string; onSave: (excerpt: string, note: string) => Promise<void>; onCancel: () => void }) {
  const [text, setText] = useState(excerpt), [note, setNote] = useState("");
  return <form className="mj-form" onSubmit={(e) => { e.preventDefault(); void onSave(text.trim(), note.trim()); }}>
    <label className="editor-label">The passage<textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} /></label>
    <label className="editor-label">Why it matters (optional)<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A note for future you" /></label>
    <div className="mj-form-actions"><button type="button" className="muse-button" onClick={onCancel}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!text.trim()}>Bookmark</button></div>
  </form>;
}

function CorrectDialog({ message, onClose, onSaved }: { message: Message; onClose: () => void; onSaved: (m: Message) => void }) {
  const { client } = useJournal();
  const [text, setText] = useState(message.body), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <MuseModal id="mj-correct" label="Correct" title="Correct a dictation slip" returnFocus={null} onClose={onClose} size="tall">
    <form className="mj-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { onSaved(await P.correctMessage(client, message.id, text)); } catch (x) { setError(x instanceof Error ? x.message : "Not saved."); } setBusy(false); }}>
      <p className="mj-note">Fix what dictation got wrong. Muse keeps your original wording with the entry, and the companion’s replies stay as they were.</p>
      <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} aria-label="Corrected message" />
      {error && <p className="mj-error" role="alert">{error}</p>}
      <div className="mj-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={busy || !text.trim() || text.trim() === message.body}>Save correction</button></div>
    </form>
  </MuseModal>;
}

/** Inner Compass, by explicit choice only: the passage becomes a discovery that names this entry as its source. */
function DiscoveryDialog({ message, conversation, onClose }: { message: Message; conversation: Conversation; onClose: () => void }) {
  const { client, userId } = useJournal();
  const [category, setCategory] = useState<Category>("values"), [title, setTitle] = useState(""), [meaning, setMeaning] = useState((window.getSelection()?.toString().trim() || message.body).slice(0, 4000));
  const [done, setDone] = useState(false), [error, setError] = useState("");
  return <MuseModal id="mj-discover" label="Save as discovery" title="Save as an Inner World discovery" returnFocus={null} onClose={onClose} size="tall">
    {done ? <div className="mj-form"><p>Saved to <b>{categoryInfo[category].title}</b> in Inner Compass, with a link back to this entry.</p><div className="mj-form-actions"><a className="muse-button" href="/envision?view=inner-compass">Open Inner Compass</a><button type="button" className="muse-button button-primary" onClick={onClose}>Done</button></div></div>
      : <form className="mj-form" onSubmit={async (e) => { e.preventDefault(); try { await saveDiscovery(client, userId, { ...blankDiscovery(category), title: title.trim(), meaning: meaning.trim(), source: { kind: "journal", id: conversation.id, label: entryTitle(conversation).slice(0, 200) } }); setDone(true); } catch (x) { setError(x instanceof Error ? x.message : "Not saved."); } }}>
        <label className="editor-label">Collection<MuseChoiceMenu label="Collection" valueLabel={categoryInfo[category].title} selectedIds={[category]} options={categories.map((x) => ({ id: x, label: categoryInfo[x].title }))} onSelect={(id) => setCategory(id as Category)} /></label>
        <label className="editor-label">{categoryInfo[category].statement}<input type="text" value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} placeholder={categoryInfo[category].statementPlaceholder} autoFocus /></label>
        <label className="editor-label">{categoryInfo[category].meaning}<textarea rows={5} value={meaning} onChange={(e) => setMeaning(e.target.value)} /></label>
        {error && <p className="mj-error" role="alert">{error}</p>}
        <div className="mj-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!title.trim()}>Save discovery</button></div>
      </form>}
  </MuseModal>;
}

function AnalysisPanel({ c, analysis, ai, analysing, onRun, onChanged }: { c: Conversation; analysis: Analysis | null; ai: boolean; analysing: boolean; onRun: (regenerate: boolean) => void; onChanged: () => void }) {
  const j = useJournal();
  const [summary, setSummary] = useState(c.summary), [editing, setEditing] = useState(false);
  const data = analysis?.data ?? null;
  const dismissed = new Set(analysis?.dismissed ?? []);
  const visible = (kind: string, list: string[]) => list.filter((x) => !dismissed.has(`${kind}:${x}`));
  async function dismiss(key: string) { if (!analysis) return; await P.dismissInAnalysis(j.client, j.userId, analysis, key); onChanged(); }
  const pending = c.analysisStatus === "pending" || analysing;
  const suggested = j.state.memories.filter((m) => m.status === "suggested" && m.sourceConversationId === c.id);
  const tags = tagsFor(j.state, c.id);
  return <section className="mj-analysis" aria-label="Analysis">
    <div className="mj-analysis-grid">
      <div className="mj-panel mj-panel-wide">
        <div className="mj-row-between"><h3 className="mj-section-title">Overview</h3>
          {ai && <button type="button" className="muse-button button-ghost" disabled={pending} onClick={() => onRun(Boolean(analysis?.status === "ready"))}>{pending ? "Writing…" : analysis?.status === "ready" ? "Write a new analysis" : analysis?.status === "failed" ? "Try the analysis again" : "Write an analysis"}</button>}</div>
        {pending && <p className="mj-note" role="status">Reading your conversation… this takes a few seconds.</p>}
        {analysis?.status === "failed" && !pending && <p className="mj-error" role="alert">{analysis.error ?? "The analysis couldn’t be written."} Your entry is saved.</p>}
        {editing ? <form className="mj-form" onSubmit={async (e) => { e.preventDefault(); const saved = await j.updateMeta({ ...c, summary: summary.trim(), summarySource: "user" }); if (saved) setEditing(false); }}>
          <textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="Summary" />
          <div className="mj-form-actions"><button type="button" className="muse-button" onClick={() => { setSummary(c.summary); setEditing(false); }}>Cancel</button><button type="submit" className="muse-button button-primary">Save summary</button></div>
        </form> : c.summary ? <div className="mj-summary"><Prose text={c.summary} /><p className="mj-source">{c.summarySource === "ai" ? "Written by AI from your conversation. Edit it to make it yours." : "Your summary."} <button type="button" className="mj-link" onClick={() => setEditing(true)}>Edit</button></p></div>
          : <p className="mj-note">{ai ? "No summary yet." : "Add a summary in your own words if you like; the AI analysis is turned off for your account."} <button type="button" className="mj-link" onClick={() => setEditing(true)}>Write a summary</button></p>}
      </div>
      {tagKinds.map((k) => <div key={k} className="mj-panel"><TagEditor conversationId={c.id} kind={k} tags={tags.filter((t) => t.kind === k)} /></div>)}
      {data && <>
        {visible("observation", data.observations).length > 0 && <Notes title="Reflections" kind="observation" items={visible("observation", data.observations)} onDismiss={dismiss} note="Tentative: an outside view, not a fact about you." />}
        {visible("thread", data.threads).length > 0 && <Notes title="Threads to revisit" kind="thread" items={visible("thread", data.threads)} onDismiss={dismiss} />}
      </>}
      {suggested.length > 0 && <div className="mj-panel mj-panel-wide"><h3 className="mj-section-title">Remember this?</h3>
        <p className="mj-note">Suggested from this conversation. Nothing is remembered until you confirm it, and you can edit the words first.</p>
        <ul className="mj-memory-list">{suggested.map((m) => <SuggestedMemory key={m.id} id={m.id} />)}</ul></div>}
      <div className="mj-panel mj-panel-wide"><EntryLinks conversation={c} /></div>
    </div>
  </section>;
}

function Notes({ title, kind, items, onDismiss, note }: { title: string; kind: string; items: string[]; onDismiss: (key: string) => void; note?: string }) {
  return <div className="mj-panel"><h3 className="mj-section-title">{title}</h3>{note && <p className="mj-note">{note}</p>}
    <ul className="mj-note-list">{items.map((x) => <li key={x}><span>{x}</span><button type="button" className="mj-x" aria-label={`Dismiss “${x}”`} onClick={() => onDismiss(`${kind}:${x}`)}>×</button></li>)}</ul></div>;
}

function SuggestedMemory({ id }: { id: string }) {
  const j = useJournal(); const m = j.state.memories.find((x) => x.id === id);
  const [text, setText] = useState(m?.body ?? "");
  if (!m) return null;
  return <li className="mj-memory" data-status="suggested">
    <MuseMark icon={"seedling" as MuseMarkIcon} tone={3} size="sm" />
    <input type="text" aria-label="Memory" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
    <button type="button" className="muse-button button-primary" disabled={!text.trim()} onClick={() => void j.saveMemory({ ...m, body: text.trim(), status: "confirmed" })}>Remember</button>
    <button type="button" className="muse-button button-ghost" onClick={() => void j.deleteMemory(m.id)}>Not this</button>
  </li>;
}
