'use client';
import Link from 'next/link';
import {MusePageHeader} from '@/components/MusePageHeader';
import {MuseIcon} from '@/components/MuseIcon';
import {BooksNav} from '@/components/books/BooksNav';
import {Bookshelf} from '@/components/whimsy/Bookshelf';
import '@/components/whimsy/BookPage.css';
import './Collections.css';

/** The book page shell: the shared reading engine on its `book` surface. */
export function BookRoute({bookId}:{bookId:string}){
 return <main className="muse-page muse-book-route"><Bookshelf key={bookId} surface="book" initialBookId={bookId} embedded/></main>;
}
/** Reading Atlas lives with Books in Collections; the engine supplies its data and goal editors. */
export function ReadingAtlasRoute(){
 return <main className="muse-page muse-collections muse-atlas-route">
  <MusePageHeader title="Books" description="Where your reading has taken you."/>
  <BooksNav current="atlas"/>
  <Bookshelf surface="atlas" embedded/>
 </main>;
}
