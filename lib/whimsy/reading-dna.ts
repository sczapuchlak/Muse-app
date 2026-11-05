/**
 * Reading DNA, superlatives, habits, emojis, personality, milestones and Year in Review. Deterministic and derived
 * only from saved books, completions and sessions (docs/PRODUCT_RULES.md "Reading DNA and Year in Review").
 *
 * - Periods filter completions by finish date and sessions by their saved local date.
 * - Genres: a book counts fully in each of its genres (shares can add up to more than 100%). Names group
 *   case-insensitively. "Finished" genre counts use unique books finished in the period; "reads" count completions.
 *   Genre time and pages come from that period's sessions of books tagged with the genre (session date decides).
 * - Favorites are three separate answers: most completed reads, most active time, most pages. Ties go to the genre
 *   with the most recent activity, then alphabetical.
 * - Emojis: each book counts each emoji once (same emoji with/without the emoji-style selector is one; skin tones
 *   stay distinct). A period counts each book once, even when it was finished several times in that period. Only
 *   books with a finished read in the period count. Ties: more recent finish first, then the earlier slot it was
 *   chosen in on that book (first emoji first), then the emoji itself.
 * - Habits: weekday and month use reading days (time split at local midnight); reading hour uses timed sessions
 *   only (manual entries have no reliable clock time), split across local hours in each session's own time zone.
 *   Most consistent month = highest share of its days with reading; a month needs at least 14 eligible days
 *   (the current month counts days elapsed so far).
 * - Personality: genre label needs at least 5 finished books with a genre; behavior traits need their own minimum
 *   data (listed with each rule). Every result carries the evidence it was based on.
 * - Milestones: reached on the first date the saved history crosses the threshold. They are recalculated after
 *   every edit; celebration state only remembers which ones were already shown.
 */
import {shiftDate,validDate,validTimeZone} from '@/lib/dates';
import {readingByDay} from './integrations';
import type {Book,ReadingSession} from './models';
import {bookGenres,emojiKey,genreKey} from './books';
import {averageSessionSeconds,completionEvents,inclusiveCalendarDays,longestSession,sessionSeconds,type DateRange} from './reading-stats';
import {readOpinion} from './reading-cycles';

const within=(date:string,range:DateRange|null)=>!range||(date>=range.start&&date<=range.end);
const pct=(part:number,whole:number)=>whole>0?Math.round(part/whole*100):0;
export const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;
export const weekdayIndex=(date:string)=>(new Date(`${date}T12:00:00Z`).getUTCDay()+6)%7;
const daysInMonth=(month:string)=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
export const yearRange=(year:string):DateRange=>({start:`${year}-01-01`,end:`${year}-12-31`});

/** Completed reads finishing in the range, newest first. */
export function readsIn(books:Book[],range:DateRange|null){return completionEvents(books).filter(e=>within(e.completion.finishedOn,range)).sort((a,b)=>b.completion.finishedOn.localeCompare(a.completion.finishedOn)||a.book.title.localeCompare(b.book.title));}
const sessionsIn=(sessions:ReadingSession[],range:DateRange|null)=>sessions.filter(s=>within(s.date,range));

