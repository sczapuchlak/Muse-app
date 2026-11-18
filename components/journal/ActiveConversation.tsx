"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { MuseMark, type MuseMarkIcon } from "../design/MuseHeading";
import { Composer } from "./Composer";
import { Thinking, Thread, type ThreadMessage } from "./Thread";
import { newId, useJournal } from "./useJournal";
import * as P from "@/lib/journal/persistence";
import { aiStream, AiError } from "@/lib/journal/ai-client";
import type { Conversation, Message } from "@/lib/journal/model";
import { formatDay } from "./format";

type Pending = { kind: "opening" } | { kind: "reply"; messageId: string };

/**
 * An active conversation (Journal V1 §9, addendum §1). Every sent message is saved before the AI is asked; the reply
 * streams in and is saved by the server. If the AI fails, the words are already safe and "Ask again" retries the same
 * message (the server refuses a second reply to it). Finish & Save closes the entry.
 */
export function ActiveConversation({ conversation, requestOpening, onClose, onFinished }: { conversation: Conversation; requestOpening?: boolean; onClose: () => void; onFinished: (c: Conversation) => void }) {
  const j = useJournal();
  const { client, userId, ai, timeZone, today } = j;
  const journal = j.state.journals.find((x) => x.id === conversation.journalId);
  const companion = j.state.companions.find((c) => c.id === conversation.companionId) ?? null;
  const who = companion ? { name: companion.name, icon: companion.icon, tone: companion.tone } : conversation.companionName ? { name: conversation.companionName, icon: "sparkle", tone: 5 as const } : null;
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [stream, setStream] = useState<{ text: string; pending: Pending } | null>(null);
  const [error, setError] = useState<{ text: string; retry?: Pending } | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const end = useRef<HTMLDivElement>(null), opened = useRef(false);
  const aiOn = ai.enabled && Boolean(companion || conversation.companionName);

  const ask = useCallback(async (pending: Pending) => {
    setError(null); setStream({ text: "", pending });
    try {
      const done = await aiStream<{ message: Message }>(pending.kind === "opening" ? { action: "opening", conversationId: conversation.id, localDate: today, hour: new Date().getHours() } : { action: "reply", conversationId: conversation.id, messageId: pending.messageId, localDate: today },
        (d) => setStream((s) => (s ? { ...s, text: s.text + d } : s)));
      const m = done.message as unknown as Record<string, string>;
      setMessages((list) => [...list, { id: m.id, role: "assistant", body: m.body, createdAt: m.created_at, correctedAt: null }]);
      void j.refreshAi();
    } catch (e) {
      const code = e instanceof AiError ? e.code : "failed";
      setError({ text: e instanceof Error ? e.message : "The reply couldn’t be finished.", retry: ["duplicate", "not-entitled", "limit-daily", "limit-monthly", "finished"].includes(code) ? undefined : pending });
      if (code === "duplicate") { const fresh = await P.loadMessages(client, userId, conversation.id); setMessages(fresh.messages); }
    } finally { setStream(null); }
  }, [client, userId, conversation.id, today, j]);

  useEffect(() => {
    let live = true;
    P.loadMessages(client, userId, conversation.id).then(({ messages: list }) => {
      if (!live) return; setMessages(list); setLoaded(true);
      if (requestOpening && aiOn && !list.length && !opened.current) { opened.current = true; void ask({ kind: "opening" }); }
    }).catch((e) => { if (live) { setLoaded(true); setError({ text: e instanceof Error ? e.message : "This conversation couldn’t load." }); } });
    return () => { live = false; };
  }, [client, userId, conversation.id, requestOpening, aiOn, ask]);
  const streaming = Boolean(stream);
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages.length, streaming]);

  async function send(text: string) {
    const id = newId(), optimistic: ThreadMessage = { id, role: "user", body: text, createdAt: new Date().toISOString(), correctedAt: null, pending: true };
    setSending(true); setError(null); setMessages((list) => [...list, optimistic]);
    try {
      const saved = await P.addMessage(client, userId, { id, conversationId: conversation.id, body: text, localDate: today });
      setMessages((list) => list.map((m) => (m.id === id ? { ...saved, pending: false } : m)));
      void j.refreshConversation(conversation.id);
      setSending(false);
      if (aiOn) void ask({ kind: "reply", messageId: id });
      return true;
    } catch (e) {
      setMessages((list) => list.filter((m) => m.id !== id)); setSending(false);
      setError({ text: `${e instanceof Error ? e.message : "Not saved."} Your words are still in the box.` });
      return false;
    }
  }
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const unanswered = aiOn && !stream && lastUser && messages[messages.length - 1]?.id === lastUser.id;
  const userCount = messages.filter((m) => m.role === "user").length;

  async function finish() {
    const fresh = await j.refreshConversation(conversation.id) ?? conversation;
    const done = await j.finish(fresh);
    if (done) onFinished(done);
  }
  const display: ThreadMessage[] = stream ? [...messages, { id: "streaming", role: "assistant", body: stream.text || " ", createdAt: new Date().toISOString(), correctedAt: null, streaming: true }] : messages;

  return <section className="mj-live" aria-labelledby="mj-live-title" style={{ "--journal-a": `var(--chart-${journal?.tone ?? 5})`, "--journal-b": `var(--chart-${((journal?.tone ?? 5) % 8) + 1})` } as React.CSSProperties}>
    <header className="mj-live-head">
      <button type="button" className="muse-button button-ghost mj-back" onClick={onClose}>← Today</button>
      <div className="mj-live-title">
        <p className="muse-kicker">{formatDay(conversation.localDate)}{conversation.mode !== "open" && ` · ${conversation.mode === "morning" ? "Morning intention" : "Evening reflection"}`}</p>
        <h2 id="mj-live-title">{journal?.name ?? "Journal"}</h2>
      </div>
      <div className="mj-live-tools">
        {who && <span className="mj-chip mj-companion-chip"><MuseMark icon={who.icon as MuseMarkIcon} tone={who.tone} size="sm" />{who.name}</span>}
        {(conversation.memoryOff || journal?.memoryScope === "off" || !j.state.prefs.memoryEnabled) ? <span className="mj-chip" title="This conversation doesn’t use your journal history">Memory off</span> : journal?.memoryScope === "journal" ? <span className="mj-chip" title="Uses only this journal’s history">Memory: this journal</span> : null}
        <button type="button" className="muse-button button-primary" disabled={!userCount || Boolean(stream) || sending} onClick={() => setConfirmFinish(true)}>Finish &amp; save</button>
        <MuseOverflowMenu label="Conversation options" actions={[
          { id: "memory", label: conversation.memoryOff ? "Use my journal history here" : "Don’t use my journal history here", onSelect: () => void j.updateMeta({ ...conversation, memoryOff: !conversation.memoryOff }) },
          { id: "delete", label: "Delete this conversation", destructive: true, onSelect: () => void j.deleteConversation(conversation.id).then((ok) => ok && onClose()) },
        ]} />
      </div>
    </header>
    {confirmFinish && <div className="mj-finish" role="dialog" aria-label="Finish this entry">
      <p><b>Finish this entry?</b> It’s saved already. Finishing closes the conversation{ai.enabled && j.state.prefs.analysisAuto ? " and writes a short analysis you can edit" : ""}. You can always start a new one.</p>
      <div><button type="button" className="muse-button" onClick={() => setConfirmFinish(false)}>Keep talking</button><button type="button" className="muse-button button-primary" onClick={() => void finish()}>Finish &amp; save</button></div>
    </div>}
    <div className="mj-live-scroll">
      {!loaded ? <p className="small-label" role="status">Opening your conversation…</p> : <Thread messages={display} companion={who} timeZone={timeZone}
        empty={stream ? null : <div className="mj-live-empty"><p className="mj-live-empty-title">{aiOn ? "Say whatever’s on your mind." : "This page is yours."}</p><p>{aiOn ? `${who?.name ?? "Your companion"} will reply when you send. Everything saves as you go.` : ai.entitled || ai.configured ? "AI replies are paused, so this is a quiet page to write on. Everything saves as you go." : "Write as much or as little as you like. Each message saves as you go."}</p></div>} />}
      {stream && !stream.text && <Thinking name={who?.name ?? "Your companion"} />}
      {error && <div className="mj-error" role="alert"><span>{error.text}</span>{error.retry && <button type="button" className="muse-button" onClick={() => void ask(error.retry!)}>Ask again</button>}</div>}
      {!error && unanswered && loaded && <div className="mj-error" data-soft><span>No reply to your last message yet.</span><button type="button" className="muse-button" onClick={() => void ask({ kind: "reply", messageId: lastUser!.id })}>Ask for a reply</button></div>}
      {!error && aiOn && loaded && !messages.length && !stream && !requestOpening && <div className="mj-error" data-soft><span>Want {who?.name ?? "your companion"} to start?</span><button type="button" className="muse-button" onClick={() => void ask({ kind: "opening" })}>Open the conversation</button></div>}
      <div ref={end} />
    </div>
    <div className="mj-live-compose">
      <Composer storageKey={conversation.id} initial={conversation.draft} busy={sending} disabled={!loaded}
        placeholder={messages.length ? "Keep going…" : conversation.mode === "morning" ? "How are you starting the day?" : conversation.mode === "evening" ? "How was today?" : "What’s on your mind?"}
        onSend={send} onDraft={(text) => { void P.saveDraft(client, userId, conversation.id, text).catch(() => undefined); }} />
    </div>
  </section>;
}
