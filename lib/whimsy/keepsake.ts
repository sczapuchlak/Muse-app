/**
 * Reading keepsake (#50): a shareable PNG of a year (Year in Review) or of all time (Reading Atlas).
 *
 * - Built live from saved records; nothing is stored or uploaded. The image is drawn on a canvas in the browser and
 *   saved to the person's device only.
 * - The person chooses every section. Reviews are private writing, so they are never included unless ticked.
 * - Covers are not drawn: they come from third-party hosts and would taint the canvas.
 */
import type {Book,ReadingGoal,ReadingSession} from './models';
import {readOpinion} from './reading-cycles';
import {completionsIn,type DateRange} from './reading-stats';
import {emojiRanking,genreBreakdown,genrePersona,yearReview} from './reading-dna';
import {challengeFor,challengeProgress} from './reading-challenge';

export const keepsakeSections={numbers:'The numbers',emojis:'Three emojis',personality:'Reading personality',genres:'Top genres',favorites:'Favorite books',challenge:'Reading Challenge',timeline:'Timeline',reviews:'A line from your reviews'} as const;
export type KeepsakeSection=keyof typeof keepsakeSections;
/** Reviews start unticked; everything else starts on. */
export const defaultKeepsakeSections:KeepsakeSection[]=['numbers','emojis','personality','genres','favorites','challenge','timeline'];
export const keepsakeShapes={post:{label:'Post (4:5)',width:1080,height:1350},story:{label:'Story (9:16)',width:1080,height:1920}} as const;
export type KeepsakeShape=keyof typeof keepsakeShapes;

export type KeepsakeContent={title:string;kicker:string;stats:{label:string;value:string}[];emojis:string[];persona:{title:string;line:string}|null;
 genres:{genre:string;share:number}[];favorites:{title:string;author?:string;rating:number}[];challenge:{done:number;target:number}|null;
 timeline:{label:string;value:number}[];reviews:{title:string;text:string}[]};

const fmt=(n:number)=>Math.round(n).toLocaleString('en-US');
const hoursText=(s:number)=>s<3600?`${Math.round(s/60)} min`:`${fmt(s/3600)} h`;
const clip=(text:string,max:number)=>{const t=text.replace(/\s+/g,' ').trim();return t.length<=max?t:`${t.slice(0,max-1).replace(/\s+\S*$/,'')}…`;};
const months=['J','F','M','A','M','J','J','A','S','O','N','D'];

/** Everything a keepsake could show, already filtered by the chosen sections. Pure: safe to test and preview. */
export function keepsakeContent({books,sessions,goals,year,today,include}:{books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];year:string|null;today:string;include:KeepsakeSection[]}):KeepsakeContent{
 const on=(k:KeepsakeSection)=>include.includes(k);const range:DateRange|null=year?{start:`${year}-01-01`,end:`${year}-12-31`}:null;
 const reads=completionsIn(books,range);
 const seconds=year?yearReview(books,sessions,year,today).numbers.seconds:sessions.reduce((n,s)=>n+s.activeSegments.reduce((m,x)=>m+Math.max(0,(Date.parse(x.end)-Date.parse(x.start))/1000),0),0);
 const pages=sessions.filter(s=>!range||(s.date>=range.start&&s.date<=range.end)).reduce((n,s)=>n+s.pages,0);
 const stats=[{label:reads.rereads?'Reads finished':'Books finished',value:fmt(reads.count)},{label:'Pages',value:fmt(pages)},...(seconds?[{label:'Reading time',value:hoursText(seconds)}]:[]),...(reads.rereads?[{label:'Rereads',value:fmt(reads.rereads)}]:[])];
 const persona=genrePersona(books,range);
 const genres=genreBreakdown(books,sessions,range).rows.filter(r=>r.finished).slice(0,3).map(r=>({genre:r.genre,share:r.share}));
 const rated=reads.events.map(e=>({e,o:readOpinion(e.book,e.completion)}));
 const seen=new Set<string>();const favorites=rated.filter(x=>x.o.rating!==undefined).sort((a,b)=>b.o.rating!-a.o.rating!||b.e.completion.finishedOn.localeCompare(a.e.completion.finishedOn))
  .filter(x=>!seen.has(x.e.book.id)&&!!seen.add(x.e.book.id)).slice(0,3).map(x=>({title:x.e.book.title,author:x.e.book.author,rating:x.o.rating!}));
 const goal=year?challengeFor(goals,year):null,progress=goal&&year?challengeProgress(goal,books,year,today):null;
 const timeline=year?months.map((label,i)=>({label,value:reads.events.filter(e=>e.completion.finishedOn.slice(5,7)===String(i+1).padStart(2,'0')).length}))
  :[...new Set(completionsIn(books,null).events.map(e=>e.completion.finishedOn.slice(0,4)))].sort().slice(-10).map(y=>({label:`’${y.slice(2)}`,value:completionsIn(books,{start:`${y}-01-01`,end:`${y}-12-31`}).count}));
 const reviews=rated.filter(x=>x.o.review?.trim()).sort((a,b)=>(b.o.rating??0)-(a.o.rating??0)).slice(0,1).map(x=>({title:x.e.book.title,text:clip(x.o.review!,180)}));
 return {title:year??'All time',kicker:year?(year===today.slice(0,4)?'My year in reading, so far':'My year in reading'):'My reading life',
  stats:on('numbers')?stats:[],emojis:on('emojis')?emojiRanking(books,range).ranking.slice(0,3).map(e=>e.emoji):[],
  persona:on('personality')&&'title' in persona?{title:persona.title,line:persona.line}:null,genres:on('genres')?genres:[],favorites:on('favorites')?favorites:[],
  challenge:on('challenge')&&progress?{done:progress.done,target:progress.target}:null,timeline:on('timeline')&&timeline.some(t=>t.value)?timeline:[],reviews:on('reviews')?reviews:[]};
}

