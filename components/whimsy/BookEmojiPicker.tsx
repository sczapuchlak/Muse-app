'use client';
import {useRef,useState} from 'react';
import {EmojiGlyph,EmojiPicker} from '@/components/EmojiPicker';

/** Book in Three Emojis: zero to three emojis from the shared Muse picker. One set per book, shared by every read. */
export function BookEmojiPicker({values,onChange}:{values:string[];onChange:(values:string[])=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[open,setOpen]=useState(false);
 return <div className="muse-books-emoji-field"><span>Book in Three Emojis <small>optional</small></span><small className="small-label">Tell the story in up to three little symbols.</small>
  <button ref={anchor} className="muse-button button-ghost" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>{values.length?values.map((value,index)=><EmojiGlyph key={index} value={value}/>):'Choose up to three emojis'}</button>
  <EmojiPicker mode="multiple" open={open} anchorRef={anchor} onClose={()=>setOpen(false)} values={values} onChange={onChange} onConfirm={()=>{setOpen(false);anchor.current?.focus();}} label="Book in Three Emojis"/>
 </div>;
}
