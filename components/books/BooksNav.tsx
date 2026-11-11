'use client';
import Link from 'next/link';

export type BooksView='dashboard'|'library'|'atlas';
const items:{id:BooksView;label:string;href:string}[]=[
 {id:'dashboard',label:'Dashboard',href:'/collections'},
 {id:'library',label:'Library',href:'/collections?tab=library'},
 {id:'atlas',label:'Reading Atlas',href:'/collections/reading-atlas'},
];

/** The three sibling views of Books. One place, so no view needs its own link to another. */
export function BooksNav({current}:{current:BooksView}){
 return <nav className="muse-page-tabs muse-books-nav" aria-label="Books views">{items.map(i=><Link key={i.id} href={i.href} aria-current={i.id===current?'page':undefined}>{i.label}</Link>)}</nav>;
}
