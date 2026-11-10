import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';

const {createSeriesResolver}=load('lib/books/series-discovery');
const {planSeriesCatalog,matchCatalogBook}=load('lib/books/series-catalog');
const {seriesBadgesForResult,savedSeriesBadgesForResult}=load('lib/books/series-search');
const {seriesProgress}=load('lib/collections/models');
const response=data=>({ok:true,json:async()=>({data})});
const seed={title:'A Court of Thorns and Roses',author:'Sarah J. Maas',isbn:'9781635575552'};

test('Hardcover is first and stores ordered lightweight references, fractional positions, and source counts',async()=>{
 const calls=[];
 const resolver=createSeriesResolver({hardcoverKey:()=> 'mock-token',fetcher:async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});const q=JSON.parse(init.body).query;
  if(q.includes('editions(where:'))return response({editions:[{book_id:11}]});
  if(q.includes('books(where:'))return response({books:[{id:11,title:seed.title,contributions:[{author:{name:seed.author}}],book_series:[{series_id:22,featured:true}]}]});
  return response({series_by_pk:{id:22,name:'A Court of Thorns and Roses',description:'Series description',books_count:9,primary_books_count:6,author:{name:seed.author},book_series:[{position:1,featured:true,compilation:false,book:{id:11,title:seed.title,release_date:'2015-05-05',contributions:[]}},{position:2.1,featured:false,compilation:false,book:{id:12,title:'A related novella',release_date:null,contributions:[]}}]}});
 }});
 const catalog=await resolver.resolve(seed);
 assert.equal(catalog.source,'hardcover');assert.equal(catalog.primaryCount,6);assert.equal(catalog.totalCount,9);assert.deepEqual(catalog.members.map(m=>m.position),[1,2.1]);assert.equal(catalog.members[1].role,'optional');assert.ok(calls.every(c=>c.url.includes('api.hardcover.app')));
 await resolver.resolve(seed);assert.equal(calls.length,3,'a second open uses the in-process cache');
 await resolver.resolve(seed,{refresh:true});assert.equal(calls.length,6,'explicit refresh refetches');
});

test('series name search is distinct from book lookup and returns stable catalog IDs',async()=>{
 const queries=[];const resolver=createSeriesResolver({hardcoverKey:()=> 'mock-token',fetcher:async(_url,init)=>{const query=JSON.parse(init.body).query;queries.push(query);return response(query.includes('search(')?{search:{ids:[44]}}:{series:[{id:44,name:'Dungeon Crawler Carl',books_count:8,primary_books_count:8,author:{name:'Matt Dinniman'}}]});}});
 const hits=await resolver.searchSeries('Dungeon Crawler Carl');assert.deepEqual(hits.map(h=>h.id),['44']);assert.match(queries[0],/query_type:"series"/);
});

test('one bounded catalog search adds a book badge and a separate series result',async()=>{
 const queries=[];const resolver=createSeriesResolver({hardcoverKey:()=> 'mock-token',fetcher:async(_url,init)=>{const query=JSON.parse(init.body).query;queries.push(query);return response(query.includes('bookHits:search')?{bookHits:{ids:[11]},seriesHits:{ids:[22]}}:{books:[{id:11,title:'A Court of Mist and Fury',contributions:[{author:{name:'Sarah J. Maas'}}],book_series:[{position:2,featured:true,compilation:false,series:{id:22,name:'A Court of Thorns and Roses',primary_books_count:6,books_count:8,author:{name:'Sarah J. Maas'}}}]}],series:[{id:22,name:'A Court of Thorns and Roses',primary_books_count:6,books_count:8,author:{name:'Sarah J. Maas'}}]});}});
 const result=await resolver.searchCatalog('A Court of Mist and Fury');assert.equal(queries.length,2,'one search and one batch detail request');assert.match(queries[0],/query_type:"book"/);assert.match(queries[0],/query_type:"series"/);assert.equal(result.bookSeries[0].position,2);assert.equal(result.bookSeries[0].series.primaryCount,6);assert.equal(result.results[0].title,'A Court of Thorns and Roses');
 assert.equal(seriesBadgesForResult('A Court of Mist and Fury',['Sarah J. Maas'],result.bookSeries).length,1);
 assert.equal(seriesBadgesForResult('A Court of Mist and Fury',['Another Author'],result.bookSeries).length,0,'ambiguous title alone does not create a badge');
 const manual=[{bookId:'owned-1',bookTitle:'A Court of Mist and Fury',bookAuthor:'Sarah J. Maas',seriesId:'saved-1',title:'A Court of Thorns and Roses',position:2,primaryCount:6,totalCount:8}];
 assert.equal(savedSeriesBadgesForResult('A Court of Mist and Fury',['Sarah J. Maas'],manual)[0].seriesId,'saved-1','an owned book keeps its saved series badge without Hardcover');
});

test('without a Hardcover key, Wikidata can supply ordered works without edition requests',async()=>{
 const calls=[];const resolver=createSeriesResolver({hardcoverKey:()=>undefined,fetcher:async(url)=>{calls.push(url);const q=new URL(url).searchParams.get('query')??'';return {ok:true,json:async()=>q.includes('SELECT ?series')?{results:{bindings:[{series:{value:'https://www.wikidata.org/entity/Q5'},title:{value:'Sample Series'}}]}}:{results:{bindings:[{book:{value:'https://www.wikidata.org/entity/Q9'},title:{value:'First Book'},ordinal:{value:'0.1'},ol:{value:'OL123W'}}]}}};}});
 const catalog=await resolver.resolve({title:'First Book',author:'Writer',workKey:'/works/OL123W'});assert.equal(catalog.source,'wikidata');assert.equal(catalog.members[0].position,0.1);assert.ok(calls.every(url=>url.includes('wikidata.org')),'no Google Books or edition request occurs during discovery');
});

test('catalog refresh preserves manual corrections, hidden associations, and canonical Library books',()=>{
 const owned={id:'book-1',title:'First Book',author:'Writer',status:'finished',reviewEmojis:[],completions:[{id:'read-1',finishedOn:'2026-01-01'}]};
 const catalog={source:'hardcover',id:'series-1',title:'Series',complete:false,members:[{source:'hardcover',id:'1',title:'First Book',author:'Writer',position:1,positionLabel:'1'},{source:'hardcover',id:'2',title:'Second Book',author:'Writer',position:2,positionLabel:'2'}]};
 const manual={id:'m1',series_id:'s1',book_id:'book-1',catalog_source:'hardcover',catalog_id:'1',catalog_title:'My preferred title',catalog_author:'Writer',sequence:0.5,position_known:true,manual_override:true,hidden:false,role:'mainline',release_state:'released',starred:false,revision:2};
 const hidden={...manual,id:'m2',book_id:null,catalog_id:'2',catalog_title:'Second Book',sequence:2,hidden:true};
 const plan=planSeriesCatalog(catalog,[manual,hidden],[owned]);assert.equal(plan.length,2);assert.equal(plan[0].existing.id,'m1');assert.equal(plan[0].fields.sequence,0.5);assert.equal(plan[0].fields.catalog_title,'My preferred title');assert.equal(plan[0].fields.book_id,'book-1');assert.equal(plan[1].fields.hidden,true);assert.equal(plan[1].fields.book_id,null);
 assert.equal(matchCatalogBook(catalog.members[0],[owned]).id,'book-1');
 const summary=seriesProgress({id:'s1',scope:'released',conclusion_state:'unknown'},[manual,hidden],[owned],[]);assert.equal(summary.inLibrary,1);assert.equal(summary.readKnown,1);assert.equal(summary.knownTotal,1,'removed installment is absent from progress');
});
