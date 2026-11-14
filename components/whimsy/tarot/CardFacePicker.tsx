'use client';
import {tarotById} from '@/lib/whimsy/tarot';
import {TarotCardArt} from '../TarotCardArt';
import {cardFaceStyles,setCardFaceStyle,useCardFaceStyle} from './TarotCardFace';

/** The face-style picker: the same radio row as the card-back picker, showing The Fool printed in each style. */
export function CardFacePicker(){
 const chosen=useCardFaceStyle(),fool=tarotById('tarot-major-00');
 return <fieldset className="muse-cardback-picker muse-cardface-picker"><legend>Card faces</legend><div role="radiogroup" aria-label="Card faces">{cardFaceStyles.map(style=><button key={style.id} type="button" role="radio" aria-checked={chosen===style.id} title={style.note} onClick={()=>setCardFaceStyle(style.id)}>{fool&&<span aria-hidden="true"><TarotCardArt card={fool} face={style.id} small/></span>}<span>{style.name}</span></button>)}</div><p className="small-label">The same 1909 artwork, printed seven ways. Saved on this device.</p></fieldset>;
}
