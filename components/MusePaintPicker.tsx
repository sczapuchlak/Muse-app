"use client";
import { useState } from "react";
import { MuseColorPicker } from "./MuseColorPicker";
import { MuseGradientBuilder } from "./MuseGradientBuilder";
import { accentCss, customGradientCss, isHexColor, pinAccent, type AccentColor, type CustomGradient } from "@/lib/appearance-values";
import { curatedGradients, curatedSolids, type Palette, type Paint } from "@/lib/planner-customization";
import "./MuseControls.css";

const sameGradient = (a: CustomGradient, b: CustomGradient) => JSON.stringify(a) === JSON.stringify(b);

/**
 * One picker for "a solid color or a gradient" (#87), built from Muse's existing color picker and gradient builder.
 * Theme accents come first (they follow the theme), then curated swatches and gradients, then the person's saved
 * palette. Used by Muse Marks and section backgrounds so both feel the same.
 */
export function MusePaintPicker({ label, value, onChange, palette, onSaveColor, onSaveGradient, onForget, allowDefault, defaultLabel = "Theme default", showKind = true }: {
  label: string; value?: Paint; onChange: (paint: Paint | undefined) => void; palette?: Palette;
  onSaveColor?: (color: `#${string}`) => void; onSaveGradient?: (gradient: CustomGradient) => void;
  onForget?: (item: { color: `#${string}` } | { gradient: CustomGradient }) => void;
  allowDefault?: boolean; defaultLabel?: string;
  /** Hide the Solid/Gradient switch when the host already offers one (Vision Boards paints add Pattern beside them). */
  showKind?: boolean;
}) {
  const [lastMode, setMode] = useState<"solid" | "gradient">(value?.kind ?? "solid");
  const mode = value?.kind ?? lastMode; // follows the value when it changes from outside (e.g. a collection pick)
  const [draftGradient, setDraftGradient] = useState<CustomGradient>(() => value?.kind === "gradient" ? value.gradient : { angle: 135, colors: [pinAccentSafe("primary"), pinAccentSafe("secondary")] });
  const solid: AccentColor = value?.kind === "solid" ? value.color : "primary";
  const savedColor = value?.kind === "solid" && isHexColor(value.color) && palette?.colors.includes(value.color.toLowerCase() as `#${string}`);
  const savedGradient = value?.kind === "gradient" && palette?.gradients.some((g) => sameGradient(g, value.gradient));
  const pickGradient = (g: CustomGradient) => { setDraftGradient(g); onChange({ kind: "gradient", gradient: g }); };
  return <fieldset className="muse-paint-picker">
    <legend>{label}</legend>
    {showKind && <div className="muse-chip-row" role="group" aria-label={`${label}: kind`}>
      {allowDefault && <button type="button" aria-pressed={!value} onClick={() => onChange(undefined)}>{defaultLabel}</button>}
      <button type="button" aria-pressed={!!value && mode === "solid"} onClick={() => { setMode("solid"); onChange({ kind: "solid", color: solid }); }}>Solid</button>
      <button type="button" aria-pressed={!!value && mode === "gradient"} onClick={() => { setMode("gradient"); onChange({ kind: "gradient", gradient: draftGradient }); }}>Gradient</button>
    </div>}
    {value && mode === "solid" && <>
      <MuseColorPicker label="Theme colors and your own" value={solid} onChange={(color) => onChange({ kind: "solid", color })} />
      <div className="muse-paint-swatches" role="group" aria-label="Curated colors">
        {curatedSolids.map((c) => <button key={c} type="button" className="muse-color-swatch" style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={value.kind === "solid" && value.color.toLowerCase() === c} onClick={() => onChange({ kind: "solid", color: c })} />)}
      </div>
      {!!palette?.colors.length && <div className="muse-paint-swatches" role="group" aria-label="Your saved colors"><span className="small-label">Saved</span>
        {palette.colors.map((c) => <button key={c} type="button" className="muse-color-swatch" style={{ background: c }} aria-label={`Saved color ${c}`} aria-pressed={value.kind === "solid" && value.color.toLowerCase() === c} onClick={() => onChange({ kind: "solid", color: c })} />)}
      </div>}
      {onSaveColor && value.kind === "solid" && <div className="muse-paint-actions">{savedColor
        ? <button type="button" className="text-button" onClick={() => onForget?.({ color: value.color as `#${string}` })}>Remove from saved colors</button>
        : <button type="button" className="text-button" onClick={() => onSaveColor(isHexColor(value.color) ? value.color : pinAccentSafe(value.color))}>Save to my colors</button>}</div>}
    </>}
    {value && mode === "gradient" && <>
      <div className="muse-paint-gradients" role="group" aria-label="Curated gradients">
        {curatedGradients.map((g) => <button key={g.id} type="button" className="muse-paint-gradient" style={{ background: customGradientCss(g.gradient) }} title={g.label} aria-label={g.label} aria-pressed={value.kind === "gradient" && sameGradient(value.gradient, g.gradient)} onClick={() => pickGradient(g.gradient)} />)}
      </div>
      {!!palette?.gradients.length && <div className="muse-paint-gradients" role="group" aria-label="Your saved gradients"><span className="small-label">Saved</span>
        {palette.gradients.map((g, i) => <button key={i} type="button" className="muse-paint-gradient" style={{ background: customGradientCss(g) }} aria-label={`Saved gradient ${i + 1}`} aria-pressed={value.kind === "gradient" && sameGradient(value.gradient, g)} onClick={() => pickGradient(g)} />)}
      </div>}
      <details className="muse-paint-custom"><summary>Make your own</summary>
        <MuseGradientBuilder label="Custom gradient" value={value.kind === "gradient" ? value.gradient : draftGradient} onChange={pickGradient} /></details>
      {onSaveGradient && value.kind === "gradient" && <div className="muse-paint-actions">{savedGradient
        ? <button type="button" className="text-button" onClick={() => onForget?.({ gradient: value.gradient })}>Remove from saved gradients</button>
        : <button type="button" className="text-button" onClick={() => onSaveGradient(value.gradient)}>Save to my gradients</button>}</div>}
    </>}
  </fieldset>;
}

/** pinAccent reads the live theme; on the server it can't, so fall back to Muse purple. */
function pinAccentSafe(color: AccentColor): `#${string}` { try { return pinAccent(color); } catch { return isHexColor(color) ? color : "#8050cf"; } }
export const paintSwatchStyle = (p: Paint) => ({ background: p.kind === "solid" ? accentCss(p.color) : customGradientCss(p.gradient) });
