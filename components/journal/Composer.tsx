"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MuseIcon } from "../MuseIcon";
import { wordCount } from "@/lib/journal/model";

const draftKey = (key: string) => `muse.journal.draft.${key}`;
export function readLocalDraft(key: string) { try { return localStorage.getItem(draftKey(key)) ?? ""; } catch { return ""; } }
export function clearLocalDraft(key: string) { try { localStorage.removeItem(draftKey(key)); } catch { /* storage unavailable */ } }

/**
 * The journal composer (Journal V1 §11): a spacious, auto-growing field that works with the iPhone keyboard's
 * dictation, keeps every keystroke on the device at once (so switching apps never loses words), and — when given
 * `onDraft` — saves a server draft after a pause and whenever the page is hidden. Enter sends on a desktop keyboard;
 * on a phone Enter is a new line and the Send button sends. Text clears only after the message is saved.
 */
export function Composer({ storageKey, initial = "", placeholder, disabled, busy, onSend, onDraft, label = "Write or dictate", sendLabel = "Send", hint }: {
  storageKey: string; initial?: string; placeholder: string; disabled?: boolean; busy?: boolean; label?: string; sendLabel?: string; hint?: string;
  onSend: (text: string) => Promise<boolean>; onDraft?: (text: string) => void;
}) {
  const [text, setText] = useState(() => readLocalDraft(storageKey) || initial);
  const ref = useRef<HTMLTextAreaElement>(null), timer = useRef<number | undefined>(undefined), latest = useRef(text), sentDraft = useRef(initial);

  // A different conversation (or a draft recovered from the server) loads its own words.
  const [prevKey, setPrevKey] = useState(storageKey);
  if (prevKey !== storageKey) { const next = readLocalDraft(storageKey) || initial; setPrevKey(storageKey); setText(next); }
  useEffect(() => { latest.current = text; }, [text]);

  const grow = useCallback(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.5))}px`; }, []);
  useLayoutEffect(grow, [text, grow]);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (onDraft && latest.current !== sentDraft.current) { sentDraft.current = latest.current; onDraft(latest.current); }
  }, [onDraft]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", flush); flush(); };
  }, [flush]);

  function change(value: string) {
    setText(value); latest.current = value;
    try { if (value) localStorage.setItem(draftKey(storageKey), value); else localStorage.removeItem(draftKey(storageKey)); } catch { /* private mode: the server draft still helps */ }
    if (onDraft) { window.clearTimeout(timer.current); timer.current = window.setTimeout(flush, 1500); }
  }
  async function send() {
    const body = text.trim();
    if (!body || disabled || busy) return;
    window.clearTimeout(timer.current);
    if (await onSend(body)) { setText(""); latest.current = ""; sentDraft.current = ""; clearLocalDraft(storageKey); ref.current?.focus(); }
  }
  const desktop = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const words = wordCount(text);
  return <form className="mj-composer" onSubmit={(e) => { e.preventDefault(); void send(); }}>
    <label className="sr-only" htmlFor={`mj-composer-${storageKey}`}>{label}</label>
    <textarea ref={ref} id={`mj-composer-${storageKey}`} value={text} rows={3} placeholder={placeholder} disabled={disabled} enterKeyHint="enter" autoCapitalize="sentences" autoCorrect="on" spellCheck
      onChange={(e) => change(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && desktop()) { e.preventDefault(); void send(); } }} />
    <div className="mj-composer-bar">
      <small className="mj-composer-hint" aria-live="polite">{words ? `${words} ${words === 1 ? "word" : "words"} · saved on this device` : hint ?? "Type, or tap the keyboard’s microphone to dictate."}</small>
      <button type="submit" className="muse-button button-primary mj-send" disabled={disabled || busy || !text.trim()}>{busy ? "Sending…" : sendLabel}<MuseIcon name="arrow" size={16} /></button>
    </div>
  </form>;
}
