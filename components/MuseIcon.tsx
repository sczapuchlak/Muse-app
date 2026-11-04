"use client";
import {MUSE_STAR_PATH} from "./MuseStar";
import dynamic from "next/dynamic";
import type {ExtraIconName} from "@/lib/icon-catalog";
const ExtendedMuseIcon=dynamic(()=>import("./ExtendedMuseIcon"),{loading:()=>null});
import { PrismaticSvg, type PrismaticTone } from './PrismaticSvg';

const paths = {
  brain: <><path d="M12 18V5a3 3 0 0 0-5.8-1 4 4 0 0 0-3 6 4 4 0 0 0 1 7 4 4 0 0 0 7.8 1ZM12 5a3 3 0 0 1 5.8-1 4 4 0 0 1 3 6 4 4 0 0 1-1 7 4 4 0 0 1-7.8 1M7 4v3M17 4v3M4 10h3M20 10h-3M8 14l-3 3M16 14l3 3"/></>,
  // Lucide heart-pulse; ISC attribution is retained in THIRD_PARTY_NOTICES.md.
  "heart-pulse": <><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/><path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></>,
  logout: <><path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9"/></>,
  sparkle:<path d={MUSE_STAR_PATH} transform="translate(4.8 0) scale(.6)"/>,
  sort:<path d="M3 5h12M3 10h9M3 15h6M18 4v16m-3-3 3 3 3-3"/>,
  tag: <><path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7" cy="7" r="1"/></>,
  pin: <path d="m9 3 8 2-2 5 3 4-5 1-6 6 2-8-4-3 5-2-1-5Z"/>,
  archive: <><path d="M4 8v13h16V8M9 12h6"/><rect x="3" y="3" width="18" height="5" rx="1"/></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M6 8h.01M6 12h.01"/></>,
  focus: <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5M9 12h6"/>,
  link: <><path d="m10 8 3-3a4 4 0 0 1 6 6l-3 3M14 16l-3 3a4 4 0 0 1-6-6l3-3M8 16l8-8"/></>,
  undo: <><path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14"/></>,
  favorite: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/></>,
  grip: <path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01" />,
  filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" /></>,
  rituals: <><path d="M7 20h10M8 17V9h8v8M12 3c-3 3-2 5 0 5s3-2 0-5Z" /></>,
  insights: <><path d="M4 4v16h16M8 15l4-5 4 2 4-6" /></>,
  money: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18M15 14h3M7 5V3" /></>,
  notes: <><path d="M6 3h9l4 4v14H5V3h1ZM14 3v5h5M8 12h8M8 16h6" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></>,
  television: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="m8 2 4 4 4-4M9 22h6"/></>,
  gamepad: <><path d="M7 8h10a5 5 0 0 1 4.7 3.3l1.1 5.1a2 2 0 0 1-3.1 2.1L16 16H8l-3.7 2.5a2 2 0 0 1-3.1-2.1l1.1-5.1A5 5 0 0 1 7 8Z"/><path d="M7 11v5M4.5 13.5h5M16 12h.01M19 14h.01"/></>,
  appearance: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18Z" /></>,
  settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-4-4L5 15l-1 5Z" /></>,
  movement: <path d="m8 5 8 14M5 8l6-3M13 19l6-3M3 5l3 6M18 13l3 6" />,
  water: <path d="M12 3C10 6 5 11 5 15a7 7 0 0 0 14 0c0-4-5-9-7-12ZM9 15a3 3 0 0 0 3 3" />,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4M16 3v4M4 11h16M8 15h2M14 15h2" /></>,
  meals: <path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-4 3-5 8 0 9" />,
  mood: <><circle cx="12" cy="12" r="9" /><path d="M8 14a4 4 0 0 0 8 0M8 9h.01M16 9h.01" /></>,
  moon: <path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
};

export type MuseIconName = keyof typeof paths | ExtraIconName;

export function MuseIcon({ name, size = 20, treatment = 'plain', tone = 'primary' }: { name: MuseIconName; size?: number; treatment?: 'plain' | 'prismatic'; tone?: PrismaticTone }) {
  if (!(name in paths)) return <span aria-hidden="true" style={{display:"inline-flex",flexShrink:0,width:size,height:size,pointerEvents:"none"}}><ExtendedMuseIcon name={name as ExtraIconName} size={size} treatment={treatment} tone={tone}/></span>;
  const shape=paths[name as keyof typeof paths];
  if (treatment === 'prismatic') return <PrismaticSvg width={size} height={size} viewBox="0 0 24 24" tone={tone} className="muse-icon-prismatic">{shape}</PrismaticSvg>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {shape}
    </svg>
  );
}
