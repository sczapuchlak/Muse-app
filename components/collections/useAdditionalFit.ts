'use client';
import {useEffect,useState} from 'react';

/**
 * How many Additional works rows fit before the main column ends, so the side column finishes about where the main one
 * does and the rest is paged. Measured from the real layout, so it follows the screen. One column (phones): 5 rows.
 */
export function useAdditionalFit(){
 const [size,setSize]=useState(5),[,setTick]=useState(0);
 useEffect(()=>{const on=()=>setTick(t=>t+1);window.addEventListener('resize',on);return()=>window.removeEventListener('resize',on);},[]);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   const section=document.querySelector<HTMLElement>('.muse-series-page-additional'),main=document.querySelector<HTMLElement>('.muse-series-col-main'),side=document.querySelector<HTMLElement>('.muse-series-col-side'),rows=section?.querySelector<HTMLElement>('.muse-series-page-rows');
   if(!section||!main||!side||!rows||!rows.children.length)return;
   const total=Number(section.dataset.total||0);let next=5;
   if(getComputedStyle(side).display!=='contents'&&main.lastElementChild){
    const avail=main.lastElementChild.getBoundingClientRect().bottom-section.getBoundingClientRect().top,nav=section.querySelector<HTMLElement>('.muse-series-additional-nav'),chrome=section.offsetHeight-rows.offsetHeight-(nav?.offsetHeight??0)+52,each=rows.offsetHeight/rows.children.length;
    next=Math.floor((avail-chrome)/each);
   }
   next=Math.min(Math.max(next,2),Math.max(total,2));
   setSize(current=>current===next?current:next);
  });
  return()=>cancelAnimationFrame(frame);
 });  // after every render: the page loads in stages, and each stage can move the main column's end
 return size;
}
