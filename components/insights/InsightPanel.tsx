import type {ReactNode} from 'react';
export function InsightPanel({title,kicker,children,className=''}:{title:string;kicker?:string;children:ReactNode;className?:string}){return <section className={`muse-insight-panel ${className}`}>{kicker&&<p className="muse-section-eyebrow">{kicker}</p>}<h2>{title}</h2>{children}</section>;}
