import { useId, type ReactNode, type CSSProperties } from "react";
import "./MuseProgressRing.css";

/** A compact quantity indicator; the parent control supplies its accessible name. */
export function MuseProgressRing({ value, goal, children, size = 44 }: { value: number; goal: number; children: ReactNode; size?: number }) {
  const id = useId();
  const progress = Number.isFinite(value) && goal > 0 ? Math.min(1, Math.max(0, value / goal)) : 0;
  return <span className="muse-progress-ring" style={{ "--ring-size": `${size}px`, "--ring-offset": 119.38 * (1 - progress) } as CSSProperties} data-progress={progress}>
    <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="var(--ritual-gradient-start, var(--progress-start))" /><stop offset="100%" stopColor="var(--ritual-gradient-end, var(--progress-end))" /></linearGradient></defs><circle className="muse-ring-track" cx="22" cy="22" r="19" /><circle className="muse-ring-progress" cx="22" cy="22" r="19" stroke={`url(#${id})`} /></svg><span className="muse-ring-value">{children}</span>
  </span>;
}
