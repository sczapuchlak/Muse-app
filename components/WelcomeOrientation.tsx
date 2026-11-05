"use client";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {MuseCard} from "./MuseCard";
import {CardHeading} from "./CardHeading";
import "./WelcomeOrientation.css";

const places=[["Planner","/planner","Tasks, plans and your days ahead."],["Rituals","/rituals","Small rhythms you want to keep."],["Whimsy","/whimsy/observatory","Astrology, Tarot, Dreams and a little fun."],["Settings","/settings","Your name, timezone and account."]] as const;

/** Shown once, right after onboarding (`/?welcome=1`). Dismissing removes it; nothing is stored. */
export function WelcomeOrientation(){
 const query=useSearchParams(),router=useRouter();
 if(query.get("welcome")!=="1")return null;
 const dismiss=()=>router.replace("/",{scroll:false});
 return <MuseCard id="welcome-orientation" className="muse-welcome-orientation"><CardHeading id="welcome-orientation" title="Your universe at a glance" icon="sparkle"><button type="button" className="text-button" onClick={dismiss}>Got it</button></CardHeading>
  <p className="card-description">This is the Daily Edit, your home for today. A few other places you’ll want to know:</p>
  <ul>{places.map(([name,href,about])=><li key={href}><Link href={href}>{name}</Link><span className="small-label">{about}</span></li>)}</ul>
 </MuseCard>;
}
