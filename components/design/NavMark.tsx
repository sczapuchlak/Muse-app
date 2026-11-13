import type {CSSProperties} from 'react';
import {navArt} from '@/lib/design/nav-glyphs';
import {MuseMark,type MuseMarkIcon,type MuseTone} from './MuseHeading';

/** The gradient tile beside a tab's name, and the tab's own ink for its active glow. */
export function NavMark({ns,id}:{ns:string;id:string}){const art=navArt(ns,id);return art?<MuseMark icon={art.icon as MuseMarkIcon} tone={art.tone as MuseTone} size="sm" className="muse-nav-mark"/>:null;}
export const navInk=(ns:string,id:string):CSSProperties|undefined=>{const art=navArt(ns,id);return art?{'--nav-ink':`var(--chart-${art.tone})`,'--nav-ink-b':`var(--chart-${art.tone%8+1})`} as CSSProperties:undefined;};
