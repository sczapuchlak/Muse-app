import { PlannerCelestial } from "./celestial/PlannerCelestial";
import { RitualsCelestial } from "./celestial/RitualsCelestial";
import { NourishCelestial } from "./celestial/NourishCelestial";
import { MoodCelestial } from "./celestial/MoodCelestial";
import "./PageCelestial.css";

export type CelestialSignature="path"|"orbit"|"garden"|"aurora";
const signatures={path:PlannerCelestial,orbit:RitualsCelestial,garden:NourishCelestial,aurora:MoodCelestial};
/** Shared primitives, bespoke compositions. Decoration never becomes a control. */
export function PageCelestial({motif="orbit"}:{motif?:CelestialSignature}) {
  const Signature=signatures[motif];
  return <div className="muse-page-celestial" data-motif={motif} aria-hidden="true"><Signature/></div>;
}
