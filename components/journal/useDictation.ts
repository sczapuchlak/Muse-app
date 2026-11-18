"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Voice typing through the browser's own speech recognition (Safari and Chrome's built-in dictation: free, no
 * Muse AI request, no audio stored by Muse). `start(base, caret)` remembers the text around the caret; every result
 * rebuilds `before + spoken + after`, so interim words appear live and are replaced, never duplicated, as the
 * recognizer settles. Unsupported browsers simply get no button.
 */
type Alternative = { transcript: string };
type Result = { isFinal: boolean; length: number; [i: number]: Alternative };
type ResultEvent = { resultIndex: number; results: { length: number; [i: number]: Result } };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: ResultEvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
const noop = () => () => {};

export function dictationError(code: string) {
  if (code === "not-allowed") return "Microphone access is off for Muse. Allow it in your browser or phone settings.";
  if (code === "service-not-allowed") return "Voice typing isn’t available here. The keyboard’s microphone still works.";
  if (code === "audio-capture") return "No microphone found.";
  if (code === "network") return "Voice typing needs a connection.";
  return "Voice typing stopped. Tap the mic to try again.";
}

export function useDictation(onText: (text: string) => void) {
  const supported = useSyncExternalStore(noop, () => !!ctor(), () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => { onTextRef.current = onText; }, [onText]);

  const stop = useCallback(() => { rec.current?.stop(); }, []);
  /** Stop at once and ignore anything still in flight: the words already shown stay; nothing arrives later. */
  const cancel = useCallback(() => {
    const r = rec.current; if (!r) return;
    r.onresult = null; r.onerror = null; r.onend = null; rec.current = null; setListening(false); r.abort();
  }, []);
  const start = useCallback((base: string, caret: number) => {
    const Ctor = ctor();
    if (!Ctor || rec.current) return;
    const before = base.slice(0, caret), after = base.slice(caret);
    const lead = before && !/\s$/.test(before) ? " " : "", trail = after && !/^\s/.test(after) ? " " : "";
    const r = new Ctor();
    r.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
    r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      let spoken = "";
      for (let i = 0; i < e.results.length; i++) spoken += e.results[i][0]?.transcript ?? "";
      spoken = spoken.replace(/\s+/g, " ").trim();
      if (spoken) onTextRef.current(before + lead + spoken + trail + after);
    };
    r.onerror = (e) => { if (e.error !== "aborted" && e.error !== "no-speech") setError(dictationError(e.error)); };
    r.onend = () => { if (rec.current === r) { rec.current = null; setListening(false); } };
    rec.current = r; setError(""); setListening(true);
    try { r.start(); } catch { rec.current = null; setListening(false); setError(dictationError("")); }
  }, []);
  useEffect(() => () => { rec.current?.abort(); rec.current = null; }, []);
  return { supported, listening, error, start, stop, cancel };
}
