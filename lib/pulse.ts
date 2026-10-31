import type { DayPulseCheckIn, PulseSignal } from "./models";

export const pulseSignals: { id: PulseSignal; label: string; low: string; high: string }[] = [
  { id: "energy", label: "Energy", low: "running low", high: "electric" },
  { id: "stress", label: "Stress", low: "soft", high: "a lot" },
  { id: "overallDay", label: "Overall Day", low: "rough one", high: "lovely" },
];
export const pulseDescription = "The numbers behind your day.";
export const pulseCopy = [pulseDescription];

export function emptyDayPulse(date: string): DayPulseCheckIn {
  return { id: `pulse-${date}`, date, updatedAt: null, energy: null, stress: null, overallDay: null };
}

export function updatePulse(record: DayPulseCheckIn, signal: PulseSignal, value: number | null, updatedAt: string): DayPulseCheckIn {
  if (value !== null && (!Number.isInteger(value) || value < 1 || value > 10)) throw new RangeError("Pulse values must be whole numbers from 1 to 10.");
  return { ...record, [signal]: value, updatedAt };
}

export function pulseLine(date: string): string {
  const day = Math.floor(new Date(`${date}T12:00:00Z`).getTime() / 86_400_000);
  return pulseCopy[((day % pulseCopy.length) + pulseCopy.length) % pulseCopy.length];
}
