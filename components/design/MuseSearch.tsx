'use client';
import {useId,type Ref} from 'react';
import {MuseIcon} from '../MuseIcon';

/** The shared search field: icon, input, clear button (also Escape) and an optional live result count. */
export function MuseSearch({label,value,onChange,placeholder,count,noun,className='',inputRef,id}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string;count?:number;noun?:[string,string];className?:string;inputRef?:Ref<HTMLInputElement>;id?:string}){
 const generated=useId(),inputId=id??generated;
 return <div className={`muse-search ${className}`.trim()}><label htmlFor={inputId} className="sr-only">{label}</label><MuseIcon name="search" size={17}/>
  <input id={inputId} ref={inputRef} type="search" value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&value){e.preventDefault();onChange('');}}}/>
  {value&&<button type="button" className="muse-search-clear" aria-label={`Clear ${label.toLowerCase()}`} onClick={()=>onChange('')}><MuseIcon name="close" size={14}/></button>}
  {count!==undefined&&noun&&<span className="muse-search-count" role="status">{count} {count===1?noun[0]:noun[1]}</span>}
 </div>;
}
