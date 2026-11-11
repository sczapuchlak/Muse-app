import {validDate} from '@/lib/dates';
import type {Book,ReadingSession} from '@/lib/whimsy/models';

const dated=(value:string|undefined)=>value&&validDate(value)?Date.parse(value+'T00:00:00Z'):0;
/** Reading Desk order uses reading evidence, never capture/import time or metadata-edit timestamps.
 * Preserve incoming order for ties. Source start dates are meaningful; a source's Date Added is not reading activity.
 * Non-active Library records keep their positions; activeReadingBooks consumes this same canonical snapshot.
 */
export function orderBooksByReadingActivity(books:readonly Book[],sessions:readonly ReadingSession[]):Book[]{
 const activity=new Map<string,number>();
 for(const session of sessions){let seconds=0,last=0;for(const segment of session.activeSegments){const start=Date.parse(segment.start),end=Date.parse(segment.end);if(Number.isFinite(start)&&Number.isFinite(end)&&end>start){seconds+=end-start;last=Math.max(last,end);}}
  if(session.pages>0||seconds>0)activity.set(session.bookId,Math.max(activity.get(session.bookId)??0,dated(session.date),last));
 }
 const score=(book:Book)=>Math.max(activity.get(book.id)??0,dated(book.startedOn),book.currentPage!==undefined&&book.currentPage>(book.startingPage??0)?dated(book.positionDate):0);
 const active=books.filter(b=>b.status==='reading'&&!b.archivedAt).map((book,index)=>({book,index,score:score(book)})).sort((a,b)=>b.score-a.score||a.index-b.index);let at=0;
 return books.map(book=>book.status==='reading'&&!book.archivedAt?active[at++].book:book);
}
