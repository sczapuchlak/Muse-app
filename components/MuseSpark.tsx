"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "@/lib/motion";
import { MuseStar } from "./MuseStar";
import "./MuseSpark.css";

export function MuseSpark() {
  return <span className="muse-spark" aria-hidden="true">
    <span className="muse-spark-star"><MuseStar size={14} /></span>
    <span className="muse-spark-star"><MuseStar size={10} color="pink" /></span>
    <span className="muse-spark-star"><MuseStar size={12} color="aqua" /></span>
  </span>;
}

/** Call from a successful completion, not from render or initial checked state. */
export function useMuseSpark() {
  const [sequence, setSequence] = useState<number | null>(null);
  const next = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function trigger() {
    if (timer.current) clearTimeout(timer.current);
    setSequence(++next.current);
    timer.current = setTimeout(() => setSequence(null), motion.success);
  }
  return { trigger, spark: sequence === null ? null : <MuseSpark key={sequence} /> };
}
