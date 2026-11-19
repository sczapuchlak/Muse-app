"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MuseMark, type MuseMarkIcon, type MuseTone } from "../design/MuseHeading";
import { MuseIcon } from "../MuseIcon";
import { MuseModal } from "../MuseModal";
import { GlassPopover } from "../GlassPopover";
import { Composer, clearLocalDraft, type Attachment } from "./Composer";
import { EntryDateDialog, displayClock, entryInstant, localClock } from "./EntryDate";
import { GuidedEntry } from "./Guides";
import { boardImageUrl, uploadBoardImage } from "@/lib/data/constellation-images";
import { Prose, Thinking, Thread, type ThreadMessage } from "./Thread";
import { WeekConstellation } from "./JournalArt";
import { JournalToolbar } from "./JournalToolbar";
import { useJournalUi } from "./ui";
import { activeJournals, defaultCompanionFor, newId, primaryJournal, useJournal } from "./useJournal";
import { formatDay, greeting } from "./format";
import * as P from "@/lib/journal/persistence";
import { aiStream, AiError } from "@/lib/journal/ai-client";
import { celebrate } from "@/lib/celebrate";
import { entryTitle, isListed, snapshotOf, type Companion, type Conversation, type Guide, type GuideQuestion, type GuideSnapshot, type GuideState, type Message, type MessageImage, type Mode } from "@/lib/journal/model";
import { isUnfinished } from "@/lib/journal/model";
import { companionPresets } from "@/lib/journal/presets";
import { addDays, onThisDay, streak, weekDays, weekStart } from "@/lib/journal/stats";

export const choiceInk = (tone: MuseTone) => ({ "--choice-ink": `var(--chart-${tone})`, "--choice-ink-b": `var(--chart-${(tone % 8) + 1})` }) as React.CSSProperties;
type Pending = { kind: "opening" } | { kind: "reply"; messageId: string };
const unfinished = isUnfinished;

/**
 * The Journal workspace ("Open Journal. Start talking. Everything else is in the toolbar."). Opening Journal lands
 * here, ready to type or dictate: an unfinished entry in this journal is resumed, otherwise the page is blank.
 * Nothing is stored until there are words (a draft entry after a pause; a real entry on Send). The companion replies
 * to what you write. Finish entry (beside Go deeper, once you've written) keeps the conversation (and its analysis) and turns to a fresh page.
 *
 * First visit only: Setup (one journal, one companion, optional words), then straight here.
 */
export function Workspace({ initialId, onRouteClear, continueFrom = null, onCreated }: { initialId: string | null; onRouteClear: () => void; continueFrom?: string | null; onCreated?: (id: string) => void }) {
  const j = useJournal();
  if (!activeJournals(j.state).length) return <Setup />;
  return <Page initialId={initialId} onRouteClear={onRouteClear} continueFrom={continueFrom} onCreated={onCreated} />;
}