// ---------- Genres ----------
export type GenreRow={key:string;genre:string;finished:number;reads:number;seconds:number;pages:number;share:number;lastActivity:string};
export function genreBreakdown(books:Book[],sessions:ReadingSession[],range:DateRange|null){
 const reads=readsIn(books,range),finishedIds=new Set(reads.map(e=>e.book.id)),byId=new Map(books.map(b=>[b.id,b]));
 const rows=new Map<string,GenreRow&{spellings:Map<string,number>;books:Set<string>}>();
 const row=(name:string)=>{const key=genreKey(name);let r=rows.get(key);if(!r){r={key,genre:name,finished:0,reads:0,seconds:0,pages:0,share:0,lastActivity:'',spellings:new Map(),books:new Set()};rows.set(key,r);}r.spellings.set(name,(r.spellings.get(name)??0)+1);return r;};
 for(const e of reads)for(const g of bookGenres(e.book)){const r=row(g);r.reads++;r.books.add(e.book.id);if(e.completion.finishedOn>r.lastActivity)r.lastActivity=e.completion.finishedOn;}
 for(const s of sessionsIn(sessions,range)){const book=byId.get(s.bookId);if(!book)continue;for(const g of bookGenres(book)){const r=row(g);r.seconds+=sessionSeconds(s);r.pages+=s.pages;if(s.date>r.lastActivity)r.lastActivity=s.date;}}
 const untagged=[...finishedIds].filter(id=>!bookGenres(byId.get(id)!).length).length;
 const list=[...rows.values()].map(({spellings,books:ids,...r})=>({...r,genre:[...spellings].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0],finished:ids.size,share:pct(ids.size,finishedIds.size)}));
 return {rows:list.sort((a,b)=>b.finished-a.finished||b.seconds-a.seconds||b.pages-a.pages||a.genre.localeCompare(b.genre)),finishedBooks:finishedIds.size,untagged,overlapping:list.reduce((n,r)=>n+r.finished,0)>finishedIds.size};
}
const pick=(rows:GenreRow[],value:(r:GenreRow)=>number)=>[...rows].filter(r=>value(r)>0).sort((a,b)=>value(b)-value(a)||b.lastActivity.localeCompare(a.lastActivity)||a.genre.localeCompare(b.genre))[0]??null;
/** Three separate favorites; none is inferred from another. */
export function favoriteGenres(rows:GenreRow[]){return {mostRead:pick(rows,r=>r.reads),mostTime:pick(rows,r=>r.seconds),mostPages:pick(rows,r=>r.pages)};}

// ---------- Emojis ----------
export type EmojiCount={emoji:string;books:number;lastUse:string;slot:number};
export function emojiRanking(books:Book[],range:DateRange|null){
 const latest=new Map<string,string>();for(const e of readsIn(books,range)){const prev=latest.get(e.book.id);if(!prev||e.completion.finishedOn>prev)latest.set(e.book.id,e.completion.finishedOn);}
 const counts=new Map<string,EmojiCount>();let withEmojis=0;
 for(const book of books){const last=latest.get(book.id);if(!last)continue;const keys=new Map<string,string>();for(const e of book.reviewEmojis??[])if(!keys.has(emojiKey(e)))keys.set(emojiKey(e),e);if(keys.size)withEmojis++;
  [...keys.keys()].forEach((key,slot)=>{const c=counts.get(key)??{emoji:keys.get(key)!,books:0,lastUse:'',slot};c.books++;if(last>c.lastUse||(last===c.lastUse&&slot<c.slot)){c.lastUse=last;c.slot=slot;}counts.set(key,c);});}
 return {ranking:[...counts.values()].sort((a,b)=>b.books-a.books||b.lastUse.localeCompare(a.lastUse)||a.slot-b.slot||a.emoji.localeCompare(b.emoji)),booksWithEmojis:withEmojis,finishedBooks:latest.size};
}
/** The three emojis on the most books finished in a year (each book once, however many times it was finished). */
export function yearInThreeEmojis(books:Book[],year:string){const r=emojiRanking(books,yearRange(year));return {top:r.ranking.slice(0,3),booksWithEmojis:r.booksWithEmojis,finishedBooks:r.finishedBooks};}

