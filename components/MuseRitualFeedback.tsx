"use client";
import { useEffect, useRef, useState } from "react";
import {allowsMagic} from "@/lib/magic-preference";
import { motion } from "@/lib/motion";
import { MuseStar } from "./MuseStar";
import "./MuseRitualFeedback.css";

export function OrbitalGlint() {
  return <span className="muse-orbital-glint" aria-hidden="true"><svg viewBox="0 0 64 64" className="muse-orbit-arc"><circle cx="32" cy="32" r="24" /></svg><MuseStar size={18} color="aqua" /></span>;
}
export function ConstellationCelebration() {
  return <span className="muse-constellation-celebration" aria-hidden="true"><svg viewBox="0 0 100 80" className="muse-celebration-lines"><path d="m12 44 28-28" /><path d="m40 16 24 42" /><path d="m64 58 24-28" /></svg><span><MuseStar size={13} color="aqua" /></span><span><MuseStar size={19} /></span><span><MuseStar size={12} color="pink" /></span><span><MuseStar size={16} color="aqua" /></span></span>;
}
/** Local, short-lived feedback. No animation on initial/saved state. */
export function useRitualFeedback() {
  const [effect, setEffect] = useState<{ kind: "orbital" | "constellation"; key: number } | null>(null);
  const sequence = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function trigger(kind: "orbital" | "constellation") {
    if(!allowsMagic())return;
    if (timer.current) clearTimeout(timer.current);
    setEffect({ kind, key: ++sequence.current });
    timer.current = setTimeout(() => setEffect(null), kind === "orbital" ? motion.orbital : motion.celebration);
  }
  return { trigger, effect: !effect ? null : effect.kind === "orbital" ? <OrbitalGlint key={effect.key} /> : <ConstellationCelebration key={effect.key} /> };
}
