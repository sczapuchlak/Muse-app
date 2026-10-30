import type { ReactNode } from "react";
import { PageCelestial,type CelestialSignature } from "./PageCelestial";
import { MuseStar } from "./MuseStar";
import "./MusePageHeader.css";

export function MusePageHeader({eyebrow,title,description,children,celestial="orbit"}:{eyebrow:string;title:string;description:string;children?:ReactNode;celestial?:CelestialSignature}) {
  return <header className="muse-module-header" data-celestial={celestial}><div className="muse-module-identity"><p className="muse-section-eyebrow">{eyebrow}</p><h1>{title}<MuseStar size={26} color="aqua"/></h1><p className="card-description">{description}</p></div><PageCelestial motif={celestial}/>{children&&<div className="muse-module-context">{children}</div>}</header>;
}