// ---------- Habits ----------
const clocks=new Map<string,Intl.DateTimeFormat>();
function localClock(ms:number,timeZone:string){let f=clocks.get(timeZone);if(!f){f=new Intl.DateTimeFormat('en-US',{timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});clocks.set(timeZone,f);}
 const p=Object.fromEntries(f.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return {hour:Number(p.hour)%24,minute:Number(p.minute),second:Number(p.second)};}
/** Active seconds per local hour (0–23) from timed sessions only, split at each local hour boundary. */
export function hourlySeconds(sessions:ReadingSession[]){
 const hours=Array<number>(24).fill(0);
 for(const s of sessions){if(s.manual)continue;const zone=validTimeZone(s.timeZone)?s.timeZone:'UTC';
  for(const seg of s.activeSegments){let t=Date.parse(seg.start);const end=Date.parse(seg.end);for(let guard=0;t<end&&guard<100000;guard++){const c=localClock(t,zone),next=(3600-c.minute*60-c.second)*1000-(((t%1000)+1000)%1000),step=Math.min(end-t,Math.max(1000,next));hours[c.hour]+=step/1000;t+=step;}}}
 return hours;
}
export const hourLabel=(h:number)=>`${h%12||12} ${h<12?'am':'pm'}`;
export function readingHabits(sessions:ReadingSession[],range:DateRange|null,today:string){
 const days=readingByDay(sessions).filter(d=>within(d.date,range)&&(d.seconds>0||d.pages>0));
 const week=weekdays.map((name,i)=>({name,index:i,seconds:0,pages:0,days:0}));
 const months=new Map<string,{month:string;seconds:number;pages:number;days:number}>();
 for(const d of days){const w=week[weekdayIndex(d.date)];w.seconds+=d.seconds;w.pages+=d.pages;w.days++;const key=d.date.slice(0,7),m=months.get(key)??{month:key,seconds:0,pages:0,days:0};m.seconds+=d.seconds;m.pages+=d.pages;m.days++;months.set(key,m);}
 const anyTime=days.some(d=>d.seconds>0);
 const favoriteDay=days.length?[...week].sort((a,b)=>(anyTime?b.seconds-a.seconds:0)||b.days-a.days||b.pages-a.pages||a.index-b.index)[0]:null;
 const monthList=[...months.values()];
 const mostActiveMonth=monthList.length?[...monthList].sort((a,b)=>(anyTime?b.seconds-a.seconds:0)||b.pages-a.pages||b.days-a.days||b.month.localeCompare(a.month))[0]:null;
 const consistent=monthList.map(m=>{const eligible=m.month===today.slice(0,7)?Number(today.slice(8,10)):daysInMonth(m.month);return {...m,eligible,share:m.days/eligible};}).filter(m=>m.eligible>=14).sort((a,b)=>b.share-a.share||b.days-a.days||b.month.localeCompare(a.month))[0]??null;
 const timed=sessionsIn(sessions,range).filter(s=>!s.manual&&sessionSeconds(s)>0),hours=hourlySeconds(timed),hourTotal=hours.reduce((a,b)=>a+b,0);
 const topHour=timed.length>=3&&hourTotal>0?hours.indexOf(Math.max(...hours)):null;
 const all=sessionsIn(sessions,range);
 return {readingDays:days.length,weekdays:week,favoriteDay,anyTime,months:monthList.sort((a,b)=>a.month.localeCompare(b.month)),mostActiveMonth,mostConsistentMonth:consistent,hours,timedSessions:timed.length,topHour,longestSession:longestSession(all),averageSessionSeconds:averageSessionSeconds(all)};
}

// ---------- Superlatives ----------
export function bookSuperlatives(books:Book[],sessions:ReadingSession[],range:DateRange|null){
 const reads=readsIn(books,range),finished=[...new Map(reads.map(e=>[e.book.id,e])).values()];
 const paged=finished.filter(e=>(e.book.totalPages??0)>0);
 const byLength=(dir:1|-1)=>[...paged].sort((a,b)=>dir*((a.book.totalPages??0)-(b.book.totalPages??0))||b.completion.finishedOn.localeCompare(a.completion.finishedOn))[0]??null;
 const timedReads=reads.map(e=>({...e,days:e.completion.startedOn?inclusiveCalendarDays(e.completion.startedOn,e.completion.finishedOn):null})).filter((e):e is typeof e&{days:number}=>e.days!==null);
 const fastest=[...timedReads].sort((a,b)=>a.days-b.days||(b.book.totalPages??0)-(a.book.totalPages??0)||b.completion.finishedOn.localeCompare(a.completion.finishedOn))[0]??null;
 const perBook=new Map<string,{seconds:number;sessions:number;last:string}>();for(const s of sessionsIn(sessions,range)){const p=perBook.get(s.bookId)??{seconds:0,sessions:0,last:''};p.seconds+=sessionSeconds(s);p.sessions++;if(s.date>p.last)p.last=s.date;perBook.set(s.bookId,p);}
 const bookOf=(id:string)=>books.find(b=>b.id===id);
 const top=(value:(p:{seconds:number;sessions:number;last:string})=>number)=>{const best=[...perBook].filter(([id,p])=>value(p)>0&&bookOf(id)).sort((a,b)=>value(b[1])-value(a[1])||b[1].last.localeCompare(a[1].last))[0];return best?{book:bookOf(best[0])!,...best[1]}:null;};
 const rated=reads.map(e=>({...e,rating:readOpinion(e.book,e.completion).rating})).filter((e):e is typeof e&{rating:number}=>typeof e.rating==='number');
 const best=rated.length?Math.max(...rated.map(e=>e.rating)):null,highest=best===null?null:{...rated.filter(e=>e.rating===best)[0],tied:rated.filter(e=>e.rating===best).length-1};
 return {finishedBooks:finished.length,longest:byLength(-1),shortest:paged.length>1?byLength(1):null,fastest,mostTime:top(p=>p.seconds),mostSessions:top(p=>p.sessions),highestRated:highest};
}

// ---------- Personality ----------
export type Persona={title:string;line:string;evidence:string};
const genrePersonas:{match:RegExp;title:string;line:string}[]=[
 {match:/fantasy|romantasy/,title:'Fantasy Royalty',line:'Your reading kingdom keeps returning to other worlds.'},
 {match:/science fiction|sci-?fi|space opera|dystopia/,title:'The Starship Navigator',line:'Your finished shelf charts a course past the edge of the map.'},
 {match:/romance/,title:'The Romance Devotee',line:'Apparently, fictional people are keeping you very busy.'},
 {match:/mystery|thriller|crime|detective|suspense/,title:'The Case Cracker',line:'Clues, alibis and last-chapter reveals fill your finished shelf.'},
 {match:/horror/,title:'The Midnight Haunt',line:'You like your stories with the lights turned a little low.'},
 {match:/non-?fiction|biography|memoir|history|essays|science$/,title:'The Fact Collector',line:'Real life is the plot you keep coming back to.'},
 {match:/poetry/,title:'The Verse Keeper',line:'Your finished shelf is full of lines worth rereading.'},
 {match:/literary|classic/,title:'The Literary Wanderer',line:'You read for the sentences as much as the story.'},
];
export const MIN_GENRE_BOOKS=5;
/** Genre personality from books finished in the period (each book once). Rules, in order:
 * one genre in ≥50% of them → that genre's persona; ≥5 genres and none above 30% → Genre Explorer;
 * the top two genres together cover ≥70% → Two-World Reader; otherwise Curious Reader. */
export function genrePersona(books:Book[],range:DateRange|null):Persona|{needed:number}{
 const finished=[...new Map(readsIn(books,range).map(e=>[e.book.id,e.book])).values()].filter(b=>bookGenres(b).length);
 if(finished.length<MIN_GENRE_BOOKS)return {needed:MIN_GENRE_BOOKS-finished.length};
 const tally=new Map<string,{name:string;ids:Set<string>;spellings:Map<string,number>}>();for(const b of finished)for(const g of bookGenres(b)){const t=tally.get(genreKey(g))??{name:g,ids:new Set<string>(),spellings:new Map<string,number>()};t.ids.add(b.id);t.spellings.set(g,(t.spellings.get(g)??0)+1);t.name=[...t.spellings].sort((x,y)=>y[1]-x[1]||x[0].localeCompare(y[0]))[0][0];tally.set(genreKey(g),t);}
 const ranked=[...tally].sort((a,b)=>b[1].ids.size-a[1].ids.size||a[0].localeCompare(b[0])),n=finished.length,[topKey,top]=ranked[0];
 if(top.ids.size/n>=0.5){const persona=genrePersonas.find(p=>p.match.test(topKey));
  let line=persona?.line??`${top.name} is the thread running through your finished shelf.`;
  if(persona?.title==='Fantasy Royalty'){const dragons=emojiRanking(books,range).ranking.find(e=>emojiKey(e.emoji)==='🐉');if(dragons&&dragons.books>=2)line='Your reading kingdom has a suspicious number of dragons.';}
  return {title:persona?.title??`The ${top.name} Devotee`,line,evidence:`${top.ids.size} of your ${n} finished books include ${top.name}.`};}
 if(ranked.length>=5&&top.ids.size/n<=0.3)return {title:'The Genre Explorer',line:'You refuse to stay in one literary lane.',evidence:`${ranked.length} genres across ${n} finished books, none in more than ${pct(top.ids.size,n)}% of them.`};
 if(ranked.length>=2){const [,second]=ranked[1],covered=new Set([...top.ids,...second.ids]).size;if(covered/n>=0.7)return {title:'The Two-World Reader',line:`You split your time between ${top.name} and ${second.name}.`,evidence:`${covered} of your ${n} finished books include ${top.name} or ${second.name}.`};}
 return {title:'The Curious Reader',line:'Your finished shelf wanders happily between genres.',evidence:`${ranked.length} genres across ${n} finished books; ${top.name} leads with ${top.ids.size}.`};
}
/** Behavior traits, each only when its minimum data exists. Order is fixed; at most three are returned. */
export function readingTraits(books:Book[],sessions:ReadingSession[],range:DateRange|null,today:string):Persona[]{
 const h=readingHabits(sessions,range,today),traits:Persona[]=[];
 const timedTotal=h.hours.reduce((a,b)=>a+b,0),share=(hours:number[])=>timedTotal?hours.reduce((n,x)=>n+h.hours[x],0)/timedTotal:0;
 const enoughTimed=h.timedSessions>=10&&timedTotal>=5*3600;
 const night=share([21,22,23,0,1,2]),morning=share([5,6,7,8]);
 if(enoughTimed&&night>=0.4)traits.push({title:'The Night Owl',line:'Your stories come out after dark.',evidence:`${pct(night*timedTotal,timedTotal)}% of your timed reading happens between 9 pm and 3 am.`});
 if(enoughTimed&&morning>=0.4)traits.push({title:'The Early Bird',line:'You read before the world wakes up.',evidence:`${pct(morning*timedTotal,timedTotal)}% of your timed reading happens between 5 and 9 am.`});
 const weekTotal=h.anyTime?h.weekdays.reduce((n,w)=>n+w.seconds,0):h.readingDays,weekend=h.anyTime?h.weekdays[5].seconds+h.weekdays[6].seconds:h.weekdays[5].days+h.weekdays[6].days;
 if(h.readingDays>=10&&weekTotal>0&&weekend/weekTotal>=0.6)traits.push({title:'The Weekend Reader',line:'Saturdays and Sundays belong to your books.',evidence:`${pct(weekend,weekTotal)}% of your reading ${h.anyTime?'time':'days'} fall on weekends.`});
 const firstDay=readingByDay(sessions).filter(d=>within(d.date,range)&&(d.seconds>0||d.pages>0)).map(d=>d.date).sort()[0];
 const spanStart=range?(range.start>(firstDay??range.start)?range.start:firstDay??range.start):firstDay,spanEnd=range&&range.end<today?range.end:today;
 const eligible=spanStart&&spanEnd>=spanStart?inclusiveCalendarDays(spanStart,spanEnd)??0:0;
 if(eligible>=30&&h.readingDays/eligible>=0.6)traits.push({title:'The Steady Reader',line:'Reading is part of your rhythm, not an occasion.',evidence:`You read on ${h.readingDays} of ${eligible} days.`});
 if(h.timedSessions>=10&&h.averageSessionSeconds!==null&&h.averageSessionSeconds>=3600)traits.push({title:'The Long-Haul Reader',line:'Once you open a book, you stay a while.',evidence:`Your timed sessions average ${Math.round(h.averageSessionSeconds/60)} minutes.`});
 if(h.timedSessions>=10&&h.readingDays>=10&&h.averageSessionSeconds!==null&&h.averageSessionSeconds<=1200)traits.push({title:'Little and Often',line:'Short visits add up to whole worlds.',evidence:`Your timed sessions average ${Math.round(h.averageSessionSeconds/60)} minutes, across ${h.readingDays} reading days.`});
 const reads=readsIn(books,range),rereads=reads.filter(e=>e.reread).length;
 if(rereads>=2&&rereads/reads.length>=0.2)traits.push({title:'The Comfort Rereader',line:'Some stories are worth going home to.',evidence:`${rereads} of your ${reads.length} finished reads were rereads.`});
 return traits.slice(0,3);
}

// ---------- Milestones ----------
export type MilestoneDef={id:string;title:string;metric:'books'|'pages'|'hours'|'days'|'sessions'|'streak';threshold:number};
export const milestoneDefs:MilestoneDef[]=[
 {id:'books-1',title:'First book finished',metric:'books',threshold:1},{id:'pages-100',title:'First 100 pages',metric:'pages',threshold:100},
 {id:'hours-10',title:'Ten reading hours',metric:'hours',threshold:10},{id:'streak-7',title:'A seven-day streak',metric:'streak',threshold:7},
 {id:'books-10',title:'Ten books finished',metric:'books',threshold:10},{id:'pages-1000',title:'1,000 pages',metric:'pages',threshold:1000},
 {id:'days-30',title:'Thirty reading days',metric:'days',threshold:30},{id:'sessions-100',title:'100 reading sessions',metric:'sessions',threshold:100},
 {id:'hours-50',title:'Fifty reading hours',metric:'hours',threshold:50},{id:'books-25',title:'Twenty-five books finished',metric:'books',threshold:25},
 {id:'pages-5000',title:'5,000 pages',metric:'pages',threshold:5000},{id:'streak-30',title:'A thirty-day streak',metric:'streak',threshold:30},
 {id:'days-100',title:'100 reading days',metric:'days',threshold:100},{id:'hours-100',title:'100 reading hours',metric:'hours',threshold:100},
 {id:'books-50',title:'Fifty books finished',metric:'books',threshold:50},{id:'pages-10000',title:'10,000 pages',metric:'pages',threshold:10000},
 {id:'sessions-500',title:'500 reading sessions',metric:'sessions',threshold:500},{id:'days-365',title:'365 reading days',metric:'days',threshold:365},
 {id:'books-100',title:'100 books finished',metric:'books',threshold:100},
];
export const milestoneUnit:Record<MilestoneDef['metric'],string>={books:'finished reads',pages:'pages',hours:'hours',days:'reading days',sessions:'sessions',streak:'days in a row'};
/** Every milestone with the date it was first reached (or null) and current progress. Rereads count as finished reads. */
export function readingMilestones(books:Book[],sessions:ReadingSession[]){
 const timeline:Record<MilestoneDef['metric'],{date:string;value:number}[]>={books:[],pages:[],hours:[],days:[],sessions:[],streak:[]};
 const cumulate=(items:{date:string;amount:number}[])=>{let total=0;return items.sort((a,b)=>a.date.localeCompare(b.date)).map(i=>({date:i.date,value:total+=i.amount}));};
 timeline.books=cumulate(completionEvents(books).map(e=>({date:e.completion.finishedOn,amount:1})));
 timeline.pages=cumulate(sessions.filter(s=>s.pages>0).map(s=>({date:s.date,amount:s.pages})));
 timeline.sessions=cumulate(sessions.map(s=>({date:s.date,amount:1})));
 const days=readingByDay(sessions).filter(d=>d.seconds>0||d.pages>0).sort((a,b)=>a.date.localeCompare(b.date));
 timeline.hours=cumulate(days.map(d=>({date:d.date,amount:d.seconds/3600})));
 timeline.days=cumulate(days.map(d=>({date:d.date,amount:1})));
 let run=0,prev='';timeline.streak=days.map(d=>{run=prev&&shiftDate(prev,1)===d.date?run+1:1;prev=d.date;return {date:d.date,value:run};});
 const current=(m:MilestoneDef['metric'])=>m==='streak'?Math.max(0,...timeline.streak.map(x=>x.value)):timeline[m].at(-1)?.value??0;
 return milestoneDefs.map(def=>({...def,achievedOn:timeline[def.metric].find(x=>x.value>=def.threshold-1e-9)?.date??null,progress:Math.min(current(def.metric),def.threshold)}));
}
export type MilestoneState={seen:string[];since:string};
/**
 * Which milestones to celebrate now. Without saved state (first visit, or a device that never stored it) everything
 * already reached becomes the baseline, silently. After that, only milestones reached and never shown before
 * celebrate; one that disappears after an edit and returns later is not celebrated twice.
 */
export function milestoneCelebration(achieved:string[],state:MilestoneState|undefined){
 if(!state)return {celebrate:[] as string[],nextSeen:achieved};
 const seen=new Set(state.seen),celebrate=achieved.filter(id=>!seen.has(id));
 return {celebrate,nextSeen:celebrate.length?[...state.seen,...celebrate]:state.seen};
}

// ---------- Year in Review ----------
export function yearsWithReading(books:Book[],sessions:ReadingSession[]){return [...new Set([...completionEvents(books).map(e=>e.completion.finishedOn.slice(0,4)),...sessions.map(s=>s.date.slice(0,4))])].filter(y=>/^\d{4}$/.test(y)).sort().reverse();}
function longestStreakIn(dates:string[]){let best=0,run=0,prev='';for(const d of [...dates].sort()){run=prev&&shiftDate(prev,1)===d?run+1:1;prev=d;best=Math.max(best,run);}return best;}
export function yearReview(books:Book[],sessions:ReadingSession[],year:string,today:string){
 const range=yearRange(year),reads=readsIn(books,range),own=sessionsIn(sessions,range),days=readingByDay(sessions).filter(d=>within(d.date,range)&&(d.seconds>0||d.pages>0));
 const months=Array.from({length:12},(_,i)=>{const month=`${year}-${String(i+1).padStart(2,'0')}`,inMonth=days.filter(d=>d.date.startsWith(month));return {month,seconds:inMonth.reduce((n,d)=>n+d.seconds,0),pages:inMonth.reduce((n,d)=>n+d.pages,0),days:inMonth.length,finished:reads.filter(e=>e.completion.finishedOn.startsWith(month)).length};});
 const genres=genreBreakdown(books,sessions,range);
 return {year,range,numbers:{reads:reads.length,uniqueBooks:new Set(reads.map(e=>e.book.id)).size,rereads:reads.filter(e=>e.reread).length,pages:own.reduce((n,s)=>n+s.pages,0),seconds:days.reduce((n,d)=>n+d.seconds,0),readingDays:days.length,sessions:own.length,longestStreak:longestStreakIn(days.map(d=>d.date))},
  genres,favorites:favoriteGenres(genres.rows),persona:genrePersona(books,range),traits:readingTraits(books,sessions,range,today),habits:readingHabits(sessions,range,today),superlatives:bookSuperlatives(books,sessions,range),
  recent:reads.slice(0,6),emojis:yearInThreeEmojis(books,year),months,milestones:readingMilestones(books,sessions).filter(m=>m.achievedOn?.startsWith(year)).sort((a,b)=>a.achievedOn!.localeCompare(b.achievedOn!))};
}
export const validYear=(year:string)=>/^\d{4}$/.test(year)&&validDate(`${year}-01-01`);
