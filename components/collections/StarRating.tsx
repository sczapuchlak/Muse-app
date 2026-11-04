'use client';
import {MuseIcon} from '@/components/MuseIcon';
import './StarRating.css';

export function StarRating({value,onChange,label='Rating'}:{value:number|null;onChange:(value:number|null)=>void;label?:string}){
 return <fieldset className="muse-star-rating"><legend>{label} <small>optional</small></legend><div role="group" aria-label={label}>{[1,2,3,4,5].map(star=><button key={star} type="button" aria-label={`${star} ${star===1?'star':'stars'}`} aria-pressed={value===star} data-filled={value!==null&&star<=value} onClick={()=>onChange(value===star?null:star)}><MuseIcon name="favorite" size={23}/></button>)}</div><span className="small-label">{value?`${value} of 5 stars`:'No rating yet'}</span></fieldset>;
}
