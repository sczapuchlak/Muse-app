'use client';
import type {ReactNode} from 'react';

/** Mutually exclusive views or modes as one pill track. Buttons expose aria-pressed for the current choice. */
export function MuseSegmented<T extends string>({label,value,options,onChange,className=''}:{label:string;value:T;options:readonly {id:T;label:ReactNode}[];onChange:(value:T)=>void;className?:string}){
 return <div className={`muse-segmented ${className}`.trim()} role="group" aria-label={label}>
  {options.map(option=><button key={option.id} type="button" aria-pressed={option.id===value} onClick={()=>onChange(option.id)}>{option.label}</button>)}
 </div>;
}
