import {validDate} from '@/lib/dates';
import {queryIsbn,mapFormat} from './metadata';

export type GoodreadsRow={source?:string;sourceId?:string;title:string;author?:string;isbn?:string;publisher?:string;publishedDate?:string;description?:string;coverUrl?:string;pages?:number;status?:'planned'|'reading'|'finished'|'paused';startedOn?:string;finishedOn?:string;addedOn?:string;rating?:number;review?:string;notes?:string;genre?:string;currentPage?:number;format?:'physical'|'ebook'|'audiobook';seriesName?:string;seriesPosition?:number;sourceDetails?:Record<string,string>;shelves:string[];warnings:string[]};
/** Goodreads sometimes wraps ISBNs as spreadsheet formulas to preserve leading zeroes. */
function isbnValue(value:string){const s=value.trim();return s.match(/^="([\dXx -]+)"$/)?.[1]??s;}
export function detectGoodreads(headers:readonly string[]){const normalized=headers.map(h=>h.trim().toLowerCase()),names=new Set(normalized);return names.size===normalized.length&&['book id','title','author','exclusive shelf'].every(h=>names.has(h));}
export function readGoodreadsRow(headers:readonly string[],cells:readonly string[]):GoodreadsRow{
 const values=new Map(headers.map((header,i)=>[header.trim().toLowerCase(),cells[i]?.trim()??'']));
 const get=(name:string)=>values.get(name)??'',warnings:string[]=[];
 const date=get('date read').replaceAll('/','-'),finishedOn=date&&validDate(date)?date:undefined;
 if(date&&!finishedOn)warnings.push('Finish date needs review.');
 const shelf=get('exclusive shelf').toLowerCase();
 const status=({read:'finished','currently-reading':'reading','to-read':'planned'} as const)[shelf as 'read'|'currently-reading'|'to-read'];
 if(shelf&&!status)warnings.push('Reading status needs review.');
 const number=Number(get('my rating')),rating=number>=1&&number<=5&&Number.isInteger(number)?number:undefined;
 if(get('my rating')&&get('my rating')!=='0'&&!rating)warnings.push('Rating needs review.');
 const pageCount=Number(get('number of pages')),pages=Number.isInteger(pageCount)&&pageCount>0&&pageCount<100000?pageCount:undefined;
 const isbn=queryIsbn(isbnValue(get('isbn13')))||queryIsbn(isbnValue(get('isbn')));
 const sourceDetails:Record<string,string>={};for(const name of ['read count','owned copies','original publication year','binding'])if(get(name))sourceDetails[name]=get(name);
 if(date&&!finishedOn)sourceDetails['date read']=get('date read');if(shelf&&!status)sourceDetails['exclusive shelf']=shelf;if(get('my rating')&&get('my rating')!=='0'&&rating===undefined)sourceDetails['my rating']=get('my rating');
 if((get('isbn13')||get('isbn'))&&!isbn){sourceDetails.isbn=get('isbn13')||get('isbn');warnings.push('ISBN could not be verified; title and author will be used for matching.');}
 if(get('number of pages')&&!pages){sourceDetails.pages=get('number of pages');warnings.push('Page count could not be mapped.');}
 return {source:'goodreads',sourceId:get('book id')||undefined,title:get('title'),author:get('author')||undefined,isbn,publisher:get('publisher')||undefined,publishedDate:get('year published')||undefined,addedOn:get('date added').replaceAll('/','-')||undefined,pages,status,finishedOn,rating,review:get('my review')||undefined,notes:get('private notes')||undefined,format:mapFormat(get('binding')).format,...(Object.keys(sourceDetails).length?{sourceDetails}:{}),shelves:get('bookshelves').split(',').map(s=>s.trim()).filter(Boolean),warnings};
}
