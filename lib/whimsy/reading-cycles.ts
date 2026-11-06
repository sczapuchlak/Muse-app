/**
 * Reading cycles: one library book, many reads. Rules (docs/PRODUCT_RULES.md "Reading cycles"):
 * - Every read has a stable id. A finished read is a completion whose id is that read's id; the read in progress is
 *   book.cycleId while it is not yet a completion. A new id is created only when a read starts (deterministic from
 *   the book's revision, so a retried write reuses it). Earlier reads are never edited by starting a new one.
 * - New sessions store cycleId. Older sessions without one are never rewritten; they are attributed to a read only
 *   when unambiguous: the book has a single read, or the session date falls strictly inside one read's window
 *   (after the previous finish, on or before this finish, and not on a finish date that a later read could share).
 *   Anything else is "not linked to a read": still counted in every period total, never guessed into a read.
 * - Rating and review belong to a completion. A book-level rating/review from before per-read opinions is copied to
 *   a read only when the book has exactly one finished read; with several reads it is preserved as
 *   unassignedRating/unassignedReview until the reader assigns it. Book-level rating/finalThoughts then mirror the
 *   latest rated/reviewed read so library cards and Collections keep working.
 * - Emojis (0–3) follow the same rule (#50): each read keeps its own; older book-level emojis move to a read only when
 *   the book has exactly one read, otherwise they are kept as unassignedEmojis. Rereads start with none. Book-level
 *   reviewEmojis mirror the latest read that has emojis.
 */
import {validDate} from '@/lib/dates';
import type {Book,BookCompletion,ReadingSession} from './models';
import {bookCompletions,inclusiveCalendarDays,nextCompletions,readingPace,sessionSeconds} from './reading-stats';

export type ReadEntry={id:string;number:number;open:boolean;completion?:BookCompletion;startedOn?:string;finishedOn?:string};

/** A fresh read id. Deterministic per book revision so retries of the same write produce the same id. */
export const newCycleId=(book:Pick<Book,'id'|'revision'>)=>`${book.id}:read:${book.revision}`;
/** Placeholder id for a read in progress that started before cycle ids existed (never stored on sessions). */
export const legacyOpenId=(book:Pick<Book,'id'>)=>`open:${book.id}`;

/** The stored id of the read in progress, if one has been started. */
export function openReadId(book:Book){if(book.status==='finished'||!book.cycleId)return undefined;return bookCompletions(book).some(c=>c.id===book.cycleId)?undefined:book.cycleId;}

/** Every read of a book, oldest first: completed reads, then the read in progress when the book is not finished. */
export function bookReads(book:Book):ReadEntry[]{
 const reads:ReadEntry[]=bookCompletions(book).map((c,i)=>({id:c.id,number:i+1,open:false,completion:c,startedOn:c.startedOn,finishedOn:c.finishedOn}));
 if(book.status!=='finished')reads.push({id:openReadId(book)??legacyOpenId(book),number:reads.length+1,open:true,startedOn:book.startedOn&&validDate(book.startedOn)?book.startedOn:undefined});
 return reads;
}

/** The read a session belongs to, or null when it is not linked (removed read, or ambiguous older session). */
export function sessionReadId(book:Book,session:Pick<ReadingSession,'cycleId'|'date'>,reads=bookReads(book)):string|null{
 if(session.cycleId)return reads.some(r=>r.id===session.cycleId)?session.cycleId:null;
 if(reads.length===1)return reads[0].id;
 const done=reads.filter(r=>!r.open),open=reads.find(r=>r.open);
 for(let i=0;i<done.length;i++){
  const finish=done[i].finishedOn!,previous=done[i-1]?.finishedOn,hasLater=i<done.length-1||!!open;
  if(previous&&session.date<=previous)continue;
  if(session.date<finish)return done[i].id;
  if(session.date===finish)return hasLater?null:done[i].id;
 }
 return open&&(!done.length||session.date>done.at(-1)!.finishedOn!)?open.id:null;
}

