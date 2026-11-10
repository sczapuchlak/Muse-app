import type {ReactNode} from 'react';

/**
 * Small decorative objects for a miniature bookcase (#136). Purely ornamental: hidden from assistive technology,
 * never receive pointer events, and colored from the theme so they stay quiet beside the covers.
 */
export type Trinket='plant'|'crystal'|'rose'|'candle'|'planet'|'teacup'|'magnifier'|'stack';

const art:Record<Trinket,ReactNode>={
 plant:<><path className="t-leaf-a" d="M20 33c-1-9-6-13-12-14 1 8 6 12 12 14z"/><path className="t-leaf-b" d="M20 33c1-10 6-15 13-16-1 9-6 14-13 16z"/><path className="t-leaf-c" d="M20 33c-2-6-2-12 0-19 3 5 3 12 0 19z"/><path className="t-pot" d="M12 33h16l-2.4 11H14.4z"/><path className="t-glow" d="M13 36h14v2H13z" opacity=".5"/></>,
 crystal:<><path className="t-stand" d="M13 44h14l-2-5H15z"/><path className="t-gem-a" d="M20 12l10 9-10 18-10-18z"/><path className="t-gem-b" d="M20 12l-4 9 4 18 4-18z" opacity=".55"/><path className="t-glow" d="M34 8l1.4 3.2L38.6 12.6 35.4 14 34 17.2 32.6 14 29.4 12.6 32.6 11.2z"/></>,
 rose:<><path className="t-stem" d="M20 24v19" strokeWidth="2" fill="none"/><path className="t-leaf-a" d="M20 36c-5-1-8-4-9-8 5 0 8 3 9 8z"/><path className="t-bloom" d="M20 9c3-3 9-1 9 4 0 6-7 10-9 12-2-2-9-6-9-12 0-5 6-7 9-4z"/><path className="t-glow" d="M16 13c1-2 3-2 4-1" fill="none" strokeWidth="1.4" opacity=".7"/></>,
 candle:<><rect className="t-candle" x="15" y="22" width="10" height="20" rx="2"/><path className="t-flame" d="M20 8c4 5 5 8 0 13-5-5-4-8 0-13z"/><path className="t-stand" d="M12 42h16v3H12z"/></>,
 planet:<><circle className="t-gem-a" cx="20" cy="26" r="10"/><ellipse className="t-ring" cx="20" cy="26" rx="17" ry="5" transform="rotate(-18 20 26)" fill="none" strokeWidth="2"/><path className="t-glow" d="M8 10l1.2 2.8L12 14l-2.8 1.2L8 18l-1.2-2.8L4 14l2.8-1.2z"/></>,
 teacup:<><path className="t-gem-a" d="M10 22h20v6c0 6-4 10-10 10s-10-4-10-10z"/><path className="t-ring" d="M30 25h3c2 0 3 2 2 4s-3 3-5 3" fill="none" strokeWidth="2"/><path className="t-stand" d="M8 42h24v2H8z"/><path className="t-steam" d="M16 18c-2-3 2-4 0-8M22 18c-2-3 2-4 0-8" fill="none" strokeWidth="1.6"/></>,
 magnifier:<><circle className="t-ring" cx="18" cy="20" r="9" fill="none" strokeWidth="3"/><circle className="t-lens" cx="18" cy="20" r="7"/><path className="t-ring" d="M25 27l10 12" strokeWidth="4" fill="none"/></>,
 stack:<><rect className="t-leaf-a" x="8" y="34" width="26" height="8" rx="1.5"/><rect className="t-bloom" x="11" y="26" width="22" height="8" rx="1.5"/><rect className="t-gem-a" x="9" y="18" width="24" height="8" rx="1.5"/><path className="t-glow" d="M12 38h20M15 30h14M13 22h16" fill="none" strokeWidth="1" opacity=".6"/></>,
};

/** The genre-aware accent: romance → a rose, fantasy → a crystal, mystery → a magnifier, and so on. */
export function trinketFor(genres:string[]):Trinket{
 const g=genres.join(' ').toLowerCase();
 if(/romantasy|fantasy|young adult|paranormal/.test(g))return 'crystal';
 if(/romance/.test(g))return 'rose';
 if(/mystery|thriller|crime|detective/.test(g))return 'magnifier';
 if(/horror|gothic/.test(g))return 'candle';
 if(/science fiction|sci-fi|space/.test(g))return 'planet';
 if(/historical|literary|classic/.test(g))return 'teacup';
 return 'candle';
}
function Piece({name}:{name:Trinket}){return <svg className="muse-trinket" data-trinket={name} viewBox="0 0 40 48" aria-hidden="true" focusable="false">{art[name]}</svg>;}

/** The ornaments at either end of the shelf, plus a string of fairy lights. */
export function ShelfDecor({genres,count}:{genres:string[];count:number}){
 const accent=trinketFor(genres);
 return <>
  <span className="muse-shelf-lights" aria-hidden="true"/>
  <span className="muse-shelf-trinkets" aria-hidden="true" data-count={count}>
   <span className="muse-shelf-trinket-left"><Piece name="plant"/></span>
   <span className="muse-shelf-trinket-right"><Piece name={accent}/>{count>=4&&<Piece name="stack"/>}</span>
  </span>
 </>;
}
