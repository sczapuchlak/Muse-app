import { MuseStar } from './MuseStar';
import './MuseStarCluster.css';
/** The signature flourish always uses the same official four-point family. */
export function MuseStarCluster({compact=false}:{compact?:boolean}){return <span className={`muse-star-cluster${compact?' muse-star-cluster-compact':''}`} aria-hidden="true"><MuseStar prismatic size={compact?17:24} color="aqua"/><MuseStar prismatic size={compact?31:42}/><MuseStar prismatic size={compact?13:19} color="pink"/></span>;}
