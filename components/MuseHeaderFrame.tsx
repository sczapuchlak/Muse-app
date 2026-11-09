import type { ReactNode } from 'react';
import { MuseStarCluster } from './MuseStarCluster';
import './MusePageHeader.css';
/** Copy, signature and controls have distinct normal-flow safe zones. */
/** `signature={false}` when the title places the star cluster itself (Daily Edit's wrapped greeting, #12). */
export function MuseHeaderFrame({title,mantra,children,editorial=false,contextWidth='standard',signature=true}:{title:ReactNode;mantra:ReactNode;children?:ReactNode;editorial?:boolean;contextWidth?:'standard'|'wide';signature?:boolean}){
 return <header data-context-width={contextWidth} className={`muse-header-layout ${editorial?'muse-header muse-editorial-header':'muse-module-header'}`}>
 <div className={editorial?'muse-header-identity muse-greeting-zone':'muse-header-identity muse-module-identity'}><div className="muse-header-title-row">{title}{signature&&<div className="muse-header-signature"><MuseStarCluster compact={!editorial}/></div>}</div>{mantra}</div>
 {children&&<div className={`muse-header-context ${editorial?'muse-temporal-zone':'muse-module-context'}`}>{children}</div>}</header>;
}