// ---------- Drawing (browser only) ----------
type Palette={a:string;b:string;ink:string;muted:string;bg1:string;bg2:string;serif:string;sans:string};
/** Theme accents resolved to colors the canvas accepts (tokens may be color-mix() or vars); falls back safely. */
function palette(ctx:CanvasRenderingContext2D):Palette{
 const css=getComputedStyle(document.documentElement),font=(name:string,fallback:string)=>css.getPropertyValue(name).trim()||fallback;
 const color=(name:string,fallback:string)=>{const probe=document.createElement('span');probe.style.color=`var(${name}, ${fallback})`;probe.hidden=true;document.body.append(probe);
  const resolved=getComputedStyle(probe).color;probe.remove();
  ctx.fillStyle=fallback;ctx.fillStyle=resolved;return String(ctx.fillStyle);}; // an unsupported value leaves the fallback in place
 return {a:color('--accent-primary','#b48cff'),b:color('--accent-secondary','#6fe3e1'),ink:'#fbf7ff',muted:'rgba(251,247,255,.72)',bg1:'#120c2b',bg2:'#2a1650',serif:font('--font-editorial','Georgia, serif'),sans:font('--font-ui','Helvetica, Arial, sans-serif')};
}
/** Deterministic sparkle: the same keepsake always gets the same sky. */
function rng(seed:string){let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h=Math.imul(h^h>>>15,2246822507);h=Math.imul(h^h>>>13,3266489909);return ((h^=h>>>16)>>>0)/4294967296;};}
function star(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){
 ctx.save();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=r*2;ctx.beginPath();
 for(let i=0;i<8;i++){const ang=i*Math.PI/4,len=i%2?r*.32:r;ctx.lineTo(x+Math.cos(ang)*len,y+Math.sin(ang)*len);}ctx.closePath();ctx.fill();ctx.restore();
}
function wrap(ctx:CanvasRenderingContext2D,text:string,width:number,maxLines:number){
 const words=text.split(' '),lines:string[]=[];let line='';
 for(const w of words){const next=line?`${line} ${w}`:w;if(ctx.measureText(next).width>width&&line){lines.push(line);line=w;}else line=next;}
 if(line)lines.push(line);
 if(lines.length>maxLines){lines.length=maxLines;lines[maxLines-1]=`${lines[maxLines-1].replace(/\s+\S*$/,'')}…`;}
 return lines;
}

