"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MuseIcon } from "../MuseIcon";
import { wordCount } from "@/lib/journal/model";
import { useDictation } from "./useDictation";

const draftKey = (key: string) => `muse.journal.draft.${key}`;
export function readLocalDraft(key: string) { try { return localStorage.getItem(draftKey(key)) ?? ""; } catch { return ""; } }
export function clearLocalDraft(key: string) { try { localStorage.removeItem(draftKey(key)); } catch { /* storage unavailable */ } }

/**
 * The journal composer (Journal V1 §11): a spacious, auto-growing field that works with the iPhone keyboard's
 * dictation (and has its own mic button using the browser's voice typing), keeps every keystroke on the device at once (so switching apps never loses words), and — when given
 * `onDraft` — saves a server draft after a pause and whenever the page is hidden. Enter sends on a desktop keyboard;
 * on a phone Enter is a new line and the Send button sends. Text clears only after the message is saved.
 */
export function Composer({ storageKey, initial = "", placeholder, disabled, busy, onSend, onDraft, label = "Write or dictate", sendLabel = "Send", hint, secondary, dock }: {
  storageKey: string; initial?: string; placeholder: string; disabled?: boolean; busy?: boolean; label?: string; sendLabel?: string; hint?: string;
  onSend: (text: string) => Promise<boolean>; onDraft?: (text: string) => void;
  /** A second action paired with Send as two equal buttons (the workspace's "Finish entry" beside "Go deeper"). */
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
  /** Where the mic, status and buttons sit (the bottom of the workspace). The words themselves stay in the page, right
   *  after the conversation, so nothing walls off the bottom of the screen. */
  dock: HTMLElement | null;
}) {
  const [text, setText] = useState(() => readLocalDraft(storageKey) || initial);
  const ref = useRef<HTMLTextAreaElement>(null), timer = useRef<number | undefined>(undefined), latest = useRef(text), sentDraft = useRef(initial);

  // A different conversation (or a draft recovered from the server) loads its own words.
  const [prevKey, setPrevKey] = useState(storageKey);
  if (prevKey !== storageKey) { const next = readLocalDraft(storageKey) || initial; setPrevKey(storageKey); setText(next); }
  useEffect(() => { latest.current = text; }, [text]);

  const grow = useCallback(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.5))}px`; }, []);
  useLayoutEffect(grow, [text, grow]);

  // The latest draft callback, kept in a ref so saving on leave never re-runs just because a parent re-rendered.
  const onDraftRef = useRef(onDraft);
  useEffect(() => { onDraftRef.current = onDraft; }, [onDraft]);
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const save = onDraftRef.current;
    if (save && latest.current !== sentDraft.current) { sentDraft.current = latest.current; save(latest.current); }
  }, []);
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
  const voice = useDictation(change);
  function toggleVoice() {
    if (voice.listening) { voice.stop(); return; }
    const el = ref.current;
    voice.start(latest.current, el ? el.selectionEnd ?? latest.current.length : latest.current.length);
  }
  async function send() {
    const body = text.trim();
    if (!body || disabled || busy) return;
    voice.cancel(); // nothing late from the recognizer may land in the cleared box
    window.clearTimeout(timer.current);
    sentDraft.current = latest.current; // a send is not a draft: nothing to save on leave for these words
    if (await onSend(body)) { setText(""); latest.current = ""; sentDraft.current = ""; clearLocalDraft(storageKey); ref.current?.focus(); }
  }
  const desktop = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const words = wordCount(text);
  const status = voice.listening ? "Listening… tap the mic again to stop." : voice.error ? voice.error : words ? `${words} ${words === 1 ? "word" : "words"} · saved on this device` : hint ?? (voice.supported ? "Type, or tap the mic to speak." : "Type, or tap the keyboard’s microphone to dictate.");
  const formId = `mj-composer-${storageKey}-form`;
  return <>
    <form id={formId} className="mj-composer" data-listening={voice.listening || undefined} onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <label className="sr-only" htmlFor={`mj-composer-${storageKey}`}>{label}</label>
      <textarea ref={ref} id={`mj-composer-${storageKey}`} value={text} rows={2} placeholder={placeholder} disabled={disabled} enterKeyHint="enter" autoCapitalize="sentences" autoCorrect="on" spellCheck
        onChange={(e) => { voice.cancel(); change(e.target.value); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && desktop()) { e.preventDefault(); void send(); } }} />
    </form>
    {dock && createPortal(<div className="mj-composer-dock" data-paired={secondary ? true : undefined}>
      <div className="mj-composer-tools" data-voice={voice.supported || undefined}>
        {voice.supported && <button type="button" className="mj-mic" data-listening={voice.listening || undefined} aria-pressed={voice.listening} disabled={disabled}
          aria-label={voice.listening ? "Stop voice typing" : "Voice typing"} title={voice.listening ? "Stop voice typing" : "Tap to speak"}
          onPointerDown={(e) => e.preventDefault() /* keep the caret where it is */} onClick={toggleVoice}><MuseIcon name="mic" size={18} /></button>}
        <small className="mj-composer-hint" aria-live="polite" data-alert={voice.error ? true : undefined} data-live={voice.listening || voice.error ? true : undefined}>{status}</small>
      </div>
      <div className="mj-composer-bar">
        {secondary && <button type="button" className="muse-button mj-composer-secondary" disabled={secondary.disabled} onClick={() => { voice.cancel(); secondary.onClick(); }}>{secondary.label}</button>}
        <button type="submit" form={formId} className="muse-button button-primary mj-send" disabled={disabled || busy || !text.trim()}>{busy ? "Sending…" : sendLabel}<MuseIcon name="arrow" size={16} /></button>
      </div>
    </div>, dock)}
  </>;
}
