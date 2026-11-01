import type {CSSProperties} from 'react';
import {MuseStar} from '../MuseStar';
import './LoginAtmosphere.css';

/** Login-only stars and light. No shared Disco artwork or confetti is mounted. */
export function LoginAtmosphere({neon}:{neon:boolean}){
  return <div className="muse-atmosphere muse-login-atmosphere" data-neon={neon} aria-hidden="true">
    <div className="muse-login-starfield">{Array.from({length:84},(_,index)=>{
      const x=(index*37+3)%100,y=(index*29+7)%100;
      return <span key={index} className={index%7===0?'muse-login-sparkle':'muse-login-stardot'} style={{left:`${x}%`,top:`${y}%`,'--login-star-color':`var(--star-${index%3+1})`,'--login-star-opacity':.2+(index%4)*.12} as CSSProperties}>
        {index%7===0&&<MuseStar size={index%21===0?10:5} color={index%3===0?'aqua':index%3===1?'pink':'purple'}/>}
      </span>;
    })}</div>
  </div>;
}