export function unlinkedSessions(book:Book,sessions:ReadingSession[]){const reads=bookReads(book);return sessions.filter(s=>s.bookId===book.id&&sessionReadId(book,s,reads)===null);}

/** Time, pages, sessions, pace and calendar span of one read, from its own sessions only. */
export function readStats(book:Book,sessions:ReadingSession[],read:ReadEntry,today:string){
 const reads=bookReads(book),own=sessions.filter(s=>s.bookId===book.id&&sessionReadId(book,s,reads)===read.id);
 const pace=readingPace(own),end=read.finishedOn??today;
 return {sessions:own.length,seconds:own.reduce((n,s)=>n+sessionSeconds(s),0),pages:own.reduce((n,s)=>n+s.pages,0),pagesPerHour:pace.pagesPerHour,readingDays:new Set(own.map(s=>s.date)).size,calendarDays:read.startedOn?inclusiveCalendarDays(read.startedOn,end):null};
}

/** The rating and review of one finished read (a single-read book's older book-level values count as that read's). */
export function readOpinion(book:Book,completion:BookCompletion):{rating?:number;review?:string;emojis?:string[]}{
 const all=bookCompletions(book),own=(k:'rating'|'review'|'emojis')=>all.some(c=>c[k]!==undefined);
 const single=all.length===1;
 const emojis=completion.emojis??(single&&!own('emojis')&&!book.unassignedEmojis?.length&&book.reviewEmojis?.length?book.reviewEmojis:undefined);
 return {...(emojis?{emojis}:{}),rating:completion.rating??(single&&!own('rating')&&book.unassignedRating===undefined?book.rating:undefined),review:completion.review??(single&&!own('review')&&!book.unassignedReview&&book.finalThoughts?.trim()?book.finalThoughts:undefined)};
}

/**
 * Stores older book-level opinions where they belong before anything can replace them: on the only finished read,
 * or (with several reads) as unassigned values. Never changes the book-level fields themselves.
 */
export function preserveOpinions(book:Book):Book{
 const all=bookCompletions(book);if(!all.length)return book;
 let completions=all,{unassignedRating,unassignedReview}=book;
 if(book.rating!==undefined&&unassignedRating===undefined&&!all.some(c=>c.rating!==undefined)){if(all.length===1)completions=[{...completions[0],rating:book.rating}];else unassignedRating=book.rating;}
 const review=book.finalThoughts?.trim();
 if(review&&!unassignedReview&&!all.some(c=>c.review!==undefined)){if(all.length===1)completions=[{...completions[0],review}];else unassignedReview=review;}
 let unassignedEmojis=book.unassignedEmojis;
 if(book.reviewEmojis?.length&&!unassignedEmojis?.length&&!all.some(c=>c.emojis!==undefined)){if(all.length===1)completions=[{...completions[0],emojis:book.reviewEmojis.slice(0,3)}];else unassignedEmojis=book.reviewEmojis.slice(0,3);}
 return {...book,completions,...(unassignedRating!==undefined?{unassignedRating}:{}),...(unassignedReview?{unassignedReview}:{}),...(unassignedEmojis?.length?{unassignedEmojis}:{})};
}

/** Book-level rating and review shown on cards: the latest read that has one, else preserved older values. */
export function mirroredOpinions(completions:BookCompletion[],book:Pick<Book,'unassignedRating'|'unassignedReview'>&Partial<Pick<Book,'unassignedEmojis'>>){
 const rated=completions.findLast(c=>c.rating!==undefined),reviewed=completions.findLast(c=>!!c.review),emojied=completions.findLast(c=>!!c.emojis?.length);
 return {rating:rated?.rating??book.unassignedRating,finalThoughts:reviewed?.review??book.unassignedReview??'',reviewEmojis:emojied?.emojis??book.unassignedEmojis??[]};
}

