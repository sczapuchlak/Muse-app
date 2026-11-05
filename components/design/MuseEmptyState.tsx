import type {ReactNode} from 'react';

/**
 * Shared empty state. "editorial" (default) is the centred Dreamscapes treatment for expressive modules;
 * "quiet" is a compact, left-aligned version for practical modules where an empty list shouldn't feel theatrical.
 */
export function MuseEmptyState({title,children,glyph,action,variant='editorial',headingLevel=3,className=''}:{title:ReactNode;children?:ReactNode;glyph?:ReactNode;action?:ReactNode;variant?:'editorial'|'quiet';headingLevel?:2|3|4;className?:string}){
 const Heading=`h${headingLevel}` as 'h2'|'h3'|'h4';
 return <div className={`muse-empty-state ${className}`.trim()} data-variant={variant}>
  {glyph&&<span className="muse-empty-glyph" aria-hidden="true">{glyph}</span>}
  <Heading>{title}</Heading>
  {children&&<p>{children}</p>}
  {action}
 </div>;
}
