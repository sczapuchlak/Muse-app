'use client';
import {useSyncExternalStore} from 'react';
import './TarotCardFace.css';

/**
 * How the card faces are printed. Every style is the same public-domain 1909 Rider–Waite–Smith scan; the styles
 * after Classic are live CSS treatments of it (filters and blend layers), never a substituted or third-party
 * recoloring. The choice is a device preference (localStorage), like the card back.
 */
export const cardFaceStyles=[
 {id:'classic',name:'Classic 1909',note:'The original hand-colored printing'},
 {id:'prism',name:'Prism Foil',note:'Candy-bright holographic foil'},
 {id:'parlour',name:'Blush Parlour',note:'Hot-pink grounds in a gilt frame'},
 {id:'boho',name:'Boho Bloom',note:'Apricot and coral, drawn in plum'},
 {id:'moonmilk',name:'Moonmilk',note:'Dreamy pastel watercolor under a full moon'},
 {id:'gilded',name:'Gilded Night',note:'Gold engraving and jewel tones on black'},
 {id:'moonlit',name:'Moonlit Rose Gold',note:'Rose-gold linework on a starlit night'},
] as const;
export type CardFaceStyle=typeof cardFaceStyles[number]['id'];

const key='muse-tarot-card-face',event='muse-tarot-card-face-change';
const valid=(value:string|null):value is CardFaceStyle=>cardFaceStyles.some(style=>style.id===value);
function snapshot():CardFaceStyle{try{const value=window.localStorage.getItem(key);return valid(value)?value:'classic';}catch{return 'classic';}}
function subscribe(callback:()=>void){window.addEventListener('storage',callback);window.addEventListener(event,callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener(event,callback);};}
export function useCardFaceStyle(){return useSyncExternalStore(subscribe,snapshot,():CardFaceStyle=>'classic');}
export function setCardFaceStyle(style:CardFaceStyle){try{window.localStorage.setItem(key,style);}catch{/* private mode: the choice lasts for this page */}window.dispatchEvent(new Event(event));}
export const cardFaceName=(style:CardFaceStyle)=>cardFaceStyles.find(item=>item.id===style)?.name??'Classic 1909';
