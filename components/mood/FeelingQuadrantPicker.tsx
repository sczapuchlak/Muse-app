"use client";
import { useId } from "react";
import { moodQuadrants, type EmotionQuadrant } from "@/lib/models";
import { quadrantFor, traitsOf } from "@/lib/feelings";

/**
 * "How does it feel to you?" as the Mood Meter itself: pleasantness across, energy up and down, in the meter's own
 * four colors. A single control that answers both questions (a radio group, arrow keys move between the four).
 */
const cells: { pleasant: boolean; high: boolean }[] = [{ pleasant: false, high: true }, { pleasant: true, high: true }, { pleasant: false, high: false }, { pleasant: true, high: false }];
export function FeelingQuadrantPicker({ value, onChange, label = "How does it feel to you?" }: { value: EmotionQuadrant | null; onChange: (q: EmotionQuadrant) => void; label?: string }) {
  const id = useId();
  const active = value ? traitsOf(value) : null;
  return <div className="muse-feeling-quadrants">
    <p className="editor-label" id={`${id}-label`}>{label}</p>
      <div className="muse-feeling-quadrant-grid" role="radiogroup" aria-labelledby={`${id}-label`}
        onKeyDown={(e) => { const keys: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }; const d = keys[e.key]; if (!d) return; e.preventDefault();
          const t = active ?? { pleasant: false, highEnergy: false }, col = (t.pleasant ? 1 : 0) + d[1], row = (t.highEnergy ? 0 : 1) + d[0];
          if (col < 0 || col > 1 || row < 0 || row > 1) return; onChange(quadrantFor(col === 1, row === 0)); }}>
        {cells.map(({ pleasant, high }) => { const q = quadrantFor(pleasant, high), on = value === q, meta = moodQuadrants[q];
          return <button key={q} type="button" role="radio" aria-checked={on} tabIndex={on || (!value && q === "red") ? 0 : -1} data-quadrant={q} data-on={on || undefined} onClick={() => onChange(q)}
            aria-label={`${meta.energy === "high" ? "High" : "Low"} energy, ${meta.pleasantness}`}>
            <i className="quadrant-dot" aria-hidden="true" /><strong>{meta.pleasantness === "pleasant" ? "Pleasant" : "Unpleasant"}</strong><small>{meta.energy === "high" ? "High energy" : "Low energy"}</small>
          </button>; })}
      </div>
  </div>;
}
