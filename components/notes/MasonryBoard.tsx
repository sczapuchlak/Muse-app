'use client';

import {useEffect,useRef,type ReactNode} from 'react';

/** Keeps source order intact while packing naturally sized cards into a left-aligned grid. */
export function MasonryBoard({children,layout}:{children:ReactNode;layout:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const board=ref.current;
  if(!board||layout==='list')return;
  const observer=new ResizeObserver(entries=>{
   for(const entry of entries){
    const card=entry.target as HTMLElement;
    const height=entry.borderBoxSize?.[0]?.blockSize??card.getBoundingClientRect().height;
    const row=parseFloat(getComputedStyle(board).gridAutoRows)||4;
    const gap=parseFloat(getComputedStyle(board).rowGap)||12;
    const span=Math.max(1,Math.ceil((height+gap)/(row+gap)));
    if(card.style.gridRowEnd!==`span ${span}`)card.style.gridRowEnd=`span ${span}`;
   }
  });
  for(const card of board.children)observer.observe(card);
  return()=>observer.disconnect();
 },[children,layout]);
 return <div className="muse-constellation-board" ref={ref}>{children}</div>;
}
