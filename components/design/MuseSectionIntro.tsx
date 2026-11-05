import type {ReactNode} from 'react';

/** Kicker, heading and one supporting line. "practical" keeps the heading in the interface font. */
export function MuseSectionIntro({kicker,title,children,id,tone='editorial',headingLevel=2,className=''}:{kicker?:ReactNode;title:ReactNode;children?:ReactNode;id?:string;tone?:'editorial'|'practical';headingLevel?:2|3;className?:string}){
 const Heading=`h${headingLevel}` as 'h2'|'h3';
 return <div className={`muse-section-intro ${className}`.trim()} data-tone={tone}>
  {kicker&&<p className="muse-kicker">{kicker}</p>}
  <Heading id={id}>{title}</Heading>
  {children&&<p>{children}</p>}
 </div>;
}