/** Draws the keepsake onto a canvas sized for the chosen shape. Returns the sections that had data but did not fit. */
export function drawKeepsake(canvas:HTMLCanvasElement,content:KeepsakeContent,shape:KeepsakeShape,name?:string):KeepsakeSection[]{
 const {width:W,height:H}=keepsakeShapes[shape];canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)return [];const skipped:KeepsakeSection[]=[];const p=palette(ctx),rand=rng(`${content.title}:${shape}`),pad=84,inner=W-pad*2;
 // Sky
 const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,p.bg1);g.addColorStop(1,p.bg2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 for(const [x,y,r,c] of [[W*.85,H*.08,W*.55,p.a],[W*.1,H*.9,W*.6,p.b]] as const){ctx.save();ctx.globalAlpha=.32;const glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,c);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);ctx.restore();}
 for(let i=0;i<90;i++){ctx.globalAlpha=.25+rand()*.6;ctx.fillStyle=rand()>.5?p.ink:p.b;ctx.beginPath();ctx.arc(rand()*W,rand()*H,rand()*2.2+.4,0,Math.PI*2);ctx.fill();}
 ctx.globalAlpha=1;for(let i=0;i<6;i++)star(ctx,rand()*W,rand()*H,10+rand()*16,[p.ink,p.a,p.b][i%3]);
 let y=pad+20;
 ctx.textBaseline='alphabetic';ctx.fillStyle=p.muted;ctx.font=`600 30px ${p.sans}`;ctx.fillText(content.kicker.toUpperCase(),pad,y);y+=128;
 ctx.fillStyle=p.ink;ctx.font=`italic 400 ${content.title.length>4?118:150}px ${p.serif}`;ctx.fillText(content.title,pad-4,y);y+=40;
 const section=(label:string)=>{y+=56;ctx.fillStyle=p.b;ctx.font=`600 24px ${p.sans}`;ctx.fillText(label.toUpperCase(),pad,y);y+=16;};
 const room=(need:number,k?:KeepsakeSection)=>{const ok=y+need<H-pad-60;if(!ok&&k)skipped.push(k);return ok;};
 if(content.stats.length&&room(150,'numbers')){y+=50;const cols=content.stats.length,cw=inner/cols;
  content.stats.forEach((s,i)=>{const x=pad+i*cw;ctx.fillStyle=p.ink;ctx.font=`500 ${cols>3?60:72}px ${p.sans}`;ctx.fillText(s.value,x,y+64);ctx.fillStyle=p.muted;ctx.font=`400 26px ${p.sans}`;ctx.fillText(s.label,x,y+104);});y+=120;}
 if(content.emojis.length&&room(170,'emojis')){section('In three emojis');ctx.font=`110px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;ctx.fillText(content.emojis.join(' '),pad,y+118);y+=136;}
 if(content.persona&&room(170,'personality')){section('Reading personality');ctx.fillStyle=p.ink;ctx.font=`italic 400 58px ${p.serif}`;ctx.fillText(content.persona.title,pad,y+62);y+=74;
  ctx.fillStyle=p.muted;ctx.font=`400 30px ${p.sans}`;for(const l of wrap(ctx,content.persona.line,inner,2)){y+=40;ctx.fillText(l,pad,y);}}
 if(content.challenge&&room(130,'challenge')){section('Reading Challenge');const {done,target}=content.challenge,pct=Math.min(1,done/target);y+=30;
  ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.roundRect(pad,y,inner,22,11);ctx.fill();
  const bar=ctx.createLinearGradient(pad,0,pad+inner,0);bar.addColorStop(0,p.a);bar.addColorStop(1,p.b);ctx.fillStyle=bar;ctx.beginPath();ctx.roundRect(pad,y,Math.max(22,inner*pct),22,11);ctx.fill();
  ctx.fillStyle=p.ink;ctx.font=`500 32px ${p.sans}`;ctx.fillText(`${done} of ${target} books${done>=target?'  ✦ complete':''}`,pad,y+70);y+=80;}
 if(content.genres.length&&room(110,'genres')){section('Top genres');ctx.fillStyle=p.ink;ctx.font=`400 36px ${p.sans}`;y+=50;ctx.fillText(content.genres.map(g=>`${g.genre} ${g.share}%`).join('  ·  '),pad,y,inner);}
 if(content.favorites.length&&room(100+content.favorites.length*52,'favorites')){section('Favorites');for(const f of content.favorites){y+=54;ctx.fillStyle=p.ink;ctx.font=`italic 400 38px ${p.serif}`;const t=wrap(ctx,f.title,inner-150,1)[0];ctx.fillText(t,pad,y);
  ctx.fillStyle=p.a;ctx.font=`500 30px ${p.sans}`;ctx.textAlign='right';ctx.fillText(`${f.rating}/5`,W-pad,y);ctx.textAlign='left';}}
 if(content.reviews.length&&room(190,'reviews')){section(`On ${content.reviews[0].title}`);ctx.fillStyle=p.ink;ctx.font=`italic 400 34px ${p.serif}`;for(const l of wrap(ctx,`“${content.reviews[0].text}”`,inner,3)){y+=46;ctx.fillText(l,pad,y);}}
 if(content.timeline.length&&room(190,'timeline')){section('Finished, over time');const max=Math.max(1,...content.timeline.map(t=>t.value)),n=content.timeline.length,bw=inner/n,base=y+140;
  content.timeline.forEach((t,i)=>{const h=t.value?Math.max(8,(t.value/max)*110):3,x=pad+i*bw+bw*.18,w=bw*.64;const grd=ctx.createLinearGradient(0,base-h,0,base);grd.addColorStop(0,p.a);grd.addColorStop(1,p.b);
   ctx.fillStyle=t.value?grd:'rgba(255,255,255,.2)';ctx.beginPath();ctx.roundRect(x,base-h,w,h,6);ctx.fill();ctx.fillStyle=p.muted;ctx.font=`400 22px ${p.sans}`;ctx.textAlign='center';ctx.fillText(t.label,x+w/2,base+32);ctx.textAlign='left';});y=base+40;}
 // Signature
 ctx.fillStyle=p.muted;ctx.font=`400 26px ${p.sans}`;ctx.fillText(name?`${name} · made with Muse`:'Made with Muse',pad,H-pad+10);star(ctx,W-pad-14,H-pad,14,p.a);
 return skipped;
}
