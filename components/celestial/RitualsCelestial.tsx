import { CelestialCanvas,CelestialPath,CelestialPoints,CelestialStar } from "./CelestialPrimitives";
/** Partial cycles continue beyond the hero; no closed central atom/orbit icon. */
export function RitualsCelestial() {
  return <CelestialCanvas>
    <CelestialPoints points={[[45,47],[108,186],[189,29],[277,151],[356,9],[411,202],[513,31],[598,198],[683,65],[768,179]]}/>
    <CelestialPath d="M-43 165C-21 44 161-15 312 43M350 62Q392 89 414 126"/>
    <CelestialPath d="M195 224C301 98 482 83 575 126M616 155Q668 214 634 250" tone="purple"/>
    <CelestialPath d="M430-35C518 56 662 101 823 45" tone="pink"/>
    <CelestialPath d="M512-12Q459 46 495 105M526 142Q581 181 725 148" tone="purple" faint/>
    <circle className="muse-celestial-phase star-aqua" cx="245" cy="26" r="4"/><circle className="muse-celestial-phase star-pink" cx="617" cy="73" r="2"/>
    <CelestialStar x={186} y={5} size={9} delay={2}/><CelestialStar x={358} y={111} size={20} tone="purple" delay={7}/>
    <CelestialStar x={555} y={119} size={12} delay={11}/><CelestialStar x={702} y={153} size={9} tone="pink" delay={4}/>
  </CelestialCanvas>;
}
