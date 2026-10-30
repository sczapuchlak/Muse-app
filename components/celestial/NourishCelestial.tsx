import { CelestialCanvas,CelestialPath,CelestialPoints,CelestialStar } from "./CelestialPrimitives";
/** Dissolved botanical fragments and luminous seeds, rather than one leaf emblem. */
export function NourishCelestial() {
  return <CelestialCanvas>
    <CelestialPoints points={[[45,31],[126,171],[213,19],[286,156],[381,36],[468,191],[561,14],[654,162],[758,48]]}/>
    <g className="muse-celestial-fragment-far"><CelestialPath d="M-21 178Q89 127 137 45M89 100Q58 76 69 58 95 56 89 100"/><CelestialPath d="M700-22Q727 53 809 80" tone="pink"/></g>
    <CelestialPath d="M179 215Q283 161 342 62M362 34Q370 13 372-9"/>
    <CelestialPath d="M291 143Q247 90 270 84 295 94 291 143M332 78Q333 32 365 29 365 61 332 78" tone="purple"/>
    <CelestialPath d="M464 184Q524 117 625 145M668 156Q738 178 802 129" tone="pink"/>
    <CelestialPath d="M543 137Q540 87 576 86 578 117 543 137M617 144Q640 194 659 173 654 151 617 144" tone="pink" faint/>
    <CelestialPath d="M418-16Q459 58 537 63M589 58Q640 28 706 44" tone="purple" faint/>
    <path className="muse-celestial-crescent star-pink" d="M694 31a14 14 0 1 0 14 18 11 11 0 0 1-14-18Z"/>
    <CelestialStar x={291} y={143} size={10} delay={1}/><CelestialStar x={365} y={29} size={16} tone="purple" delay={6}/>
    <CelestialStar x={543} y={137} size={20} tone="pink" delay={10}/><CelestialStar x={659} y={173} size={9} delay={3}/>
  </CelestialCanvas>;
}
