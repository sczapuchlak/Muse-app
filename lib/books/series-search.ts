import type {BookSeriesHit} from './series-discovery';

export type SavedSeriesBadge={bookId:string;bookTitle:string;bookAuthor:string;seriesId:string;title:string;position:number|null;primaryCount:number|null;totalCount:number|null};

const normalize=(value:string)=>value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

/** A catalog badge is shown only when title and author identify one Hardcover work. */
export function seriesBadgesForResult(title:string,authors:string[],matches:BookSeriesHit[]):BookSeriesHit[]{
 const name=normalize(title),byTitle=matches.filter(match=>normalize(match.title)===name);
 const byAuthor=authors.length?byTitle.filter(match=>authors.some(author=>normalize(author)===normalize(match.author))):byTitle;
 if(new Set(byAuthor.map(match=>match.bookId)).size!==1)return [];
 return byAuthor.sort((a,b)=>Number(b.featured)-Number(a.featured));
}

export function savedSeriesBadgesForResult(title:string,authors:string[],badges:SavedSeriesBadge[]):SavedSeriesBadge[]{
 const name=normalize(title),byTitle=badges.filter(badge=>normalize(badge.bookTitle)===name);
 const byAuthor=authors.length?byTitle.filter(badge=>authors.some(author=>normalize(author)===normalize(badge.bookAuthor))):byTitle;
 return new Set(byAuthor.map(badge=>badge.bookId)).size===1?byAuthor:[];
}
