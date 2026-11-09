"use client";
import { useEffect, useSyncExternalStore } from "react";
import { mobileDensities, readMobileDensity, selectMobileDensity, serverMobileDensity, subscribeMobileDensity } from "@/lib/mobile-density";

/** Mirrors the phone density choice onto <html data-mobile-density>; the CSS only acts at phone widths. */
export function MobileDensityBridge() {
  const density = useSyncExternalStore(subscribeMobileDensity, readMobileDensity, serverMobileDensity);
  useEffect(() => { document.documentElement.dataset.mobileDensity = density; }, [density]);
  return null;
}

export function MobileDensitySettings() {
  const density = useSyncExternalStore(subscribeMobileDensity, readMobileDensity, serverMobileDensity);
  return <section className="muse-appearance-material" aria-labelledby="muse-mobile-density-title">
    <h2 className="editor-label" id="muse-mobile-density-title">Phone layout</h2>
    <p>How much fits on your phone screen?</p>
    <div role="group" aria-label="Phone layout density">{mobileDensities.map((value) => <button className="choice-button" key={value} type="button" aria-pressed={value === density} onClick={() => selectMobileDensity(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
    <p className="small-label">{density === "compact" ? "Compact tightens spacing and cards so more fits on screen. Buttons stay easy to tap." : "Comfortable gives everything room to breathe."} Only phone-size screens change; this device remembers it.</p>
  </section>;
}
