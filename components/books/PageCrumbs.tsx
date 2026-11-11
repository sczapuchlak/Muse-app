'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {trailAncestors,type ReturnContext} from '@/lib/books/return-nav';

/**
 * Usable breadcrumbs for Book and Series pages: Collections > the pages you came through > this page. Every step is a
 * real link, so getting back to the library never takes repeated Back presses.
 */
export function PageCrumbs({current,label,className=''}:{current:string;label:string;className?:string}){
 const [trail,setTrail]=useState<{root:string;steps:ReturnContext[]}>({root:'/collections?kind=book',steps:[]});
 useEffect(()=>{const frame=requestAnimationFrame(()=>setTrail(trailAncestors()));return()=>cancelAnimationFrame(frame);},[current]);
 return <nav className={`muse-book-page-crumbs ${className}`.trim()} aria-label={label}>
  <ol className="muse-book-page-trail">
   <li><Link href={trail.root}>Collections</Link></li>
   {trail.steps.map(step=><li key={step.href}><Link href={step.href}>{step.label}</Link></li>)}
   <li aria-current="page"><span>{current}</span></li>
  </ol>
 </nav>;
}
