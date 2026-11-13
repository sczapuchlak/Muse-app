import Link from "next/link";
import {NavMark,navInk} from "./design/NavMark";
import "./MuseSectionNav.css";

/** A page's sections as icon pills. `ns` picks each tab's glyph; it defaults to the first word of the label ("Planner views"). */
export function MuseSectionNav({label,items,current,ns}:{label:string;items:{id:string;label:string;href:string}[];current:string;ns?:string}) {
  const space=(ns??label.split(" ")[0]).toLowerCase();
  return <nav className="muse-section-nav" aria-label={label}>{items.map((item)=><Link key={item.id} className="muse-button muse-edge" href={item.href} scroll={false} style={navInk(space,item.id)} aria-current={current===item.id?"page":undefined}><NavMark ns={space} id={item.id}/><span>{item.label}</span></Link>)}</nav>;
}
