import type {Book,ReadingSession} from '@/lib/whimsy/models';
import type {Series,SeriesMember} from '@/lib/collections/models';
import {bookPosition} from '@/lib/whimsy/books';

export type BookLibraryFilters={query:string;status:string;genre:string;seriesId:string;progress:'all'|'started'|'unstarted';sort:string};

export function browseBooks(books:Book[],sessions:ReadingSession[],series:Series[],members:SeriesMember[],filters:BookLibraryFilters){
 const byBook=new Map<string,ReadingSession[]>();for(const session of sessions){const own=byBook.get(session.bookId)??[];own.push(session);byBook.set(session.bookId,own);}
 const seriesById=new Map(series.map(row=>[row.id,row.title]));const memberships=new Map<string,string[]>(),seriesBooks=new Set<string>();for(const member of members){if(!member.book_id)continue;const names=memberships.get(member.book_id)??[],name=seriesById.get(member.series_id);if(name)names.push(name);memberships.set(member.book_id,names);if(member.series_id===filters.seriesId)seriesBooks.add(member.book_id);}
 const words=filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),collator=new Intl.Collator(undefined,{sensitivity:'base',numeric:true});
 const rows=books.filter(book=>{
  if(filters.status==='archived'?!book.archivedAt:!!book.archivedAt||!!filters.status&&book.status!==filters.status)return false;
  if(filters.genre&&!book.genre?.split(',').some(value=>value.trim().toLocaleLowerCase()===filters.genre.toLocaleLowerCase()))return false;
  if(filters.seriesId&&!seriesBooks.has(book.id))return false;
  const own=byBook.get(book.id)??[],position=bookPosition(book,own);
  if(filters.progress==='started'&&position===0&&!own.length)return false;
  if(filters.progress==='unstarted'&&(position>0||own.length))return false;
  const haystack=`${book.title} ${book.author??''} ${book.genre??''} ${book.status} ${memberships.get(book.id)?.join(' ')??''}`.toLocaleLowerCase();
  return words.every(word=>haystack.includes(word));
 });
 const activity=(book:Book)=>Math.max(Date.parse(book.updatedAt)||0,...(byBook.get(book.id)??[]).map(row=>Date.parse(row.updatedAt)||0));
 const position=(book:Book)=>book.totalPages?bookPosition(book,byBook.get(book.id)??[])/book.totalPages:-1;
 rows.sort((a,b)=>{let order=0;switch(filters.sort){case'title':order=collator.compare(a.title,b.title);break;case'author':order=collator.compare(a.author??'',b.author??'');break;case'oldest':order=a.createdAt.localeCompare(b.createdAt);break;case'activity':order=activity(b)-activity(a);break;case'finished':order=(b.finishedOn??'').localeCompare(a.finishedOn??'');break;case'rating':order=(b.rating??-1)-(a.rating??-1);break;case'progress':order=position(b)-position(a);break;default:order=b.updatedAt.localeCompare(a.updatedAt);}return order||collator.compare(a.title,b.title)||a.id.localeCompare(b.id);});
 return rows;
}
