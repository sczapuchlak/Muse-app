import Link from "next/link";
import type {ReactNode} from "react";
import {museBrand} from "@/lib/brand";
import {MuseStar} from "../MuseStar";
import {MuseStarCluster} from "../MuseStarCluster";
import "../LoginPreview.css";
/** The approved standalone identity and glass layout, shared by live sign-in and its preview. */
export function MuseLoginFrame({children}:{children:ReactNode}){
  return <main className="muse-login-preview"><section className="muse-login-story"><Link href="/" className="muse-login-logo" aria-label="Muse home">muse<MuseStar size={32}/></Link><MuseStarCluster/><h1 className="whimsy">{museBrand.mantra}</h1><p>{museBrand.support}</p><p className="muse-login-invitation">You are the muse. You are the artist. Your life is the masterpiece.</p></section><section className="muse-login-glass" aria-labelledby="login-preview-title">{children}</section></main>;
}
