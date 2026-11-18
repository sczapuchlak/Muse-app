"use client";
import type { ReactNode } from "react";
import { MuseMark, type MuseMarkIcon, type MuseTone } from "../design/MuseHeading";
import { MUSE_STAR_PATH } from "../MuseStar";
import type { Message, MessageImage } from "@/lib/journal/model";
import { MessagePhotos } from "./MessagePhotos";

export const timeLabel = (iso: string, timeZone: string) => { try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone }); } catch { return ""; } };

/**
 * Paragraphs survive exactly as written or dictated; blank lines become paragraph breaks. With `anchored`, each
 * paragraph records where it starts in the original text (so a selection maps back to exact positions), and `marks`
 * paints saved highlights as soft <mark>s without changing a single character.
 */
export function Prose({ text, anchored, marks }: { text: string; anchored?: boolean; marks?: { start: number; end: number; ids: string[] }[] }) {
  const paras: [number, string][] = []; const re = /\n{2,}/g; let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) { paras.push([last, text.slice(last, m.index)]); last = m.index + m[0].length; }
  paras.push([last, text.slice(last)]);
  return <>{paras.map(([start, p]) => <p key={start} data-start={anchored ? start : undefined}>{marks?.length ? paint(p, start, marks) : p}</p>)}</>;
}
function paint(p: string, at: number, marks: { start: number; end: number; ids: string[] }[]) {
  const out: ReactNode[] = []; let i = 0;
  for (const mk of marks) {
    const s = Math.max(mk.start - at, 0), e = Math.min(mk.end - at, p.length);
    if (e <= 0 || s >= p.length || e <= s) continue;
    if (s > i) out.push(p.slice(i, s));
    out.push(<mark key={`${mk.ids[0]}-${at}`} className="mj-hl" data-hl={mk.ids.join(" ")} id={mk.start >= at && mk.start - at === s ? `hl-${mk.ids[0]}` : undefined}>{p.slice(s, e)}</mark>);
    i = e;
  }
  if (i < p.length) out.push(p.slice(i));
  return out;
}

export type ThreadMessage = Pick<Message, "id" | "role" | "body" | "createdAt" | "correctedAt"> & { companionVersionId?: string | null; pending?: boolean; streaming?: boolean; failed?: boolean; marked?: boolean; images?: MessageImage[]; previews?: string[] };

/**
 * The conversation as an editorial dialogue, not chat bubbles. Your words sit on a softly inked page edge in the
 * interface face; the companion answers in the reading face beside its small mark. Both use the full reading column,
 * so long dictated passages read comfortably. Bookmarked messages carry a fine accent.
 */
export function Thread({ messages, companion, companionFor, timeZone, actions, empty, onReattach, highlights }: {
  messages: ThreadMessage[]; companion: { name: string; icon: string; tone: MuseTone } | null; timeZone: string;
  /** Who wrote this reply (a conversation may switch companions); defaults to `companion`. */
  companionFor?: (m: ThreadMessage) => { name: string; icon: string; tone: MuseTone };
  actions?: (m: ThreadMessage) => ReactNode; empty?: ReactNode;
  /** In an open conversation: attach an earlier photo to the next message. */
  onReattach?: (img: MessageImage) => void;
  /** Saved highlights per message id (already placed and merged); bodies render with exact positions when given. */
  highlights?: Map<string, { start: number; end: number; ids: string[] }[]>;
}) {
  if (!messages.length) return <>{empty}</>;
  return <ol className="mj-thread" aria-label="Conversation">
    {messages.map((m) => { const who = m.role === "assistant" ? companionFor?.(m) ?? companion : null; return <li key={m.id} id={`m-${m.id}`} data-message-id={m.id} className="mj-message" style={who ? ({ "--who-ink": `var(--chart-${who.tone})` } as React.CSSProperties) : undefined} data-role={m.role} data-pending={m.pending || undefined} data-streaming={m.streaming || undefined} data-failed={m.failed || undefined} data-marked={m.marked || undefined}>
      <div className="mj-message-who type-meta">
        {m.role === "assistant" ? <><MuseMark icon={(who?.icon ?? "sparkle") as MuseMarkIcon} tone={who?.tone ?? 5} size="sm" /><span>{who?.name ?? "Companion"}</span></> : <span>You</span>}
        <time dateTime={m.createdAt}>{m.pending ? "Saving…" : m.failed ? "Not saved" : timeLabel(m.createdAt, timeZone)}</time>
        {m.correctedAt && <span title="You corrected this message; the original is kept.">· corrected</span>}
        {actions && <span className="mj-message-actions">{actions(m)}</span>}
      </div>
      <div className={`mj-message-body ${m.role === "assistant" ? "type-reading" : "type-body"}`}><Prose text={m.body} anchored={Boolean(highlights)} marks={highlights?.get(m.id)} />{m.streaming && <span className="mj-caret" aria-hidden="true" />}</div>
      {m.role === "user" && <MessagePhotos images={m.images} previews={m.previews} onReattach={onReattach} />}
    </li>; })}
  </ol>;
}

/** Three small Muse stars that light in turn while the companion is thinking. */
export function Thinking({ name }: { name: string }) {
  return <div className="mj-thinking" role="status">
    <svg viewBox="0 0 64 24" aria-hidden="true"><line x1="10" y1="16" x2="32" y2="7" /><line x1="32" y1="7" x2="54" y2="14" />
      {[[10, 16, 0.32], [32, 7, 0.4], [54, 14, 0.28]].map(([x, y, s], i) => <path key={i} d={MUSE_STAR_PATH} transform={`translate(${x - 12 * s} ${y - 20 * s}) scale(${s})`} style={{ animationDelay: `${i * 0.22}s` }} />)}
    </svg>
    <em>{name} is thinking…</em>
  </div>;
}
