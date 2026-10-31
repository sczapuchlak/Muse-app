import Link from "next/link";
import "./MuseSectionNav.css";

export function MuseSectionNav({label,items,current}:{label:string;items:{id:string;label:string;href:string}[];current:string}) {
  return <nav className="muse-section-nav" aria-label={label}>{items.map((item)=><Link key={item.id} className="muse-button muse-edge" href={item.href} scroll={false} aria-current={current===item.id?"page":undefined}>{item.label}</Link>)}</nav>;
}
