import type {CSSProperties,ReactNode} from 'react';

/**
 * The journal pattern (#214): stat chips for a journal hero, and the invite card that ends a grid whose last row isn't
 * full. Shared by the Cosmic Journal, the Tarot Reading Journal and the Dream Diary; styles live in app/journals.css.
 */
export function MuseJournalStats({items,label}:{items:{label:string;value:ReactNode}[];label?:string}){
 return <dl className="muse-journal-stats" aria-label={label}>{items.map(item=><div key={item.label}><dt>{item.label}</dt><dd className="type-numeric">{item.value}</dd></div>)}</dl>;
}

/**
 * An illustrated "add another" card. `count` is how many cards sit before it in a three-across grid: it spans the rest
 * of that row (and of a two-across row at narrower widths), and renders nothing when the row is already full.
 */
export function MuseInviteCard({count,title,note,cta,art,onClick,className}:{count:number;title:string;note:string;cta:string;art:ReactNode;onClick:()=>void;className?:string}){
 if(count%3===0)return null;
 const style={'--ghost-3':3-count%3,'--ghost-2':2-count%2} as CSSProperties;
 return <button type="button" className={`muse-journal-invite${className?` ${className}`:''}`} style={style} onClick={onClick}>
  <span className="muse-journal-invite-art" aria-hidden="true">{art}</span>
  <b>{title}</b><small>{note}</small>
  <span className="muse-journal-invite-cta" aria-hidden="true">+ {cta}</span>
 </button>;
}

/** Four-point sparkle path centred on (x, y) with radius r, for journal art. */
export const sparkle=(x:number,y:number,r:number)=>`M${x} ${y-r}C${x+r*.12} ${y-r*.12} ${x+r*.12} ${y-r*.12} ${x+r} ${y}C${x+r*.12} ${y+r*.12} ${x+r*.12} ${y+r*.12} ${x} ${y+r}C${x-r*.12} ${y+r*.12} ${x-r*.12} ${y+r*.12} ${x-r} ${y}C${x-r*.12} ${y-r*.12} ${x-r*.12} ${y-r*.12} ${x} ${y-r}Z`;