function Page({ initialId, onRouteClear, continueFrom, onCreated }: { initialId: string | null; onRouteClear: () => void; continueFrom: string | null; onCreated?: (id: string) => void }) {
  const j = useJournal(), ui = useJournalUi();
  const { state, today, ai, client, userId, timeZone } = j;
  const [journalId, setJournalId] = useState<string | null>(null);
  const opened = initialId ? state.conversations.find((c) => c.id === initialId) : null;
  const journal = activeJournals(state).find((x) => x.id === (journalId ?? opened?.journalId)) ?? primaryJournal(state)!;
  const fallback = defaultCompanionFor(state, journal);
  const [nextCompanionId, setNextCompanionId] = useState<string | null>(null);

  // Which entry is on the page: the one asked for, else the most recent unfinished entry in this journal, else none.
  const resume = useCallback((jid: string) => state.conversations.filter((c) => c.journalId === jid && unfinished(c) && c.localDate >= addDays(today, -14)).sort((a, b) => (b.lastMessageAt ?? b.draftUpdatedAt ?? b.startedAt).localeCompare(a.lastMessageAt ?? a.draftUpdatedAt ?? a.startedAt))[0]?.id ?? null, [state.conversations, today]);
  const [convId, setConvId] = useState<string | null>(() => initialId ?? (continueFrom ? null : resume(journal.id)));
  // Continue from here: a fresh page that carries a reference to an earlier entry. Nothing is created until you write.
  const [pendingRef, setPendingRef] = useState<string | null>(continueFrom);
  const [prevContinue, setPrevContinue] = useState(continueFrom);
  const [prevInitial, setPrevInitial] = useState(initialId);
  if (prevInitial !== initialId) { setPrevInitial(initialId); if (initialId) setConvId(initialId); }
  const conv = convId ? state.conversations.find((c) => c.id === convId && c.status !== "completed") ?? null : null;
  const refSource = (conv ? conv.continuesId : pendingRef) ? state.conversations.find((c) => c.id === (conv ? conv.continuesId : pendingRef)) ?? null : null;
  const reference = conv ? (conv.continuesId || conv.continuesTitle ? { id: conv.continuesId, title: conv.continuesTitle || (refSource ? entryTitle(refSource) : "An earlier entry"), date: conv.continuesDate ?? refSource?.localDate ?? "" } : null)
    : pendingRef && refSource ? { id: refSource.id, title: entryTitle(refSource), date: refSource.localDate } : null;
  const [refPreview, setRefPreview] = useState(false);
  // Guided entries: a guide chosen for the next entry (or the journal's default), or the copy an entry began with.
  // A guided journal starts its own questions on every new entry; a freeform one opens the composer. No other choice.
  const guideSource: Guide | null = !conv && !pendingRef && journal.guided ? state.guides.find((g) => g.id === journal.defaultGuideId) ?? null : null;
  const guide: GuideSnapshot | null = conv?.guideSnapshot ?? (guideSource ? snapshotOf(guideSource) : null);
  const [gState, setGState] = useState<GuideState>({});
  const gKey = conv ? conv.id : `new:${guideSource?.id ?? ""}`;
  const [gFor, setGFor] = useState<string | null>(null);
  if (gFor !== gKey) { const keep = Boolean(gFor?.startsWith("new:") && conv); setGFor(gKey); if (!keep) setGState(conv?.guideState ?? {}); }
  const gTimer = useRef<number | undefined>(undefined);
  const companion = conv ? state.companions.find((c) => c.id === conv.companionId) ?? null : state.companions.find((c) => c.id === nextCompanionId && !c.archivedAt) ?? fallback;
  const tone = (state.journals.find((x) => x.id === (conv?.journalId ?? journal.id)) ?? journal).tone;

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [versions, setVersions] = useState<Map<string, { companionId: string; name: string; version: number }>>(new Map());
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [stream, setStream] = useState<{ text: string; pending: Pending } | null>(null);
  const [error, setError] = useState<{ text: string; retry?: Pending } | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  // Change date & time: for this entry, or the day a new entry is written for (a missed day).
  const [dateDialog, setDateDialog] = useState<null | "entry" | "new">(null);
  const [forDay, setForDay] = useState<{ date: string; time: string } | null>(null);
  const [saved, setSaved] = useState<Conversation | null>(null);
  const [mode, setMode] = useState<Mode>("open");
  const [greetNote, setGreetNote] = useState("");
  const [draftEntry, setDraftEntry] = useState<string | null>(null);
  const creating = useRef<Promise<Conversation | null> | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  /** On a desktop the page runs to the bottom of the window (less our usual padding), so the conversation gets every
   *  line of room; the toolbar sits up in the header. Measured, because the header's height varies by theme and width. */
  const fitToViewport = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const fit = () => { const top = el.getBoundingClientRect().top + window.scrollY; el.style.setProperty("--mj-ws-h", `${Math.max(480, Math.round(window.innerHeight - top - 24))}px`); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(document.body); window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, []);
  const aiOn = ai.enabled && Boolean(companion);
  const loaded = !convId || loadedFor === convId;

  // Load the entry's messages (and which companion version wrote each reply) when the page changes entries.
  useEffect(() => {
    if (!convId) return;
    let live = true;
    P.loadMessages(client, userId, convId).then(async ({ messages: list }) => {
      if (!live) return;
      setMessages(list); setLoadedFor(convId);
      const v = await P.versionsByIds(client, userId, list.map((m) => m.companionVersionId ?? "")).catch(() => new Map());
      if (live) setVersions(v);
    }).catch((e) => { if (live) { setLoadedFor(convId); setError({ text: e instanceof Error ? e.message : "This entry couldn’t load." }); } });
    return () => { live = false; };
  }, [client, userId, convId]);
  const shown = convId ? messages : [];
  const streaming = Boolean(stream);
  useEffect(() => { if (shown.length) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [shown.length, streaming]);

  const ask = useCallback(async (id: string, pending: Pending) => {
    setError(null); setStream({ text: "", pending });
    try {
      const done = await aiStream<{ message: Message }>(pending.kind === "opening" ? { action: "opening", conversationId: id, localDate: today, hour: new Date().getHours() } : { action: "reply", conversationId: id, messageId: pending.messageId, localDate: today },
        (d) => setStream((s) => (s ? { ...s, text: s.text + d } : s)));
      const m = done.message as unknown as Record<string, string>;
      setMessages((list) => [...list, { id: m.id, role: "assistant", body: m.body, createdAt: m.created_at, correctedAt: null, companionVersionId: m.companion_version_id, replyTo: m.reply_to ?? null }]);
      const v = await P.versionsByIds(client, userId, [m.companion_version_id]).catch(() => new Map());
      setVersions((old) => new Map([...old, ...v]));
      void j.refreshAi(); void j.refreshConversation(id);
    } catch (e) {
      const code = e instanceof AiError ? e.code : "failed";
      if (pending.kind === "opening" && code !== "duplicate") {
        // No greeting (AI unavailable, budget used, or a hiccup): never leave an empty entry behind; fall back to the
        // blank page so you can simply start writing.
        const empty = await P.loadMessages(client, userId, id).then((r) => !r.messages.length).catch(() => false);
        if (empty) { await j.deleteConversation(id); setConvId(null); setMessages([]); }
        setGreetNote(code === "limit-daily" || code === "limit-monthly" ? "No greeting this time: the AI budget is used up. Start writing whenever you’re ready." : "Your companion couldn’t greet you just now. Start writing whenever you’re ready.");
        return;
      }
      setError({ text: e instanceof Error ? e.message : "The reply couldn’t be finished.", retry: ["duplicate", "not-entitled", "limit-daily", "limit-monthly", "finished"].includes(code) ? undefined : pending });
      if (code === "duplicate") { const fresh = await P.loadMessages(client, userId, id); setMessages(fresh.messages); }
    } finally { setStream(null); }
  }, [client, userId, today, j]);

  /** Creates the entry only when needed (first Send, or "ask to begin"). Reuses this page's saved draft entry. */
  async function ensureEntry(status: "active" | "draft", draft?: string, guideState?: GuideState): Promise<Conversation | null> {
    if (conv) return conv;
    const existing = draftEntry ? state.conversations.find((c) => c.id === draftEntry) : null;
    if (existing) return existing;
    // One entry per page: a draft save and a first Send share the same creation, never making two entries.
    if (!creating.current) creating.current = j.startConversation({ journalId: journal.id, companion: ai.enabled ? companion : null, mode, status, draft, ...(forDay ? { localDate: forDay.date, startedAt: entryInstant(forDay.date, forDay.time, timeZone) } : {}), continues: pendingRef && refSource ? { id: refSource.id, title: entryTitle(refSource), date: refSource.localDate } : null, guide: guideSource ? { id: guideSource.id, snapshot: snapshotOf(guideSource), state: guideState ?? {} } : null }).then((c) => { if (c) { setDraftEntry(c.id); if (pendingRef || guideSource) onCreated?.(c.id); } return c ?? null; }).finally(() => { setTimeout(() => { creating.current = null; }, 0); });
    return creating.current;
  }
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  /** An earlier photo, attached again to the next message (the companion only sees photos with their own message). */
  function reattach(img: MessageImage) {
    void boardImageUrl(img.thumbnailPath).catch(() => "").then((preview) => setAttachments((list) => list.length >= 7 || list.some((a) => a.stored?.id === img.id) ? list : [...list, { key: `again-${img.id}`, preview, stored: img }]));
  }
  async function send(text: string, photos: Attachment[] = []) {
    const c = await ensureEntry("active"); if (!c) return false;
    const body = text || (photos.length === 1 ? "[1 photo]" : `[${photos.length} photos]`);
    const id = newId(), optimistic: ThreadMessage = { id, role: "user", body, createdAt: new Date().toISOString(), correctedAt: null, pending: true, previews: photos.map((p) => p.preview).filter(Boolean) };
    setSending(true); setError(null); setSaved(null);
    if (!convId) { setConvId(c.id); setLoadedFor(c.id); setMessages([optimistic]); } else setMessages((list) => [...list, optimistic]);
    try {
      // Photos upload first (resized, private, in this entry's folder), so a saved message never waits on them.
      const folder = `${userId}/${c.id}/`;
      const uploaded = await Promise.all(photos.map(async (a, position) => {
        if (a.stored && a.stored.path.startsWith(folder)) return { position, path: a.stored.path, thumbnailPath: a.stored.thumbnailPath, width: a.stored.width, height: a.stored.height, mime: a.stored.mime };
        if (a.stored) { // from another entry: copy into this entry's folder
          const bucket = client.storage.from(P.IMAGE_BUCKET), name = (p: string) => folder + p.split("/").pop();
          for (const p of [a.stored.path, a.stored.thumbnailPath]) { const r = await bucket.copy(p, name(p)); if (r.error && !/exists/i.test(r.error.message)) throw Error("A photo couldn’t be attached again."); }
          return { position, path: name(a.stored.path), thumbnailPath: name(a.stored.thumbnailPath), width: a.stored.width, height: a.stored.height, mime: a.stored.mime };
        }
        const u = await uploadBoardImage(userId, c.id, a.file!, { allowJpeg: true });
        return { position, path: u.path, thumbnailPath: u.thumbnailPath, width: u.width, height: u.height, mime: u.mime };
      }));
      const m = await P.addMessage(client, userId, { id, conversationId: c.id, body, localDate: c.localDate });
      let images: MessageImage[] = [], linked = true;
      if (uploaded.length) { try { images = await P.addMessageImages(client, userId, c.id, id, uploaded); } catch { linked = false; } }
      setMessages((list) => list.map((x) => (x.id === id ? { ...m, images, pending: false } : x)));
      for (const p of photos) if (p.file) URL.revokeObjectURL(p.preview);
      setAttachments([]);
      if (!convId) { clearLocalDraft(`new:${journal.id}`); setDraftEntry(null); }
      if (c.status === "draft" || !convId) setConvId(c.id);
      void j.refreshConversation(c.id);
      setSending(false);
      if (!linked) { setError({ text: "Your words are saved, but the photos couldn’t be attached. Add them again to ask about them." }); return true; }
      if (ai.enabled && companion) void ask(c.id, { kind: "reply", messageId: id });
      return true;
    } catch (e) {
      setMessages((list) => list.filter((x) => x.id !== id)); setSending(false);
      setError({ text: `${e instanceof Error ? e.message : "Not saved."} Your words${photos.length ? " and photos are" : " are"} still in the box.` });
      return false;
    }
  }
  async function saveDraft(text: string) {
    if (conv) { void P.saveDraft(client, userId, conv.id, text).catch(() => undefined); return; }
    if (!draftEntry && text.trim()) { await ensureEntry("draft", text); return; }
    if (draftEntry) {
      if (!text.trim()) { const id = draftEntry; setDraftEntry(null); await j.deleteConversation(id); }
      else await P.saveDraft(client, userId, draftEntry, text).catch(() => undefined);
    }
  }
  async function finish() {
    let c = conv;
    if (!c && guide) c = await ensureEntry("active", undefined, gState);
    if (!c) return;
    if (guide) { // every answer not yet sent becomes a message under its question, in order
      window.clearTimeout(gTimer.current);
      for (const q of guide.questions) {
        const text = (gState.answers?.[q.id] ?? "").trim();
        if (text && !(gState.sent ?? []).includes(q.id) && !messages.some((m) => m.guideQuestionId === q.id)) await postAnswer(c, q, text);
      }
    }
    const fresh = await j.refreshConversation(c.id) ?? c;
    const done = await j.finish(fresh);
    if (!done) return;
    celebrate({ kind: "constellation", tier: "small", stars: 3, message: "Sealed in your journal.", sound: "seal", key: `journal-finish:${done.id}` });
    setConfirmFinish(false); setSaved(done); setConvId(null); setMessages([]); setMode("open"); setDraftEntry(null);
    onRouteClear();
  }
  if (prevContinue !== continueFrom) { setPrevContinue(continueFrom); if (continueFrom) { setPendingRef(continueFrom); setConvId(null); setMessages([]); setDraftEntry(null); setSaved(null); setError(null); } }
  function dropReference() {
    if (conv) void j.updateMeta({ ...conv, continuesId: null, continuesTitle: "", continuesDate: null });
    else { setPendingRef(null); onRouteClear(); }
  }
  /** Answers save like a draft; the first real answer creates the entry (never an empty one). */
  function updateGuide(next: GuideState) {
    setGState(next);
    window.clearTimeout(gTimer.current);
    gTimer.current = window.setTimeout(() => {
      const has = Object.values(next.answers ?? {}).some((v) => v.trim());
      void (async () => { const c = conv ?? (has ? await ensureEntry("draft", undefined, next) : null); if (c) await P.saveGuideState(client, userId, c.id, next).catch(() => undefined); })();
    }, 700);
  }
  async function postAnswer(c: Conversation, q: GuideQuestion, text: string) {
    const m = await P.addMessage(client, userId, { id: newId(), conversationId: c.id, body: text, localDate: c.localDate, guideQuestionId: q.id, guideQuestion: q.text });
    setMessages((list) => [...list, m]); return m;
  }
  /** Only when the guide allows it and you ask: one answer becomes a message and the companion replies to it. */
  async function talkAbout(q: GuideQuestion, text: string) {
    window.clearTimeout(gTimer.current);
    const c = conv ?? await ensureEntry("active", undefined, gState); if (!c) return;
    setSending(true); setError(null);
    try {
      const m = await postAnswer(c, q, text);
      const next = { ...gState, sent: [...new Set([...(gState.sent ?? []), q.id])] };
      setGState(next); await P.saveGuideState(client, userId, c.id, next).catch(() => undefined);
      if (!convId || c.status === "draft") { setConvId(c.id); setLoadedFor(c.id); }
      void j.refreshConversation(c.id); setSending(false);
      if (aiOn) void ask(c.id, { kind: "reply", messageId: m.id });
    } catch (e) { setSending(false); setError({ text: e instanceof Error ? e.message : "Not saved." }); }
  }
  function fresh() { setForDay(null); setPendingRef(null); setConvId(null); setMessages([]); setError(null); setSaved(null); setGreetNote(""); setMode("open"); setDraftEntry(null); onRouteClear(); }
  /** New entry, deliberately: a fresh page, and (if chosen in preferences) one greeting from the companion. */
  function newEntry() {
    fresh();
    if (!state.prefs.greetOnNew || !ai.enabled || !companion) return;
    if (ai.allowance?.exhausted) { setGreetNote("No greeting this time: the AI budget is used up. Start writing whenever you’re ready."); return; }
    void beginFresh("open");
  }
  /** Starts a brand-new entry (never the current one) and asks the companion to open it. */
  async function beginFresh(m: Mode) {
    setMode(m);
    const c = await j.startConversation({ journalId: journal.id, companion, mode: m });
    if (!c) return;
    setConvId(c.id); setLoadedFor(c.id); setMessages([]); setSaved(null);
    void ask(c.id, { kind: "opening" });
  }
  /** Switching journals changes the page's context. An entry in progress stays where it is (with its draft) and
   *  can be found again from this journal; moving an entry is a separate, explicit action. */
  function switchJournal(id: string) {
    setJournalId(id); setNextCompanionId(null); setConvId(resume(id)); setMessages([]); setError(null); setSaved(null); setDraftEntry(null);
  }
  function switchCompanion(c: Companion) {
    if (conv) void j.switchCompanion(conv, c);
    else setNextCompanionId(c.id);
  }

  const lastUser = [...shown].reverse().find((m) => m.role === "user");
  const unanswered = aiOn && !stream && lastUser && shown[shown.length - 1]?.id === lastUser.id;
  const userCount = shown.filter((m) => m.role === "user").length;
  const others = state.conversations.filter((c) => c.id !== conv?.id && unfinished(c)).slice(0, 5);
  const pinned = conv?.companionVersionId ? [...versions.entries()].find(([id]) => id === conv.companionVersionId)?.[1] : undefined;
  const display: ThreadMessage[] = stream ? [...shown, { id: "streaming", role: "assistant", body: stream.text || " ", createdAt: new Date().toISOString(), correctedAt: null, streaming: true, companionVersionId: conv?.companionVersionId ?? null }] : shown;
  const whoFor = (m: ThreadMessage) => {
    const v = m.companionVersionId ? versions.get(m.companionVersionId) : undefined;
    const c = state.companions.find((x) => x.id === (v?.companionId ?? conv?.companionId));
    return { name: v?.name ?? c?.name ?? conv?.companionName ?? "Companion", icon: c?.icon ?? "sparkle", tone: c?.tone ?? (5 as MuseTone) };
  };
  // The Journal menu's "This entry" and "Pick up where you left off" (what the old ⋯ menu held, minus new-entry starts).
  const entryMenu = (close: () => void) => <>
    {conv && <div className="mj-menu-list" role="group" aria-label="This entry">
      <p className="mj-menu-head type-meta">This entry</p>
      {activeJournals(state).filter((x) => x.id !== conv.journalId).slice(0, 6).map((x) => <button key={x.id} type="button" className="popover-choice" onClick={() => { close(); void j.updateMeta({ ...conv, journalId: x.id }).then((s) => { if (s) setJournalId(x.id); }); }}><span className="mj-menu-item"><MuseIcon name="arrow" size={14} />Move it to {x.name}</span></button>)}
      <button type="button" className="popover-choice" onClick={() => { close(); setDateDialog("entry"); }}><span className="mj-menu-item"><MuseIcon name="calendar" size={14} />Change date &amp; time</span></button>
      <button type="button" className="popover-choice" onClick={() => { close(); void j.updateMeta({ ...conv, memoryOff: !conv.memoryOff }); }}><span className="mj-menu-item"><MuseIcon name={conv.memoryOff ? "eye" : "eye-off"} size={14} />{conv.memoryOff ? "Use my journal history here" : "Don’t use my journal history here"}</span></button>
      <button type="button" className="popover-choice" data-destructive onClick={() => { close(); if (window.confirm(userCount ? "Delete this entry? This can’t be undone." : "Discard this draft?")) void j.deleteConversation(conv.id).then((ok) => ok && fresh()); }}><span className="mj-menu-item"><MuseIcon name="trash" size={14} />{userCount ? "Delete this entry" : "Discard this draft"}</span></button>
    </div>}
    {others.length > 0 && <div className="mj-menu-list" role="group" aria-label="Pick up where you left off">
      <p className="mj-menu-head type-meta">Pick up where you left off</p>
      {others.map((c) => <button key={c.id} type="button" className="popover-choice" onClick={() => { close(); setJournalId(c.journalId); setConvId(c.id); setSaved(null); }}><span className="mj-menu-item"><MuseIcon name="undo" size={14} /><span>{entryTitle(c, c.status === "draft" ? "Unsent draft" : "Untitled")}<small className="type-meta"> · {formatDay(c.localDate)}</small></span></span></button>)}
    </div>}
  </>;

  const toolbar = <div className="mj-header-toolbar" style={{ "--journal-a": `var(--chart-${tone})`, "--journal-b": `var(--chart-${(tone % 8) + 1})` } as React.CSSProperties}>
    <JournalToolbar journal={journal} companion={companion} defaultCompanionId={fallback?.id ?? null}
      onJournal={switchJournal} onCompanion={switchCompanion} onMakeDefault={(c) => void j.setDefaultCompanion(journal, c.id)}
      conversationNote={conv ? <>Replies from now on use {companion?.name ?? "this companion"}{pinned ? ` (version ${pinned.version})` : ""}. Earlier replies keep their words.{companion && pinned && companion.version > pinned.version ? ` ${companion.name} has newer saved words (version ${companion.version}): choose it again to use them.` : ""}</> : undefined}
      entryMenu={entryMenu}
      extra={<NewEntryMenu disabled={streaming} guided={Boolean(journal.guided)} greet={state.prefs.greetOnNew && aiOn} companionName={aiOn ? companion!.name.replace(/^The /, "") : null}
        onStart={(kind) => { if (kind === "earlier") { newEntry(); setDateDialog("new"); } else if (kind === "write") newEntry(); else { fresh(); void beginFresh(kind === "ask" ? "open" : kind); } }} />} />
  </div>;
  return <section ref={fitToViewport} className="muse-journal-archive mj-workspace mj-reveal" aria-label="Journal" style={{ "--journal-a": `var(--chart-${tone})`, "--journal-b": `var(--chart-${(tone % 8) + 1})` } as React.CSSProperties}>
    {ui.toolbarSlot && createPortal(toolbar, ui.toolbarSlot)}

    <div className="mj-ws-page">
      {reference && <div className="mj-ref" role="note">
        <svg className="mj-ref-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
        <span className="type-meta">{conv && !conv.continuesId ? "Continued from" : "Referencing"}</span>
        {reference.id && refSource ? <button type="button" className="mj-ref-link" onClick={() => setRefPreview(true)}>“{reference.title}” · {reference.date ? formatDay(reference.date) : ""}</button>
          : <span className="mj-ref-link" data-gone>“{reference.title}”{reference.date ? ` · ${formatDay(reference.date)}` : ""} · no longer in your journal</span>}
        {reference.id && <button type="button" className="mj-x" aria-label="Stop referencing this entry" title="Stop referencing" onClick={dropReference}>×</button>}
      </div>}
      {refPreview && refSource && <MuseModal id="mj-ref-preview" label="Referenced entry" title={entryTitle(refSource)} returnFocus={null} onClose={() => setRefPreview(false)}>
        <div className="mj-form">
          <p className="muse-kicker type-meta">{formatDay(refSource.localDate)}{refSource.companionName ? ` · with ${refSource.companionName}` : ""}</p>
          {refSource.summary ? <blockquote className="mj-pullquote"><div className="type-reading"><Prose text={refSource.summary} /></div></blockquote> : <p className="mj-note">No summary for this entry.</p>}
          <p className="mj-note">Your companion has this entry as background when you send your first message, then keeps its summary. The original stays exactly as it is.</p>
          <div className="mj-form-actions"><Link className="muse-button" href={`/journal?entry=${refSource.id}`}>Open the entry</Link><button type="button" className="muse-button button-primary" onClick={() => setRefPreview(false)}>Keep writing</button></div>
        </div>
      </MuseModal>}
      {greetNote && !shown.length && <p className="mj-note mj-greet-note" role="status">{greetNote}</p>}
      {saved && <p className="mj-saved" role="status"><MuseIcon name="check" size={15} /> Saved “{entryTitle(saved)}”. <Link href={`/journal?entry=${saved.id}`}>Open it</Link>{saved.analysisStatus === "pending" && " · the analysis is on its way"}</p>}
      {guide ? <>
        <GuidedEntry guide={guide} state={gState} onState={updateGuide} messages={shown} stream={stream ? { text: stream.text, messageId: stream.pending.kind === "reply" ? stream.pending.messageId : null } : null}
          companion={companion ? { name: companion.name, icon: companion.icon, tone: companion.tone } : null} canTalk={guide.companion && aiOn} busy={sending || streaming} dock={dock}
          onTalk={(q, text) => void talkAbout(q, text)} onFinish={() => setConfirmFinish(true)}
          finishDisabled={streaming || sending || confirmFinish || !(userCount || Object.values(gState.answers ?? {}).some((v) => v.trim()))} />
        {error && <div className="mj-error" role="alert"><span>{error.text}</span>{error.retry && conv && <button type="button" className="muse-button" onClick={() => void ask(conv.id, error.retry!)}>Ask again</button>}</div>}
      </> : <>
      {!shown.length && !stream ? <BlankHead tone={tone} mode={conv?.mode ?? mode} forDay={forDay?.date ?? null} onPickDay={() => setDateDialog("new")} /> : <p className="mj-ws-date muse-kicker type-meta"><button type="button" className="mj-date-edit" title="Change date & time" onClick={() => setDateDialog(conv ? "entry" : "new")}>{formatDay(conv?.localDate ?? forDay?.date ?? today)}{conv ? ` · ${displayClock(conv.startedAt, conv.timeZone)}` : ""}<MuseIcon name="edit" size={12} /></button>{(conv?.mode ?? mode) !== "open" && ` · ${(conv?.mode ?? mode) === "morning" ? "Morning intention" : "Evening reflection"}`}{conv?.memoryOff && " · not using your journal history"}</p>}
      {!loaded ? <p className="small-label" role="status">Opening your entry…</p> : <Thread messages={display} onReattach={conv && conv.status !== "completed" ? reattach : undefined} companion={companion ? { name: companion.name, icon: companion.icon, tone: companion.tone } : null} companionFor={whoFor} timeZone={timeZone} />}
      {stream && !stream.text && <Thinking name={whoFor({ companionVersionId: conv?.companionVersionId ?? null } as ThreadMessage).name} />}
      {error && <div className="mj-error" role="alert"><span>{error.text}</span>{error.retry && conv && <button type="button" className="muse-button" onClick={() => void ask(conv.id, error.retry!)}>Ask again</button>}</div>}
      {!error && unanswered && conv && loaded && <div className="mj-error" data-soft><span>No reply to your last message yet.</span><button type="button" className="muse-button" onClick={() => void ask(conv.id, { kind: "reply", messageId: lastUser!.id })}>Ask for a reply</button></div>}
      <Composer storageKey={conv && conv.status !== "draft" ? conv.id : `new:${journal.id}`} initial={conv?.draft ?? ""} busy={sending} disabled={!loaded}
        placeholder={shown.length ? "Keep going… (type or dictate)" : (conv?.mode ?? mode) === "morning" ? "How are you starting the day?" : (conv?.mode ?? mode) === "evening" ? "How was today?" : "What’s on your mind? Type or dictate…"}
        hint={aiOn ? `Type, or tap the mic to speak. ${companion!.name.replace(/^The /, "")} replies when you send.` : "Type, or tap the mic to speak. Everything saves as you go."}
        onSend={send} onDraft={(text) => void saveDraft(text)} label="Write or dictate" dock={dock} attachments={attachments} onAttachments={setAttachments}
        sendLabel={userCount ? (aiOn ? "Go deeper" : "Add to entry") : "Send"}
        secondary={userCount ? { label: "Finish entry", disabled: streaming || sending || confirmFinish, onClick: () => setConfirmFinish(true) } : undefined} />
      </>}
      <div ref={end} />
    </div>
    <div className="mj-live-compose">
      {dateDialog === "entry" && conv && <EntryDateDialog title="Change date & time" date={conv.localDate} time={localClock(conv.startedAt, conv.timeZone)} today={today} onClose={() => setDateDialog(null)}
        onSave={async (d, t) => Boolean(await j.redate(conv, d, entryInstant(d, t, conv.timeZone)))} />}
      {dateDialog === "new" && <EntryDateDialog title="Write for another day" date={forDay?.date ?? today} time={forDay?.time ?? ""} today={today} onClose={() => setDateDialog(null)}
        note="This entry will be saved on the day you choose: its place in History and its streak day. Leave the time blank if it doesn’t matter."
        onSave={async (d, t) => { setForDay(d === today && !t ? null : { date: d, time: t }); return true; }} />}
      {confirmFinish && <div className="mj-finish" role="dialog" aria-label="Finish this entry">
        <p><b>Finish this entry?</b> It’s saved already. Finishing closes the conversation{ai.enabled && state.prefs.analysisAuto ? " and writes a short analysis you can edit" : ""}, then gives you a fresh page.</p>
        <div><button type="button" className="muse-button" onClick={() => setConfirmFinish(false)}>Keep talking</button><button type="button" className="muse-button button-primary" onClick={() => void finish()}>Finish &amp; save</button></div>
      </div>}
      {ai.enabled && ai.allowance?.warning && <p className="mj-note" data-soft>{ai.allowance.exhausted ? "This month’s AI budget is used up, so replies are paused. Writing still saves." : `You’ve used ${"$" + ai.allowance.spentMonth.toFixed(2)} of this month’s ${"$" + ai.allowance.monthlyLimit.toFixed(2)} AI budget.`}</p>}
      <div className="mj-dock-slot" ref={setDock} />
    </div>
  </section>;
}

/** The top of a blank page: the day, a greeting, this week as a constellation, and a quiet door to On This Day. */
function BlankHead({ tone, mode, forDay, onPickDay }: { tone: number; mode: Mode; forDay: string | null; onPickDay: () => void }) {
  const j = useJournal();
  const { state, today } = j;
  const listed = state.conversations.filter(isListed);
  const days = useMemo(() => new Set(listed.map((c) => c.localDate)), [listed]);
  const yesterday = listed.find((c) => c.localDate === addDays(today, -1) && c.title);
  const past = state.prefs.onThisDay ? onThisDay(state.conversations, today) : [];
  const run = streak(days, today);
  return <div className="mj-blank" data-tone={tone}>
    <div className="mj-blank-copy">
      <p className="muse-kicker type-meta"><button type="button" className="mj-date-edit" title="Write for another day" onClick={onPickDay}>{forDay && forDay !== today ? `For ${formatDay(forDay)}` : formatDay(today)}<MuseIcon name="edit" size={12} /></button>{mode !== "open" && ` · ${mode === "morning" ? "Morning intention" : "Evening reflection"}`}</p>
      <h2 className="type-display mj-greeting">{greeting(new Date().getHours())}.</h2>
      <p className="mj-blank-line type-quote">{yesterday ? <>Yesterday you wrote about <Link href={`/journal?entry=${yesterday.id}`}>“{yesterday.title}”</Link>.</> : "A place to think out loud."}</p>
    </div>
    <div className="mj-blank-week">
      <WeekConstellation days={weekDays(weekStart(today))} written={days} today={today} />
      <p className="type-meta"><b className="type-numeric">{run}</b> {run === 1 ? "day" : "days"} in a row{past.length > 0 && <> · <Link href={`/journal?view=history&onthisday=1`}>On this day</Link></>}</p>
    </div>
  </div>;
}

/**
 * First visit only: one journal and one companion. Customizing is optional; so is testing in the Studio. Then
 * straight into the workspace; this never asks again.
 */
function Setup() {
  const j = useJournal(), router = useRouter();
  const [name, setName] = useState("My Journal");
  const [preset, setPreset] = useState(companionPresets[0].key);
  const [customizing, setCustomizing] = useState(false);
  const chosen = companionPresets.find((p) => p.key === preset)!;
  const [words, setWords] = useState<Record<string, string>>({});
  const instructions = words[preset] ?? chosen.instructions;
  async function finish(studio: boolean) {
    const out = await j.setup({ journalName: name, presetKey: preset, instructions: customizing ? instructions : undefined });
    if (out && studio) router.push(`/journal?companion=${out.companion.id}`);
  }
  return <section className="muse-journal-archive mj-setup mj-starters mj-reveal" aria-labelledby="mj-setup-title">
    <div className="mj-blank-copy">
      <p className="muse-kicker type-meta">Welcome to your journal</p>
      <h2 id="mj-setup-title" className="type-display mj-greeting">A place to think out loud.</h2>
      <p className="mj-blank-line type-quote">Two small choices, then you’re writing. You can change both any time.</p>
    </div>
    <label className="mj-setup-name"><span className="mj-section-title">Your journal</span><input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label="Journal name" /></label>
    {j.ai.enabled && <div className="mj-choose">
      <div className="mj-choose-head"><h3 className="mj-section-title">Your companion</h3><span className="mj-note type-meta">Who you’d like to talk with</span></div>
      <div className="mj-choices" role="radiogroup" aria-label="Your companion">{companionPresets.map((p) => <button key={p.key} type="button" role="radio" aria-checked={preset === p.key} className="mj-choice" style={choiceInk(p.tone)} onClick={() => setPreset(p.key)}>
        <MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone} size="md" /><span className="mj-choice-copy"><span className="mj-choice-name type-heading">{p.name}</span><span className="mj-choice-line">{p.description}</span></span><span className="mj-choice-check" aria-hidden="true"><MuseIcon name="check" size={13} /></span>
      </button>)}</div>
      <details className="mj-customize" open={customizing} onToggle={(e) => setCustomizing((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>Make {chosen.name.replace(/^The /, "the ")} yours <span className="type-meta">(optional)</span></summary>
        <label className="editor-label">Personality, in your own words<textarea className="mj-prompt" rows={9} value={instructions} onChange={(e) => setWords((w) => ({ ...w, [preset]: e.target.value }))} /></label>
        <p className="mj-note">Paste a prompt you already love, or edit this one. You can test and refine it any time in the Companion Studio.</p>
      </details>
    </div>}
    {j.status.error && <p className="mj-error" role="alert">{j.status.error}</p>}
    <div className="mj-begin-row">
      {j.ai.enabled && <button type="button" className="muse-button button-ghost" disabled={j.status.saving || !name.trim()} onClick={() => void finish(true)}>Set up and test in the Studio</button>}
      <button type="button" className="muse-button button-primary mj-new-entry" disabled={j.status.saving || !name.trim()} onClick={() => void finish(false)}>{j.status.saving ? "Setting up…" : "Start journaling"}</button>
    </div>
  </section>;
}

/**
 * New entry, with the ways to start: just write (with a greeting if you've chosen one), ask the companion to begin, or
 * a morning intention or evening reflection. A guided journal simply starts its questions.
 */
function NewEntryMenu({ disabled, guided, greet, companionName, onStart }: { disabled: boolean; guided: boolean; greet: boolean; companionName: string | null; onStart: (kind: "write" | "ask" | "morning" | "evening" | "earlier") => void }) {
  const [open, setOpen] = useState(false), anchor = useRef<HTMLButtonElement>(null);
  const simple = guided || !companionName;
  if (simple) return <button type="button" className="muse-button button-ghost mj-tb-new" onClick={() => onStart("write")} disabled={disabled} aria-label="New entry"><MuseIcon name="plus" size={16} /><span className="mj-tb-label">New entry</span></button>;
  const pick = (k: "write" | "ask" | "morning" | "evening" | "earlier") => { setOpen(false); onStart(k); };
  return <>
    <button ref={anchor} type="button" className="muse-button button-ghost mj-tb-new" aria-haspopup="dialog" aria-expanded={open} aria-controls="mj-new-entry" onClick={() => setOpen(!open)} disabled={disabled} aria-label="New entry"><MuseIcon name="plus" size={16} /><span className="mj-tb-label">New entry</span><MuseIcon name="chevron" size={13} /></button>
    <GlassPopover id="mj-new-entry" label="New entry" title="New entry" open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={300}>
      <div className="mj-menu-list" role="group" aria-label="Start">
        <button type="button" className="popover-choice" onClick={() => pick("write")}><span className="mj-menu-item"><MuseIcon name="edit" size={15} /><span>Start writing{greet && <small className="type-meta"> · {companionName} says hello</small>}</span></span></button>
        <button type="button" className="popover-choice" onClick={() => pick("ask")}><span className="mj-menu-item"><MuseIcon name="sparkle" size={15} />Ask {companionName} to begin</span></button>
        <button type="button" className="popover-choice" onClick={() => pick("morning")}><span className="mj-menu-item"><MuseIcon name="sun" size={15} />Morning intention</span></button>
        <button type="button" className="popover-choice" onClick={() => pick("evening")}><span className="mj-menu-item"><MuseIcon name="moon" size={15} />Evening reflection</span></button>
        <button type="button" className="popover-choice" onClick={() => pick("earlier")}><span className="mj-menu-item"><MuseIcon name="calendar" size={15} />Write for an earlier day…</span></button>
      </div>
    </GlassPopover>
  </>;
}
