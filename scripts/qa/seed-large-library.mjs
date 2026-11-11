// Seeds a large, deliberately awkward Library into a disposable LOCAL account: long titles, an unbroken
// word, missing author/genre/cover, a very long author, series membership and a few reading sessions.
import {sql} from './books-harness.mjs';

const adjectives=['Silent','Golden','Hollow','Crimson','Forgotten','Midnight','Gilded','Wandering','Salt','Velvet','Ember','Paper','Winter','Glass','Thorned','Lantern'];
const nouns=['Garden','Archive','Orchard','Cartographer','Harbor','Library','Season','Oracle','Tide','Almanac','Atlas','Compass','Reliquary','Conservatory','Meridian','Lighthouse'];
const authors=['Ada Marlowe','Bram Okafor','Cleo Hartigan','Dev Patel-Nowak','Elin Strand','Farah Quill','Gus Ellery','Hana Voss','Ines Calder','Jun Aoki'];
const genres=['Fantasy','Romance','Mystery','Literary Fiction','Science Fiction','Historical Fiction','Fantasy, Romance','Mystery, Thriller','Memoir','Poetry'];
// A realistic Goodreads-style mix: mostly finished and want-to-read, only a few books being read right now.
const statusFor=i=>i%200===7?'reading':i%20===3?'paused':i%14===5?'dnf':i%10<4?'planned':'finished';

export const longTitle='The Extraordinarily Long and Winding Title of a Remarkably Thorough Book About Everything That Could Possibly Happen on a Rainy Tuesday in a Small Coastal Town: A Complete, Unabridged, and Annotated Account';
export const unbrokenTitle='Pneumonoultramicroscopicsilicovolcanoconiosis_Compendium_of_Supercalifragilisticexpialidocious_Volume_Twelve';
export const longAuthor='Johann Sebastian Maximilian von Hohenzollern-Sigmaringen-Wittgenstein the Third';
export const needleTitle='Quillfeather Chronicles';

export function buildBooks(count){
 const rows=[];
 for(let i=0;i<count;i++){
  const status=statusFor(i);
  const book={title:`${adjectives[i%16]} ${nouns[(i*7)%16]} ${i+1}`,author:authors[i%authors.length],genre:genres[i%genres.length],status,format:'physical',coverUrl:i%10<7?`https://covers.muse-qa.test/c/${i}.jpg`:'',totalPages:180+(i*13)%520,currentPage:0,startingPage:0,reviewEmojis:[]};
  if(status==='finished'){book.finishedOn=`2025-${String(1+i%12).padStart(2,'0')}-${String(1+i%28).padStart(2,'0')}`;book.rating=1+i%5;}
  if(status==='reading')book.startedOn='2026-11-01';
  if(i===0)Object.assign(book,{title:longTitle,author:longAuthor,status:'planned'});
  if(i===1)Object.assign(book,{title:unbrokenTitle,coverUrl:''});
  if(i===2)Object.assign(book,{title:'Untitled',author:undefined,genre:'',coverUrl:'',status:'planned',totalPages:undefined});
  if(i===3)Object.assign(book,{title:'Ø',author:'',genre:'',coverUrl:''});
  if(i===4)Object.assign(book,{title:needleTitle,author:'Sidonie Wrenfield',status:'planned',genre:'Fantasy'});
  rows.push(book);
 }
 return rows;
}

/** Inserts `count` books for the user, oldest first, so the awkward titles are deepest in "Recently updated". */
export function seedLargeLibrary(userId,count=1040){
 const books=buildBooks(count),base=Date.parse('2026-01-01T00:00:00Z');
 const values=books.map((payload,i)=>{const at=new Date(base+i*3600_000).toISOString(),json=JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([,v])=>v!==undefined))).replace(/'/g,"''");return `(gen_random_uuid(),'${userId}','${json}'::jsonb,'${at}','${at}')`;});
 sql(`insert into public.whimsy_books(id,user_id,payload,created_at,updated_at) values ${values.join(',')}`);
 return books;
}
