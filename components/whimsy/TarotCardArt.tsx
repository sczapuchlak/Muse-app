'use client';
import {useState} from 'react';
import Image from 'next/image';
import {MuseStar} from '@/components/MuseStar';
import type {TarotCard,TarotOrientation} from '@/lib/whimsy/tarot';
/** The authenticated browser must fetch these protected local files directly.
 * Next's optimizer does not forward the session to its source-image request. */
export function TarotCardArt({card,orientation='upright',small=false,onReady,onUnavailable}:{card:TarotCard;orientation?:TarotOrientation;small?:boolean;onReady?:(id:string)=>void;onUnavailable?:(id:string)=>void}){
 const [failedFor,setFailedFor]=useState<string|null>(null);
 return <span data-orientation={orientation} className={`muse-tarot-art ${small?'is-small':''}`}>{failedFor===card.id?<span className="muse-tarot-art-fallback" role="img" aria-label={`${card.name} artwork unavailable`}><MuseStar size={34} prismatic/><strong>{card.name}</strong><small>Artwork could not load. You can still explore its written meaning.</small></span>:<Image unoptimized src={card.artPath} alt={`${card.name}, Rider–Waite–Smith 1909 illustration`} width={330} height={572} sizes={small?'(max-width: 600px) 40vw, 220px':'(max-width: 700px) 70vw, 330px'} onLoad={()=>onReady?.(card.id)} onError={()=>{setFailedFor(card.id);onUnavailable?.(card.id);}}/>}{orientation==='reversed'&&<span className="muse-tarot-reversed-label">Reversed</span>}</span>;
}
