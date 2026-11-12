import type {ReactNode} from 'react';
import './WhimsyExperienceHeader.css';
/** The page title and subtitle live in MusePageHeader (one title, one subtitle); this strip only holds the page's own actions. */
export function WhimsyExperienceHeader({context,children,className=''}:{title?:string;subtitle?:string;context?:ReactNode;poetic?:string;children?:ReactNode;className?:string}){if(!context&&!children)return null;return <header className={`muse-whimsy-experience-header ${className}`}><div className="muse-whimsy-experience-side">{context&&<span className="small-label muse-whimsy-experience-context">{context}</span>}{children&&<div className="muse-whimsy-experience-actions">{children}</div>}</div></header>;}
