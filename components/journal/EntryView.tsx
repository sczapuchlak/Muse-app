"use client";
import { useCallback, useEffect, useState } from "react";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { MuseSegmented } from "../design/MuseSegmented";
import { MuseMark, type MuseMarkIcon } from "../design/MuseHeading";
import { MuseModal } from "../MuseModal";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseIcon } from "../MuseIcon";
import { useMuseSpark } from "../MuseSpark";
import { Thread, Prose, type ThreadMessage } from "./Thread";
import { EntryImages } from "./EntryImages";
import { TagEditor } from "./TagEditor";
import { MUSE_STAR_PATH } from "../MuseStar";
import { EntryLinks } from "./EntryLinks";
import { StarRule } from "./JournalArt";
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
 * A finished entry (addendum §2–5). Conversation is the original dialogue, read-only, with explicit corrections that
 * keep the earlier words, passage bookmarks and "Save as discovery". Analysis reads as an edited reflection: the
 * overview, My tags, people, topics and moods as compact rows, tentative AI notes set apart, passages you
 * kept, memories to confirm and connections. Editing anything in Analysis never touches the dialogue.
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
  const { trigger: sparkle, spark } = useMuseSpark();
  const [versions, setVersions] = useState<Map<string, { companionId: string; name: string; version: number }>>(new Map());
  useEffect(() => { let live = true; void P.versionsByIds(client, userId, messages.map((m) => m.companionVersionId ?? "")).then((v) => { if (live) setVersions(v); }).catch(() => undefined); return () => { live = false; }; }, [client, userId, messages]);
  const whoFor = (m: ThreadMessage) => { const v = m.companionVersionId ? versions.get(m.companionVersionId) : undefined; const k = state.companions.find((x) => x.id === (v?.companionId ?? c.companionId)); return { name: v?.name ?? k?.name ?? who.name, icon: k?.icon ?? who.icon, tone: k?.tone ?? who.tone }; };

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
    return <>{m.marked && <span className="mj-flag" title="Bookmarked"><MuseIcon name="bookmark" size={13} /><span className="sr-only">Bookmarked</span></span>}<MuseOverflowMenu label="Message options" actions={list} /></>;
  };
  const marked = new Set(bookmarks.map((b) => b.messageId));
  const thread: ThreadMessage[] = messages.map((m) => ({ ...m, marked: marked.has(m.id) }));

  return <article className="mj-entry mj-reveal" aria-labelledby="mj-entry-title" style={{ "--journal-a": `var(--chart-${journal?.tone ?? 5})`, "--journal-b": `var(--chart-${((journal?.tone ?? 5) % 8) + 1})` } as React.CSSProperties}>
    <header className="mj-entry-head muse-journal-hero">
      <div className="mj-entry-top">
        <button type="button" className="muse-button button-ghost mj-back" onClick={onClose}><span aria-hidden="true">←</span> Back</button>
        <div className="mj-entry-tools">
          <button type="button" className="muse-icon-button mj-fav-toggle" aria-pressed={c.favorite} aria-label={c.favorite ? "Remove from favorites" : "Add to favorites"} onClick={() => void j.updateMeta({ ...c, favorite: !c.favorite })}><MuseIcon name="favorite" size={18} /></button>
          <MuseOverflowMenu label="Entry options" actions={[
            { id: "title", label: "Edit title", onSelect: () => setEditingTitle(true) },
            { id: "memory", label: c.excludeFromMemory ? "Let future conversations use this entry" : "Keep this entry out of future AI context", onSelect: () => void j.updateMeta({ ...c, excludeFromMemory: !c.excludeFromMemory }) },
            { id: "delete", label: "Delete entry", destructive: true, onSelect: () => void j.deleteConversation(c.id).then((ok) => ok && onClose()) },
          ]} />
        </div>
      </div>
      <div className="mj-entry-head-copy">
        <p className="muse-kicker type-meta">{formatDay(c.localDate)} · {journal?.name ?? "Journal"}{c.companionName ? ` · with ${c.companionName}` : ""}{c.origin === "playground" ? " · kept from the Studio" : ""}</p>
        {editingTitle ? <form className="mj-title-edit" onSubmit={(e) => { e.preventDefault(); void saveTitle(); }}>
          <input type="text" aria-label="Title" className="type-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <button type="submit" className="muse-button button-primary">Save</button><button type="button" className="muse-button" onClick={() => { setTitle(c.title); setEditingTitle(false); }}>Cancel</button>
        </form> : <h2 id="mj-entry-title" className="type-title mj-entry-title">{entryTitle(c)}</h2>}
        <p className="mj-entry-facts type-meta"><span className="type-numeric">{c.userWords}</span> words · <span className="type-numeric">{c.messageCount}</span> messages{c.titleSource === "ai" && <> · <span className="mj-ai-badge">title by AI</span></>}{c.excludeFromMemory && <> · kept out of AI context</>}</p>
      </div>
      <div className="mj-entry-switch">
        <MuseSegmented label="Entry view" value={tab} onChange={setTab} options={[{ id: "conversation", label: "Conversation" }, { id: "analysis", label: "Analysis" }]} />
        <MuseChoiceMenu label="Journal" icon="notes" valueLabel={journal?.name ?? "Journal"} selectedIds={[c.journalId]} options={state.journals.map((x) => ({ id: x.id, label: x.name }))} onSelect={(id) => void j.updateMeta({ ...c, journalId: id })} />
      </div>
    </header>
    {error && <p className="mj-error" role="alert">{error}</p>}

    {tab === "conversation" ? <section className="mj-entry-body muse-journal-archive" aria-label="Conversation">
      {!loaded ? <p className="small-label" role="status">Opening…</p> : <Thread messages={thread} companion={who} companionFor={whoFor} timeZone={timeZone} actions={actions} />}
      {corrections.length > 0 && <details className="mj-history"><summary>Original wording of {corrections.length} corrected {corrections.length === 1 ? "message" : "messages"}</summary>
        {corrections.map((x) => <blockquote key={x.id}><small>Before {new Date(x.correctedAt).toLocaleString("en-US", { timeZone })}</small><Prose text={x.previousBody} /></blockquote>)}</details>}
      {spark && <p className="mj-note mj-kept" role="status">Kept in this entry’s passages {spark}</p>}
      <EntryImages conversation={c} />
    </section> : <AnalysisPanel c={c} analysis={analysis} ai={ai.enabled} analysing={analysing} onRun={runAnalysis} onChanged={load} />}

    {correcting && <CorrectDialog message={correcting} onClose={() => setCorrecting(null)} onSaved={(m) => { setMessages((list) => list.map((x) => (x.id === m.id ? m : x))); void load(); void j.refreshConversation(c.id); setCorrecting(null); }} />}
    {marking && <MuseModal id="mj-mark" label="Bookmark" title="Bookmark this passage" returnFocus={null} onClose={() => setMarking(null)}>
      <MarkForm excerpt={marking.excerpt} onSave={async (excerpt, note) => { const saved = await j.addBookmark({ conversationId: c.id, messageId: marking.message.id, excerpt, note }); setMarking(null); if (saved) sparkle(); }} onCancel={() => setMarking(null)} />
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
    <form className="mj-form mj-modal-scroll" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { onSaved(await P.correctMessage(client, message.id, text)); } catch (x) { setError(x instanceof Error ? x.message : "Not saved."); } setBusy(false); }}>
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
    {done ? <div className="mj-form mj-modal-scroll"><p>Saved to <b>{categoryInfo[category].title}</b> in Inner Compass, with a link back to this entry.</p><div className="mj-form-actions"><a className="muse-button" href="/envision?view=inner-compass">Open Inner Compass</a><button type="button" className="muse-button button-primary" onClick={onClose}>Done</button></div></div>
      : <form className="mj-form mj-modal-scroll" onSubmit={async (e) => { e.preventDefault(); try { await saveDiscovery(client, userId, { ...blankDiscovery(category), title: title.trim(), meaning: meaning.trim(), source: { kind: "journal", id: conversation.id, label: entryTitle(conversation).slice(0, 200) } }); setDone(true); } catch (x) { setError(x instanceof Error ? x.message : "Not saved."); } }}>
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
  const bookmarks = j.state.bookmarks.filter((b) => b.conversationId === c.id);
  const observations = data ? visible("observation", data.observations) : [], threads = data ? visible("thread", data.threads) : [];
  const anyAi = tags.some((t) => t.source === "ai");
  return <section className="mj-analysis muse-journal-archive mj-stagger" aria-label="Analysis">
    <div className="mj-overview">
      <div className="mj-row-between"><h3 className="mj-section-title">Overview</h3>
        <span className="mj-row-tools">{c.summary && c.summarySource === "ai" && <span className="mj-ai-badge">Written by AI · yours to edit</span>}
          {ai && <button type="button" className="muse-button button-ghost" disabled={pending} onClick={() => onRun(Boolean(analysis?.status === "ready"))}>{pending ? "Reading…" : analysis?.status === "ready" ? "Write a new analysis" : analysis?.status === "failed" ? "Try the analysis again" : "Write an analysis"}</button>}</span></div>
      {pending && <p className="mj-note" role="status">Reading your conversation… this takes a few seconds.</p>}
      {analysis?.status === "failed" && !pending && <p className="mj-error" role="alert">{analysis.error ?? "The analysis couldn’t be written."} Your entry is saved.</p>}
      {editing ? <form className="mj-form" onSubmit={async (e) => { e.preventDefault(); const saved = await j.updateMeta({ ...c, summary: summary.trim(), summarySource: "user" }); if (saved) setEditing(false); }}>
        <textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="Summary" />
        <div className="mj-form-actions"><button type="button" className="muse-button" onClick={() => { setSummary(c.summary); setEditing(false); }}>Cancel</button><button type="submit" className="muse-button button-primary">Save summary</button></div>
      </form> : c.summary ? <blockquote className="mj-pullquote"><div className="type-reading"><Prose text={c.summary} /></div><button type="button" className="mj-link type-meta" onClick={() => setEditing(true)}>{c.summarySource === "user" ? "Edit your summary" : "Edit"}</button></blockquote>
        : <p className="mj-note">{ai ? "No summary yet." : "Add a summary in your own words if you like."} <button type="button" className="mj-link" onClick={() => setEditing(true)}>Write a summary</button></p>}
    </div>

    {data?.reflection && <article className="mj-closer" aria-label="A closer look">
      <h3 className="mj-section-title">A closer look at you <span className="mj-ai-badge">AI</span></h3>
      <div className="type-reading mj-closer-text"><Prose text={data.reflection} /></div>
    </article>}
    {data?.insight && <figure className="mj-insight">
      <figcaption className="type-meta"><svg viewBox="0 0 24 40" aria-hidden="true"><path d={MUSE_STAR_PATH} /></svg>Insight · on the situation</figcaption>
      <blockquote className="type-quote">{data.insight}</blockquote>
    </figure>}

    <div className="mj-tag-rows" role="group" aria-label="In this entry">
      {tagKinds.map((k) => <TagEditor key={k} conversationId={c.id} kind={k} tags={tags.filter((t) => t.kind === k)} />)}
      {anyAi && <p className="mj-note mj-tag-key"><span className="mj-tag" data-ai>Dashed</span> tags were suggested by AI. Keep one with ✓, or remove it with ×.</p>}
    </div>

    {(observations.length > 0 || threads.length > 0) && <div className="mj-asides">
      {observations.length > 0 && <Notes title="Reflections" kind="observation" items={observations} onDismiss={dismiss} />}
      {threads.length > 0 && <Notes title="Threads to revisit" kind="thread" items={threads} onDismiss={dismiss} />}
    </div>}

    {bookmarks.length > 0 && <div className="mj-marks"><h3 className="mj-section-title">Passages you kept</h3>
      {bookmarks.map((b) => <figure key={b.id} className="mj-mark"><blockquote className="type-quote">{b.excerpt}</blockquote>{b.note && <figcaption>{b.note}</figcaption>}<button type="button" className="muse-button button-ghost" onClick={() => void j.deleteBookmark(b.id)}>Remove</button></figure>)}</div>}

    {suggested.length > 0 && <div className="mj-remember"><h3 className="mj-section-title">Remember this?</h3>
      <p className="mj-note">Suggested from this conversation. Nothing is remembered until you confirm it, and you can edit the words first.</p>
      <ul className="mj-memory-list">{suggested.map((m) => <SuggestedMemory key={m.id} id={m.id} />)}</ul></div>}

    <StarRule />
    <EntryLinks conversation={c} />
  </section>;
}

function Notes({ title, kind, items, onDismiss, note }: { title: string; kind: string; items: string[]; onDismiss: (key: string) => void; note?: string }) {
  return <div className="mj-aside"><h3 className="mj-section-title">{title} <span className="mj-ai-badge">AI</span></h3>{note && <p className="mj-note">{note}</p>}
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
