import type {ReactNode} from 'react';

/**
 * Section glyphs: the meaningful little symbols that sit in a heading's colored mark (see MuseHeading). They are
 * drawn on the same 24px grid and rounded 1.7 stroke as MuseIcon, but live here because they are identity, not
 * controls: a section about lunar phases gets a moon phase, a ledger gets a receipt. Never a generic star for
 * everything. Statically bundled (no lazy chunk), so a heading never pops in.
 */
const glyphs={
 // Celestial
 sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
 crescent:<path d="M20.5 14.2A8.8 8.8 0 0 1 9.8 3.5a8.8 8.8 0 1 0 10.7 10.7Z"/>,
 phase:<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c-3.2-2.4-4.6-5.4-4.6-9S8.8 5.4 12 3Z"/></>,
 planet:<><circle cx="12" cy="12" r="5.2"/><path d="M16.9 9.6c3 .2 5 .9 5.1 2 .2 1.9-4.1 3.9-9.600 4.500S2.300 15.700 2 13.800c-.1-1 1.200-2.100 3.400-3"/></>,
 wheel:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/><path d="M12 3v5.600M12 15.400V21M3 12h5.600M15.400 12H21M5.600 5.600l4 4M14.400 14.400l4 4M5.600 18.400l4-4M14.400 9.600l4-4"/></>,
 aspect:<><path d="M12 4 20.500 19h-17Z"/><circle cx="12" cy="4" r="1.300"/><circle cx="20.500" cy="19" r="1.300"/><circle cx="3.500" cy="19" r="1.300"/></>,
 house:<><path d="m3 11 9-7.500 9 7.500"/><path d="M5.500 9.500V20h13V9.500M12 20v-6"/></>,
 telescope:<><path d="m4 13.500 11.500-5.800 1.800 3.600L5.800 17Z"/><path d="m15.500 7.700 3.300-1.700 1.900 3.700-3.400 1.600M11 15.200 8 21M12.200 14.600 15 21"/></>,
 comet:<><circle cx="16" cy="8" r="3.500"/><path d="M13.300 10.300 4 20M12.700 6.700 3 13M17.300 11.300 11 21"/></>,
 constellation:<><circle cx="5" cy="6" r="1.400"/><circle cx="12" cy="9" r="1.400"/><circle cx="19" cy="5" r="1.400"/><circle cx="16" cy="17" r="1.400"/><circle cx="7" cy="19" r="1.400"/><path d="m6.300 6.600 4.400 1.800M13.300 8.300l4.400-2.600M12.600 10.300l2.800 5.500M14.600 17.300l-6.200 1.400"/></>,
 orbit:<><circle cx="12" cy="12" r="2.600"/><ellipse cx="12" cy="12" rx="10" ry="4.200" transform="rotate(-28 12 12)"/><circle cx="19.600" cy="6.400" r="1.300"/></>,
 // Tarot, fortunes and other small magic
 spread:<><rect x="2.500" y="7.500" width="5.800" height="9.500" rx="1.200"/><rect x="9.100" y="5" width="5.800" height="9.500" rx="1.200"/><rect x="15.700" y="7.500" width="5.800" height="9.500" rx="1.200"/><path d="M12 8.200v3.100M10.500 9.750h3"/></>,
 card:<><rect x="6" y="3" width="12" height="18" rx="2"/><path d="m12 8 1.400 3.200L12 14.400l-1.400-3.200Z"/><path d="M9 6h.01M15 18h.01"/></>,
 reversed:<path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"/>,
 eye:<><path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z"/><circle cx="12" cy="12" r="3"/><path d="M12 2v1.500M5 4l1 1.300M19 4l-1 1.300"/></>,
 crystal:<><circle cx="12" cy="10" r="7.500"/><path d="M7.500 19.500h9l1.500 2.500H6ZM8.800 8.500A3.800 3.800 0 0 1 12 6"/></>,
 cookie:<><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.500 8.500v.01M16 15.500v.01M12 12v.01M11 17v.01M7 14v.01"/></>,
 letter:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.500 7 8.500 6 8.500-6"/><circle cx="12" cy="15.500" r="1.400"/></>,
 cabinet:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10.500 6h3M10.500 12h3M10.500 18h3"/></>,
 key:<><circle cx="8" cy="15.500" r="4.500"/><path d="m11.200 12.300 8.300-8.300M16 7.500l2.500 2.500M13.500 10l2 2"/></>,
 hourglass:<><path d="M6 2.500h12M6 21.500h12"/><path d="M7.500 2.500V6c0 1.700.800 3 2.300 4L12 12l-2.200 2c-1.500 1-2.300 2.300-2.300 4v3.500M16.500 2.500V6c0 1.700-.800 3-2.300 4L12 12l2.200 2c1.500 1 2.300 2.300 2.300 4v3.500"/></>,
 potion:<><path d="M9.500 3h5M10.500 3v5.200L5.700 17a2.700 2.700 0 0 0 2.400 4h7.800a2.700 2.700 0 0 0 2.400-4l-4.800-8.800V3"/><path d="M7.800 14.500h8.400"/></>,
 dice:<><rect x="4" y="4" width="16" height="16" rx="3.500"/><path d="M9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01"/></>,
 gem:<><path d="M6.500 3.500h11L21.500 9 12 20.500 2.500 9ZM2.500 9h19"/><path d="m9.500 3.500-2 5.500L12 20.500 16.500 9l-2-5.500"/></>,
 // Words, books and keeping
 quill:<><path d="M20.240 12.240a6 6 0 0 0-8.490-8.490L5 10.500V19h8.500z"/><path d="M16 8 2 22M17.500 15H9"/></>,
 scroll:<><path d="M8 4h9.500A2.500 2.500 0 0 1 20 6.500V8h-4"/><path d="M16 6.500V17a3 3 0 0 1-3 3H6.500A2.500 2.500 0 0 1 4 17.500V16h9v1.200"/><path d="M8 4a2.500 2.500 0 0 0-2.500 2.500V16M9 8.500h4M9 12h4"/></>,
 openbook:<path d="M12 6.800C10 5.300 7 4.800 3 5.200v13c4-.4 7 .1 9 1.600 2-1.500 5-2 9-1.600v-13c-4-.4-7 .1-9 1.600ZM12 6.800v13"/>,
 journal:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12.500 8h3M12.500 12h3"/></>,
 quote:<path d="M4.500 17c2.200-1 3.300-3 3.300-5.800H4.500V6h5.300v5.200c0 3.800-1.800 5.600-5.300 5.800ZM13.700 17c2.200-1 3.300-3 3.300-5.800h-3.300V6H19v5.200c0 3.800-1.800 5.600-5.300 5.800Z"/>,
 heart:<path d="M19 14c1.490-1.460 3-3.210 3-5.500A5.500 5.500 0 0 0 16.500 3c-1.760 0-3 .5-4.500 2-1.500-1.500-2.740-2-4.500-2A5.500 5.500 0 0 0 2 8.500c0 2.300 1.500 4.050 3 5.500l7 7Z"/>,
 ribbon:<><circle cx="12" cy="9" r="6"/><path d="m8.600 14-1.600 7.500 5-3 5 3-1.600-7.500"/><path d="m12 6.500.9 1.800 2 .3-1.450 1.400.35 2L12 11.050 10.200 12l.35-2L9.100 8.600l2-.3Z"/></>,
 keepsake:<><path d="M4 8.500h16V20H4ZM3 5h18v3.500H3Z"/><path d="M10 12h4"/></>,
 // Progress, goals and rhythm
 target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.200"/></>,
 summit:<><path d="m3 20 6.500-11 3.500 5.700 2.500-3.700L21 20Z"/><path d="M9.500 9V3.500l4 1.500-4 1.500"/></>,
 trophy:<><path d="M7.500 3.500h9v5.700a4.500 4.500 0 0 1-9 0Z"/><path d="M7.500 5.500H4c0 3 1.500 4.700 4 5M16.500 5.500H20c0 3-1.500 4.700-4 5M12 13.700V18M8 21h8M9.500 18h5"/></>,
 checkmark:<><circle cx="12" cy="12" r="9"/><path d="m8 12.400 2.800 2.800L16 9.500"/></>,
 milestone:<><path d="M5 21V4"/><path d="M5 4.500h11.500l-2.300 3.700 2.300 3.800H5"/></>,
 streak:<path d="M8.500 14.500A2.500 2.500 0 0 0 11 12c0-1.380-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.500 2 4.900 4 6.500 2 1.600 3 3.500 3 5.500a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.500 2.500 0 0 0 2.500 2.500z"/>,
 repeat:<path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/>,
 pulse:<path d="M2 12h4.500l2.800-8 4.200 16 2.800-8H22"/>,
 trend:<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>,
 bars:<path d="M5 20v-6M10 20V8M15 20v-9M20 20V4"/>,
 pie:<><path d="M12 3.500V12h8.500A8.500 8.500 0 1 1 12 3.500Z"/><path d="M15 3.200A8.600 8.600 0 0 1 20.800 9H15Z"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.400 2"/></>,
 calendar:<><rect x="3.500" y="5" width="17" height="16" rx="3"/><path d="M8 3v4M16 3v4M3.500 10.500h17"/><path d="m12 13.200.8 1.700 1.900.2-1.400 1.300.4 1.900-1.700-1-1.700 1 .4-1.900-1.400-1.300 1.900-.2Z"/></>,
 lightbulb:<><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.500c.7.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3Z"/></>,
 bolt:<path d="M13 2 4.500 13.500H11L10 22l8.500-11.500H12L13 2Z"/>,
 leaf:<><path d="M5 19C5 10 10 5 20 4.500c.3 10-4.700 15-13.500 15"/><path d="m5 19.500 8-8.500"/></>,
 smile:<><circle cx="12" cy="12" r="9"/><path d="M8 14a4.200 4.200 0 0 0 8 0M9 9.500h.01M15 9.500h.01"/></>,
 // Money and lists
 receipt:<><path d="M5.500 3v18l2.200-1.400L10 21l2-1.400 2 1.400 2.300-1.400 2.200 1.400V3l-2.200 1.400L14 3l-2 1.400L10 3 7.700 4.400Z"/><path d="M9 9.500h6M9 13.500h6"/></>,
 creditcard:<><rect x="2.500" y="5" width="19" height="14" rx="2.500"/><path d="M2.500 10h19M6 15h4"/></>,
 coins:<><circle cx="9" cy="9" r="6"/><path d="M15.800 9.300a6 6 0 1 1-6.500 6.500M7.800 7.300 9 6.500V11.500"/></>,
 wallet:<><path d="M19 7.500V5a1 1 0 0 0-1-1H5.500a2 2 0 0 0 0 4H20a1 1 0 0 1 1 1v3.500h-3a2 2 0 0 0 0 4h3V19a1 1 0 0 1-1 1H5.500a2 2 0 0 1-2-2V6"/></>,
 bell:<><path d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.500 2h-15Z"/><path d="M10 21h4"/></>,
 list:<path d="M8.500 6H21M8.500 12H21M8.500 18H21M3.500 6h.01M3.500 12h.01M3.500 18h.01"/>,
 checklist:<path d="m3 6 1.500 1.500L7 5M3 12l1.500 1.500L7 11M3 18l1.500 1.500L7 17M11 6h10M11 12h10M11 18h10"/>,
 basket:<><path d="M3 9h18l-1.800 10.200a1 1 0 0 1-1 .8H5.800a1 1 0 0 1-1-.8Z"/><path d="m8 9 3-5.500M16 9l-3-5.500M9.500 13v3.500M14.500 13v3.500"/></>,
 gift:<><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C9.800 8 7.500 7 7.500 5a2 2 0 0 1 4-.5c.3 1 .5 2.300.5 3.500ZM12 8c2.200 0 4.500-1 4.500-3a2 2 0 0 0-4-.5C12.200 5.500 12 6.800 12 8Z"/></>,
 suitcase:<><rect x="4" y="7.500" width="16" height="13" rx="2"/><path d="M9 7.500V4h6v3.500M4 13h16"/></>,
 film:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7.500 4v16M16.500 4v16M3 9h4.500M3 15h4.500M16.500 9H21M16.500 15H21"/></>,
 music:<><path d="M9 18V5.500l11-2V16"/><ellipse cx="6.500" cy="18" rx="2.800" ry="2.200"/><ellipse cx="17.500" cy="16" rx="2.800" ry="2.200"/></>,
 globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.900 3 2.900 15 0 18M12 3c-2.900 3-2.900 15 0 18"/></>,
 compass:<><circle cx="12" cy="12" r="9"/><path d="m15.600 8.400-2.100 5.100-5.100 2.100 2.100-5.100Z"/></>,
 map:<path d="M3 6.500 9 4l6 2.500L21 4v13.500L15 20l-6-2.500L3 20ZM9 4v13.500M15 6.500V20"/>,
 seedling:<><path d="M12 21v-9"/><path d="M12 13c0-4-2.500-6-7-6 0 4 2.500 6 7 6ZM12 11c0-3.500 2.300-5.500 6.500-5.500 0 3.500-2.300 5.500-6.500 5.500Z"/></>,
 home:<><path d="m3 10.500 9-7 9 7"/><path d="M5.500 9v11.500h13V9M9.500 20.500v-6h5v6"/></>,
 briefcase:<><rect x="3" y="7.500" width="18" height="13" rx="2"/><path d="M8.500 7.500V4h7v3.500M3 13c5.500 2.700 12.500 2.700 18 0"/></>,
 palette:<><path d="M12 3a9 9 0 1 0 0 18c1.200 0 1.800-.800 1.800-1.700 0-1.300-1-1.600-1-2.700 0-1 .800-1.700 1.900-1.700H17a4 4 0 0 0 4-4c0-4.400-4-7.900-9-7.900Z"/><path d="M7.500 12h.01M9.500 8h.01M14 7h.01"/></>,
 utensils:<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-4 3-5 8 0 9"/>,
 sparkle:<><path d="M12 3.500 13.900 9l5.600 2-5.600 2L12 18.500 10.100 13l-5.600-2 5.600-2Z"/><path d="M19 3v3M17.500 4.500h3M5 17.500v3M3.500 19h3"/></>,
} satisfies Record<string,ReactNode>;

export type MuseGlyphName=keyof typeof glyphs;
export const museGlyphNames=Object.keys(glyphs) as MuseGlyphName[];
export const isMuseGlyph=(name:string):name is MuseGlyphName=>name in glyphs;

export function MuseGlyph({name,size=18,strokeWidth=1.7}:{name:MuseGlyphName;size?:number;strokeWidth?:number}){
 return <svg className="muse-glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{glyphs[name]}</svg>;
}