/** A reader-facing name for a read, e.g. "Read 2 · finished Mar 3, 2027" (date formatting supplied by the caller). */
export function readLabel(read:ReadEntry,label:(date:string)=>string){return read.open?`Read ${read.number} · in progress`:`Read ${read.number} · finished ${label(read.finishedOn!)}`;}

/** Book fields written by a read-related change; the rest of the record is carried unchanged by the caller. */
export type ReadFields=Pick<Book,'status'|'rating'|'finalThoughts'>&Partial<Pick<Book,'startedOn'|'finishedOn'|'completions'|'cycleId'|'unassignedRating'|'unassignedReview'|'reviewEmojis'|'unassignedEmojis'>>;
export type FinishOpinion={finishedOn:string;rating?:number;review?:string;reviewEmojis:string[]};
/** Deterministic completion ids for one write, so a retried write never creates a second completion. */
export const completionIdFactory=(book:Pick<Book,'id'|'revision'>)=>{let n=0;return ()=>`${book.id}-read-${book.revision}-${n++}`;};

/**
 * The book fields a shelf move writes. Finishing closes the read in progress as one completion (its cycle id) with
 * this read's rating and review; starting again from Finished opens a new read. Older opinions are preserved first.
 */
export function shelfMove(original:Book,next:Book['status'],today:string,details?:FinishOpinion):ReadFields{
 const book=preserveOpinions(original);
 const finishedOn=details?details.finishedOn:book.finishedOn,startedOn=next==='reading'?(book.status==='finished'?today:book.startedOn??today):book.startedOn;
 const closing=next==='finished'?openReadId(book)??newCycleId(book):undefined;
 const completions=nextCompletions(book,{status:next,finishedOn,startedOn:book.startedOn,cycleId:closing},`${today}T00:00:00.000Z`,completionIdFactory(book))
  .map(c=>c.id===closing&&details?{...c,...(details.rating?{rating:details.rating}:{}),...(details.review?{review:details.review}:{}),...(details.reviewEmojis.length?{emojis:details.reviewEmojis.slice(0,3)}:{})}:c);
 const cycleId=closing??(next!=='planned'&&(book.status==='finished'||!openReadId(book))?newCycleId(book):book.cycleId);
 // Book-level dates describe the current read (the server requires finish >= start). Earlier finishes stay in completions.
 const latest=completions.at(-1),dates=next==='finished'&&latest?{startedOn:latest.startedOn,finishedOn:latest.finishedOn}:{startedOn,finishedOn:completions.length?undefined:finishedOn};
 const mirror=completions.length?mirroredOpinions(completions,book):{rating:book.rating,finalThoughts:book.finalThoughts,reviewEmojis:book.reviewEmojis};
 return {status:next,...dates,...(completions.length?{completions}:{}),...(cycleId?{cycleId}:{}),...(book.unassignedRating!==undefined?{unassignedRating:book.unassignedRating}:{}),...(book.unassignedReview?{unassignedReview:book.unassignedReview}:{}),...(book.unassignedEmojis?.length?{unassignedEmojis:book.unassignedEmojis}:{}),rating:mirror.rating,finalThoughts:mirror.finalThoughts,reviewEmojis:mirror.reviewEmojis??[]};
}

export type EditorReads={status:Book['status'];startedOn:string;finishedOn:string;reads:BookCompletion[];rating?:number;review:string;unassigned:{rating?:number;review?:string}};
/**
 * The read-related fields an Edit book save writes. Every finished read is saved as edited; choosing Finished for a
 * book that was not finished closes the read in progress with the form's rating and review; choosing Reading or
 * Paused after Finished opens a new read.
 */
