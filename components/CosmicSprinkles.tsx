import type { CSSProperties } from "react";
import "./CosmicSprinkles.css";
const pieces=[[-22,-16,-24,'capsule'],[13,-25,38,'diamond'],[28,-4,-38,'dash'],[-31,7,22,'dot'],[-7,24,45,'curve'],[24,22,-17,'capsule'],[3,-36,18,'dot'],[-25,30,70,'dash']] as const;
/** Deterministic, small candy accents. Never a falling/confetti wallpaper. */
export function CosmicSprinkles({celebration=false,variation=0}:{celebration?:boolean;variation?:number}) {
  return <span className={`muse-cosmic-sprinkles${celebration?' muse-sprinkle-celebration':''}`} aria-hidden="true">{pieces.map(([x,y,rotation,shape],index)=><i key={index} data-shape={shape} style={{'--piece-x':`${x}px`,'--piece-y':`${y}px`,'--piece-turn':`${rotation+variation*17}deg`,'--piece-color':`var(--chart-${(index+variation)%8+1})`,'--piece-delay':`${index*18}ms`} as CSSProperties}/>)}</span>;
}
