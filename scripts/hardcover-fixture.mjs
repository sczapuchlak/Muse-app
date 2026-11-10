// Local-only Hardcover GraphQL stand-in for authenticated UI QA of Books & Series (#136).
// Shapes follow Hardcover's published schema; values are fixtures, never shipped. Covers are public Open Library
// images by ISBN. Run: node scripts/hardcover-fixture.mjs [port]  and start `next dev` with
// HARDCOVER_API_KEY=fixture HARDCOVER_API_URL=http://127.0.0.1:<port>/graphql
import {createServer} from 'node:http';

const port=Number(process.argv[2]??4555);
const cover=isbn=>isbn?{url:`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,color:null}:null;
const sjm={name:'Sarah J. Maas'};
const tags=g=>({Genre:g.map(tag=>({tag,count:10}))});
const books=[
 // Throne of Glass (series 100)
 {id:1001,title:'The Assassin and the Pirate Lord',release_date:'2012-01-01',pages:77,series:[[100,0.1,true]],image:{url:null,color:'#2f4c6e'}},
 {id:1002,title:'The Assassin and the Healer',release_date:'2012-03-01',pages:40,series:[[100,0.2,true]],image:{url:null,color:'#b25b2b'}},
 {id:1003,title:'The Assassin and the Desert',release_date:'2012-05-01',pages:110,series:[[100,0.3,true]],image:{url:null,color:'#8a6a3a'}},
 {id:1004,title:'The Assassin and the Underworld',release_date:'2012-07-01',pages:104,series:[[100,0.4,true]]},
 {id:1005,title:'The Assassin and the Empire',release_date:'2012-08-01',pages:96,series:[[100,0.5,true]]},
 {id:1010,title:'Throne of Glass',isbn:'9781599906959',release_date:'2012-08-07',pages:404,series:[[100,1,true]],description:'Meet Celaena Sardothien. Beautiful. Deadly. Destined for greatness.\n\nIn the dark, filthy salt mines of Endovier, an eighteen-year-old girl is serving a life sentence. She is a trained assassin, the best of her kind, but she made a fatal mistake. She got caught.\n\nYoung Captain Westfall offers her a deal: her freedom in exchange for one huge sacrifice. Celaena must represent the prince in a to-the-death tournament—fighting the most gifted thieves and assassins in the land.',genres:['Fantasy','Young Adult','Romance']},
 {id:1011,title:'Crown of Midnight',isbn:'9781619630628',release_date:'2013-08-27',pages:418,series:[[100,2,true]]},
 {id:1012,title:'Heir of Fire',isbn:'9781619630659',release_date:'2014-09-02',pages:565,series:[[100,3,true]]},
 {id:1013,title:'Queen of Shadows',isbn:'9781619636040',release_date:'2015-09-01',pages:648,series:[[100,4,true]]},
 {id:1014,title:'Empire of Storms',isbn:'9781619636071',release_date:'2016-09-06',pages:693,series:[[100,5,true]]},
 {id:1015,title:'Tower of Dawn',isbn:'9781681195773',release_date:'2017-09-05',pages:664,series:[[100,6,true]]},
 {id:1016,title:'Kingdom of Ash',isbn:'9781619636101',release_date:'2018-10-23',pages:980,series:[[100,7,true]]},
 {id:1020,title:"The Assassin's Blade",isbn:'9781619632116',release_date:'2014-03-04',pages:435,series:[[100,0.1,true,true]]},
 // A Court of Thorns and Roses (series 200)
 {id:2001,title:'A Court of Thorns and Roses',isbn:'9781619634442',release_date:'2015-05-05',pages:419,series:[[200,1,true]],description:'When nineteen-year-old huntress Feyre kills a wolf in the woods, a terrifying creature arrives to demand retribution. Dragged to a treacherous magical land she knows about only from legends, Feyre discovers that her captor is not truly a beast, but one of the lethal, immortal faeries who once ruled her world.',genres:['Fantasy','Romance']},
 {id:2002,title:'A Court of Mist and Fury',isbn:'9781619634466',release_date:'2016-05-03',pages:626,series:[[200,2,true]],description:'Feyre has undergone more trials than one human woman can carry in her heart. Though she’s now been granted the powers and lifespan of the High Fae, she is haunted by her time Under the Mountain.',genres:['Fantasy','Romance']},
 {id:2003,title:'A Court of Wings and Ruin',isbn:'9781619634480',release_date:'2017-05-02',pages:699,series:[[200,3,true]]},
 {id:2004,title:'A Court of Frost and Starlight',isbn:'9781681196312',release_date:'2018-05-01',pages:229,series:[[200,3.1,true]]},
 {id:2005,title:'A Court of Silver Flames',isbn:'9781681196282',release_date:'2021-02-16',pages:757,series:[[200,4,true]]},
 {id:2006,title:'A Court of Thorns and Roses Book Six',release_date:'2027-01-12',series:[[200,5,true]]},
 {id:2010,title:'A Court of Thorns and Roses Paperback Box Set',release_date:'2020-06-02',series:[[200,1,true,true]],image:{url:null,color:'#9c2d3f'}},
].map(b=>({...b,image:b.image?.url!==undefined?b.image:cover(b.isbn),contributions:[{author:sjm}],canonical_id:null,release_year:Number(b.release_date.slice(0,4)),cached_tags:tags(b.genres??['Fantasy'])}));
const series=[
 {id:100,name:'Throne of Glass',description:'Celaena Sardothien, a teenage assassin, is offered a chance at freedom—if she will become the King’s Champion in a deadly tournament.',is_completed:true,author:sjm},
 {id:200,name:'A Court of Thorns and Roses',description:'A sweeping romantic fantasy of faerie courts, curses and the bonds that hold a world together.',is_completed:false,author:sjm},
];
const rows=s=>books.flatMap(b=>b.series.filter(([id])=>id===s.id).map(([,position,featured,compilation])=>({position,featured,compilation:!!compilation,book:b})));
const norm=x=>String(x??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hit=s=>{const all=rows(s);return {id:s.id,name:s.name,author:s.author,books_count:all.length,primary_books_count:all.filter(r=>!r.compilation&&Number.isInteger(r.position)).length,book_series:all.filter(r=>!r.compilation).sort((a,b)=>a.position-b.position).slice(0,10).map(r=>({position:r.position,book:{title:r.book.title,image:r.book.image}}))};};
const bookOut=b=>({id:b.id,title:b.title,description:b.description??null,release_date:b.release_date,release_year:b.release_year,pages:b.pages??null,canonical_id:null,image:b.image,cached_tags:b.cached_tags,contributions:b.contributions,book_series:b.series.map(([series_id,position,featured,compilation])=>({series_id,position,featured,compilation:!!compilation,series:hit(series.find(s=>s.id===series_id))}))});
const matches=q=>{const t=norm(q);return books.filter(b=>norm(b.title).includes(t)||t.split(' ').every(w=>norm(b.title).includes(w))).map(b=>b.id);};
function answer({query,variables}){
 if(query.includes('bookHits:search'))return {bookHits:{ids:matches(variables.query).slice(0,12)},seriesHits:{ids:series.filter(s=>norm(s.name).includes(norm(variables.query))||norm(variables.query).includes(norm(s.name))).map(s=>s.id)}};
 if(query.includes('query_type:"series"'))return {search:{ids:series.filter(s=>norm(s.name).includes(norm(variables.query))).map(s=>s.id)}};
 if(query.includes('query_type:"book"'))return {search:{ids:matches(variables.query).slice(0,8)}};
 if(query.includes('editions(where'))return {editions:books.filter(b=>b.isbn===variables.isbn).map(b=>({book_id:b.id}))};
 if(query.includes('series_by_pk')){const s=series.find(x=>x.id===variables.id);return {series_by_pk:s?{...s,...hit(s),book_series:rows(s).map(r=>({position:r.position,featured:r.featured,compilation:r.compilation,book:bookOut(r.book)}))}:null};}
 const out={};
 if(query.includes('books(where')){const ids=variables.ids??variables.bookIds??[];out.books=books.filter(b=>ids.includes(b.id)).map(bookOut);}
 if(query.includes('series(where')){const ids=variables.ids??variables.seriesIds??[];out.series=series.filter(s=>ids.includes(s.id)).map(hit);}
 return out;
}
createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{try{const data=answer(JSON.parse(body));res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({data}));}catch(e){res.writeHead(400);res.end(JSON.stringify({errors:[{message:String(e)}]}));}});}).listen(port,'127.0.0.1',()=>console.log(`Hardcover fixture on http://127.0.0.1:${port}/graphql`));