export function editorReadFields(old:Book|undefined,form:EditorReads,book:Pick<Book,'id'|'revision'>,today:string):ReadFields{
 const kept=old?preserveOpinions(old):undefined,wasFinished=old?.status==='finished';
 // A preserved older rating/review leaves the book only when one of its reads now holds that value.
 const held=(k:'rating'|'review',v:unknown)=>form.reads.some(r=>r[k]===v);
 const unassigned={rating:form.unassigned.rating??(kept?.unassignedRating!==undefined&&!held('rating',kept.unassignedRating)?kept.unassignedRating:undefined),review:form.unassigned.review??(kept?.unassignedReview&&!held('review',kept.unassignedReview)?kept.unassignedReview:undefined)};
 const reads=[...form.reads].sort((a,b)=>a.finishedOn.localeCompare(b.finishedOn)||a.recordedAt.localeCompare(b.recordedAt));
 if(reads.some(r=>!validDate(r.finishedOn)||(r.startedOn&&r.startedOn>r.finishedOn)))throw Error('Each read needs a finish date on or after its start date.');
 let completions=reads,cycleId=kept?openReadId(kept):undefined;
 if(form.status==='finished'&&(!wasFinished||!reads.length)){
  const previous=reads.at(-1);if(previous&&form.finishedOn<previous.finishedOn)throw Error('This read has to finish on or after your previous finish.');
  const id=cycleId??newCycleId(book),review=form.review.trim();
  completions=[...reads,{id,finishedOn:form.finishedOn,...(form.startedOn&&form.startedOn<=form.finishedOn?{startedOn:form.startedOn}:{}),recordedAt:`${today}T00:00:00.000Z`,...(form.rating?{rating:form.rating}:{}),...(review?{review}:{})}];cycleId=id;
 }else if(form.status==='finished')cycleId=completions.at(-1)?.id;
 else if((wasFinished||!cycleId)&&(form.status==='reading'||form.status==='paused'))cycleId=newCycleId(book);
 const latest=completions.at(-1),mirror=completions.length?mirroredOpinions(completions,{unassignedRating:unassigned.rating,unassignedReview:unassigned.review}):{rating:form.rating,finalThoughts:form.review.trim()};
 const keptEmojis=kept?.unassignedEmojis?.length?kept.unassignedEmojis:undefined,emojiMirror=completions.findLast(c=>!!c.emojis?.length)?.emojis??keptEmojis;
 return {...(keptEmojis?{unassignedEmojis:keptEmojis}:{}),...(emojiMirror?{reviewEmojis:emojiMirror}:{}),status:form.status,startedOn:form.status==='finished'&&latest?latest.startedOn:form.startedOn,finishedOn:form.status==='finished'?latest?.finishedOn:undefined,...(completions.length?{completions}:{}),...(cycleId?{cycleId}:{}),...(unassigned.rating!==undefined?{unassignedRating:unassigned.rating}:{}),...(unassigned.review?{unassignedReview:unassigned.review}:{}),rating:mirror.rating,finalThoughts:mirror.finalThoughts};
}

/** One read's emojis for statistics. Older book-level emojis on a multi-read book count once, with its latest read. */
export function readEmojis(book:Book,completion:BookCompletion):string[]{
 const own=readOpinion(book,completion).emojis;if(own)return own;
 const all=bookCompletions(book);
 if(all.length>1&&!all.some(c=>c.emojis!==undefined)){const legacy=book.unassignedEmojis?.length?book.unassignedEmojis:book.reviewEmojis??[];return all.at(-1)?.id===completion.id?legacy:[];}
 return [];
}
/** Set (or clear) the emojis of one finished read, keeping the book-level mirror in step. */
export function withReadEmojis(original:Book,readId:string,emojis:string[]):Pick<Book,'completions'|'reviewEmojis'>&Partial<Pick<Book,'unassignedEmojis'>>{
 const book=preserveOpinions(original),clean=emojis.slice(0,3);
 const completions=bookCompletions(book).map(c=>c.id===readId?{...c,emojis:clean}:c);
 return {completions,reviewEmojis:completions.findLast(c=>!!c.emojis?.length)?.emojis??book.unassignedEmojis??[],...(book.unassignedEmojis?.length?{unassignedEmojis:book.unassignedEmojis}:{})};
}
