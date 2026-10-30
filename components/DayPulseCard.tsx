"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { DayPulseCheckIn, PulseSignal } from "@/lib/models";
import { pulseLine, pulseSignals, updatePulse } from "@/lib/pulse";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseStar } from "./MuseStar";
import { useMuseSpark } from "./MuseSpark";
import { useMuseState } from "./MuseSession";
import "./DayPulseCard.css";

type SignalProps = { signal: typeof pulseSignals[number]; value: number | null; onChange: (value: number) => void };

export function PulseControl({ signal, value, onChange }: SignalProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { spark, trigger } = useMuseSpark();
  const shown = preview ?? value;
  function select(next: number) {
    if (value === null) trigger();
    onChange(next);
  }
  return <fieldset className="muse-pulse-signal" data-signal={signal.id}>
    <legend><span>{signal.label}</span><output aria-live="polite">{shown === null ? "Optional" : `${shown} / 10`}{preview !== null && <span className="muse-pulse-preview"> preview</span>}</output></legend>
    <div className="muse-pulse-track" ref={trackRef} onPointerLeave={() => setPreview(null)} onKeyDown={(event) => {
      if (event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const next = event.key === "Home" ? 1 : 10;
      select(next);
      trackRef.current?.querySelector<HTMLInputElement>(`input[value="${next}"]`)?.focus();
    }}>
      {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => <label key={number} className="muse-pulse-segment"
        data-filled={shown !== null && number <= shown} data-point={shown === number} onPointerEnter={(event) => { if (event.pointerType === "mouse") setPreview(number); }}
        style={{ "--pulse-position": `${(number - 1) / 9 * 100}%` } as CSSProperties}>
        <input type="radio" name={`pulse-${signal.id}`} value={number} checked={value === number} aria-label={`${signal.label}: ${number} out of 10`} onClick={() => setPreview(null)} onChange={() => { setPreview(null); select(number); }} />
        <span className="muse-pulse-piece" aria-hidden="true" />
        {shown === number && <MuseStar key={value ?? "preview"} size={16} className="muse-pulse-point" />}
        {value === number && spark}
      </label>)}
    </div>
    <div className="muse-pulse-endpoints" aria-hidden="true"><span>{signal.low}</span><span>{signal.high}</span></div>
  </fieldset>;
}

export function DayPulseCard({ initialCheckIn }: { initialCheckIn: DayPulseCheckIn }) {
  const [checkIn, setCheckIn] = useMuseState("day-pulse", initialCheckIn);
  const hasValues = pulseSignals.some((signal) => checkIn[signal.id] !== null);
  function change(signal: PulseSignal, value: number) {
    const now = new Date().toISOString();
    setCheckIn((current) => updatePulse(current, signal, value, now));
  }
  return <MuseCard id="day-pulse" className="day-pulse-card">
    <CardHeading id="day-pulse" title="Day Pulse" icon="insights"><button type="button" className="text-button" disabled={!hasValues} aria-label="Reset all Day Pulse values" onClick={() => setCheckIn((current) => ({ ...current, energy: null, stress: null, overallDay: null, updatedAt: new Date().toISOString() }))}>Reset</button></CardHeading>
    <p className="muse-pulse-copy">{pulseLine(checkIn.date)}</p>
    <div className="muse-pulse-signals">{pulseSignals.map((signal) => <PulseControl key={signal.id} signal={signal} value={checkIn[signal.id]} onChange={(value) => change(signal.id, value)} />)}</div>
  </MuseCard>;
}
