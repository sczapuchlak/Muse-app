import type {CSSProperties,ReactNode} from 'react';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import {MuseGlyph,isMuseGlyph,type MuseGlyphName} from './MuseGlyph';

/**
 * Mark tones are the theme's eight chart inks (`--chart-1…8`), so a mark is colorful in every theme without any
 * hard-coded palette. Pick the tone by meaning and keep it stable for a concept across the app.
 */
export type MuseTone=1|2|3|4|5|6|7|8;
export type MuseMarkIcon=MuseGlyphName|MuseIconName;

const toneStyle=(tone:MuseTone)=>({'--mark-a':`var(--chart-${tone})`,'--mark-b':`var(--chart-${tone%8+1})`}) as CSSProperties;

/** The small colored icon tile that leads a section heading or a stat. Decorative: the heading carries the name. */
export function MuseMark({icon,tone=1,size='md',variant='solid',className=''}:{icon:MuseMarkIcon;tone?:MuseTone;size?:'sm'|'md'|'lg';variant?:'solid'|'soft';className?:string}){
 const px=size==='sm'?14:size==='lg'?22:17;
 return <span className={`muse-mark ${className}`.trim()} data-size={size} data-variant="solid" data-asked={variant} style={toneStyle(tone)} aria-hidden="true">
  {isMuseGlyph(icon)?<MuseGlyph name={icon} size={px}/>:<MuseIcon name={icon} size={px}/>}
 </span>;
}

/**
 * The shared section heading: a colored mark, an editorial title, an optional supporting line and an optional
 * aside (period label, count, action). `practical` keeps the title in the interface face for dense, functional
 * modules (Money, Planner); everything else uses the editorial serif like Books.
 */
export function MuseHeading({icon,tone=1,title,description,kicker,aside,level=3,id,face='editorial',size='md',className=''}:{
 icon:MuseMarkIcon;tone?:MuseTone;title:ReactNode;description?:ReactNode;kicker?:ReactNode;aside?:ReactNode;level?:2|3|4;id?:string;face?:'editorial'|'practical';size?:'sm'|'md'|'lg';className?:string;
}){
 const Heading=`h${level}` as 'h2'|'h3'|'h4';
 return <div className={`muse-heading ${className}`.trim()} data-face={face} data-size={size}>
  <MuseMark icon={icon} tone={tone} size={size}/>
  <div className="muse-heading-copy">
   {kicker&&<p className="muse-kicker">{kicker}</p>}
   <Heading id={id} className="muse-heading-title">{title}</Heading>
   {description&&<p className="muse-heading-description">{description}</p>}
  </div>
  {aside&&<div className="muse-heading-aside">{aside}</div>}
 </div>;
}

/**
 * An expressive stat: a mark, a strong number and a label, with an optional note. Used for summary rows
 * (Aspirations, the Tarot Reading Journal, Insights) so every module's numbers share one voice.
 */
export function MuseStatTile({icon,tone=1,value,label,note,unit,children,className=''}:{icon:MuseMarkIcon;tone?:MuseTone;value:ReactNode;label:ReactNode;note?:ReactNode;unit?:ReactNode;children?:ReactNode;className?:string}){
 return <div className={`muse-stat-tile ${className}`.trim()} style={toneStyle(tone)}>
  <MuseMark icon={icon} tone={tone} size="md"/>
  <div className="muse-stat-tile-copy">
   <span className="muse-stat-tile-label">{label}</span>
   <strong className="muse-stat-tile-value type-numeric">{value}{unit&&<small>{unit}</small>}</strong>
   {note&&<span className="muse-stat-tile-note">{note}</span>}
  </div>
  {children}
 </div>;
}
export function MuseStatRow({children,label,className=''}:{children:ReactNode;label?:string;className?:string}){
 return <div className={`muse-stat-row ${className}`.trim()} role="group" aria-label={label}>{children}</div>;
}
