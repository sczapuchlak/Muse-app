import {MuseStar} from './MuseStar';
import './DiscoAtmosphere.css';
/** Foil light and official stars; no literal artwork or measured header overlay. */
export function DiscoAtmosphere(){return <div className="muse-disco-environment" aria-hidden="true"><div className="muse-disco-spill"/><div className="muse-disco-caustics"/><div className="muse-disco-glitter">{Array.from({length:72},(_,i)=><span key={i} style={{left:`${(i*37+3)%100}%`,top:`${(i*23+2)%100}%`,color:`var(--chart-${i%8+1})`,animationDelay:`-${i%13}s`}}><MuseStar size={i%9===0?13:i%3===0?7:3}/></span>)}</div></div>;}
