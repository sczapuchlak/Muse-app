"use client";
import type { ReactNode } from "react";
import { MuseMark, type MuseMarkIcon, type MuseTone } from "../design/MuseHeading";
import type { Message } from "@/lib/journal/model";

export const timeLabel = (iso: string, timeZone: string) => { try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone }); } catch { return ""; } };

/** Paragraphs survive exactly as written or dictated; blank lines become paragraph breaks. */
export function Prose({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/);
  return <>{paras.map((p, i) => <p key={i}>{p}</p>)}</>;
}

export type ThreadMessage = Pick<Message, "id" | "role" | "body" | "createdAt" | "correctedAt"> & { pending?: boolean; streaming?: boolean; failed?: boolean };

/**
 * The conversation as a reading column, not chat bubbles: your words on a paper card in your own ink, the companion's
 * replies on glass beside its mark. Both run the full column width, so long dictated entries read comfortably.
 */
export function Thread({ messages, companion, timeZone, actions, empty }: {
  messages: ThreadMessage[]; companion: { name: string; icon: string; tone: MuseTone } | null; timeZone: string;
  actions?: (m: ThreadMessage) => ReactNode; empty?: ReactNode;
}) {
  if (!messages.length) return <>{empty}</>;
  return <ol className="mj-thread" aria-label="Conversation">
    {messages.map((m) => <li key={m.id} className="mj-message" data-role={m.role} data-pending={m.pending || undefined} data-streaming={m.streaming || undefined} data-failed={m.failed || undefined}>
      {m.role === "assistant" && <div className="mj-message-who">
        <MuseMark icon={(companion?.icon ?? "sparkle") as MuseMarkIcon} tone={companion?.tone ?? 5} size="sm" />
        <span>{companion?.name ?? "Companion"}</span>
      </div>}
      <div className="mj-message-body"><Prose text={m.body} />{m.streaming && <span className="mj-caret" aria-hidden="true" />}</div>
      <div className="mj-message-meta">
        <time dateTime={m.createdAt}>{m.pending ? "Saving…" : m.failed ? "Not saved" : timeLabel(m.createdAt, timeZone)}</time>
        {m.correctedAt && <span title="You corrected this message; the original is kept.">· corrected</span>}
        {actions?.(m)}
      </div>
    </li>)}
  </ol>;
}

/** A gentle three-dot "thinking" line while the reply hasn't started yet. */
export function Thinking({ name }: { name: string }) {
  return <div className="mj-thinking" role="status"><span /><span /><span /><em>{name} is thinking</em></div>;
}
