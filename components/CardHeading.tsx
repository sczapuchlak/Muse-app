import Link from "next/link";
import type { MouseEvent,ReactNode } from "react";
import { MuseIcon,type MuseIconName } from "./MuseIcon";
import { MuseStar } from "./MuseStar";
import { ModuleBadge,type SourceModule } from "./ModuleBadge";
type ManageAction={href:string;onClick?:never;expanded?:never;controls?:never}|{href?:never;onClick:(event:MouseEvent<HTMLButtonElement>)=>void;expanded?:boolean;controls?:string};
type CardHeadingProps={id:string;title:string;icon?:MuseIconName;children?:ReactNode;sourceModule?:SourceModule;manage?:ManageAction};
export function CardHeading({id,title,icon,children,sourceModule,manage}:CardHeadingProps){return <div className="card-heading"><h2 id={`${id}-title`}><span className="card-heading-icon">{icon?<MuseIcon name={icon} size={22} treatment="prismatic" tone={icon==="water"?"secondary":icon==="mood"?"tertiary":"primary"}/>:<MuseStar size={24} prismatic/>}</span>{title}</h2>{(children||sourceModule||manage)&&<div className="muse-card-heading-actions">{children}{sourceModule&&<ModuleBadge module={sourceModule}/>} {manage&&(manage.href?<Link className="muse-button button-ghost" href={manage.href} aria-label={`Manage ${title.toLowerCase()}`}>Manage</Link>:<button className="muse-button button-ghost" type="button" onClick={manage.onClick} aria-expanded={manage.expanded} aria-controls={manage.controls}>Manage</button>)}</div>}</div>;}
