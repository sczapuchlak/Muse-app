import { constellationMotifs } from "@/lib/constellations";
import { MuseStar } from "./MuseStar";
import type { CSSProperties } from "react";
import "./ProfileConstellation.css";

/** Optional profile-driven ornament; absent/unsupported signs simply omit it. */
export function ProfileConstellation({ zodiacSign, intensity = "subtle" }: { zodiacSign?: string; intensity?: "subtle" | "luminous" }) {
  const motif = zodiacSign ? constellationMotifs[zodiacSign.toLowerCase()] : undefined;
  if (!motif) return null;
  return <div className="muse-profile-constellation" data-intensity={intensity} aria-hidden="true">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">{motif.edges.map(([from, to]) => <line key={`${from}-${to}`} x1={motif.nodes[from].x} y1={motif.nodes[from].y} x2={motif.nodes[to].x} y2={motif.nodes[to].y} />)}</svg>
    {motif.nodes.map((node, index) => <span key={index} className="muse-constellation-node" style={{ left: `${node.x}%`, top: `${node.y}%`, "--glint-delay": `${index * 2}s`, "--node-brightness": .6 + (index % 3) * .12 } as CSSProperties}><MuseStar size={node.size} color={node.color} /></span>)}
  </div>;
}
