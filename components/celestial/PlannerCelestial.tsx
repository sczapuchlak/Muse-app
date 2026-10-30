import { CelestialCanvas,CelestialPath,CelestialPoints,CelestialStar } from "./CelestialPrimitives";
/** A fragmented celestial map emerges at different depths, without a central emblem. */
export function PlannerCelestial() {
  return <CelestialCanvas>
    <CelestialPoints points={[[18,12],[76,155],[129,78],[206,29],[287,194],[359,18],[424,170],[508,43],[582,191],[665,19],[734,139],[786,52]]}/>
    <g className="muse-celestial-fragment-far"><CelestialPath d="m-28 103 79-52 53 30M94 87l54 24 30-35"/><CelestialPath d="m543-9 56 43 71-16 54 37" tone="purple"/></g>
    <CelestialPath d="M72 183C164 204 212 135 270 102M318 72C395 28 487 29 547 75M611 121Q709 177 822 103" faint/>
    <CelestialPath d="m247 38 47-24 61 27M294 14l-9 53"/>
    <CelestialPath d="m402 147 65-43 58 29 45-33" tone="purple"/>
    <CelestialPath d="m623 174 38 27 68-40 51 19" tone="pink"/>
    <CelestialPath d="M421 224Q495 125 655 67M706 51Q767 47 811 63" tone="purple" faint/>
    <CelestialStar x={294} y={14} size={12} delay={1}/><CelestialStar x={355} y={41} size={9} tone="purple" delay={5}/>
    <CelestialStar x={467} y={104} size={24} tone="purple" delay={8}/><CelestialStar x={570} y={100} size={9} delay={3}/>
    <CelestialStar x={661} y={201} size={15} tone="pink" delay={11}/><CelestialStar x={729} y={161} size={8} delay={6}/>
  </CelestialCanvas>;
}
