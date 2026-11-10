import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const model=load('lib/stream/model');
const A=load('lib/stream/adapters');
const read=f=>readFileSync(resolve(root,f),'utf8');
const own=(id,o={})=>({id,userId:'u',revision:1,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',...o});
const bundle=(o={})=>({books:[],media:[],curated:[],curatedMembers:[],rituals:null,questCompletions:[],today:'2026-11-06',moods:[],dreams:[],tarot:[],fortunes:[],saved:[],chart:null,cards:[],bills:[],...o});

test('money milestones are no longer offered, and earlier money posts still render',()=>{
 assert.ok(!model.shortcuts.some(s=>s.id==='money'),'no Money shortcut');
 assert.ok(!model.shortcuts.some(s=>s.kinds.includes('money-milestone')),'no shortcut offers money milestones');
 assert.deepEqual(model.retiredKinds,['money-milestone']);
 assert.equal(model.shortcutById('money')?.label,'Money milestone','old posts still find their label and icon');
 assert.equal(model.cardTone({kind:'activity',category:'money'}),'celebratory');
 assert.ok(model.shortcutById('celebrating').kinds.includes('aspiration'),'aspirations live in Celebrating');
 const sql=read('supabase/migrations/20261116000100_stream_v2.sql');
 assert.match(sql,/'money-milestone','aspiration'/,'the database still accepts money posts for compatibility');
 assert.doesNotMatch(sql,/delete from public\.stream_posts|drop table/i,'nothing published is deleted');
});

test('aspiration snapshots share only what is ticked, never the why, notes or reflection',()=>{
 const asp={id:'a1',title:'Learn to sew a skirt',description:'private notes',motivation:'private why',category:'Creative',icon:'🧵',accent:null,startDate:'2026-01-01',targetDate:'2026-12-31',timeframe:'year',
  status:'completed',progressKind:'milestones',target:null,unit:null,connection:null,milestones:[{id:'m',title:'Cut',completedOn:'2026-05-01'},{id:'n',title:'Hem',completedOn:'2026-06-01'}],
  ritualIds:[],taskIds:[],reflection:'private reflection',completedOn:'2026-06-02',celebrated:[],position:0,renewedFrom:null,revision:1,createdAt:'',updatedAt:''};
 const b=bundle({aspirations:[asp,{...asp,id:'gone',status:'archived'}],aspirationUpdates:[]});
 const ad=A.streamAdapters.aspiration;
 assert.deepEqual(ad.candidates(b).map(c=>c.sourceId),['a1'],'archived aspirations are not offered');
 const minimal=ad.display(b,'a1',['title'],{});
 assert.deepEqual(minimal,{kind:'aspiration',title:'Learn to sew a skirt',status:'Finished',glyph:'trophy'});
 const full=ad.display(b,'a1',['title','progress','milestones','category','finished'],{excerpt:'Wore it to dinner.'});
 assert.deepEqual([full.progress,full.meta,full.date,full.excerpt],[100,['2 of 2 milestones','Creative'],'2026-06-02','Wore it to dinner.']);
 assert.doesNotMatch(JSON.stringify(full),/private/,'private writing never leaves unless typed');
 assert.equal(ad.texts[0].seed(b,'a1'),'private reflection','the reflection is only a starting point the author must choose to use');
 const connected={...asp,id:'c',status:'active',completedOn:null,progressKind:'connected',connection:{kind:'reading-challenge',year:'2026'}};
 assert.equal(ad.display(bundle({aspirations:[connected]}),'c',['title','progress'],{}).progress,undefined,'connected progress is not snapshotted from other modules');
});

test('book moments: started, latest session and progress come from existing records only',()=>{
 const book=own('b1',{title:'Piranesi',author:'Susanna Clarke',status:'reading',reviewEmojis:[],startedOn:'2026-11-01',totalPages:240,currentPage:120});
 const session=(date,pages,minutes)=>own(`s${date}`,{bookId:'b1',date,timeZone:'UTC',pages,activeSegments:[{start:`${date}T20:00:00.000Z`,end:new Date(Date.parse(`${date}T20:00:00.000Z`)+minutes*60000).toISOString()}]});
 const b=bundle({books:[book],sessions:[session('2026-11-03',20,30),session('2026-11-05',25,45)]});
 const ids=A.fieldsFor('book',b,'b1').map(f=>f.id);
 assert.ok(ids.includes('started')&&ids.includes('session'));
 assert.ok(!A.streamAdapters.book.fields.find(f=>f.id==='session').default,'session details start unticked');
 const d=A.streamAdapters.book.display(b,'b1',['title','progress','started','session'],{});
 assert.equal(d.progress,50);assert.equal(d.meta.length,2);
 assert.match(d.meta[0],/^Started /);assert.match(d.meta[1],/^Read 25 pages · 45 min on /,'the latest session');
 const fresh=bundle({books:[{...book,startedOn:undefined}],sessions:[]});
 assert.deepEqual(A.fieldsFor('book',fresh,'b1').map(f=>f.id).filter(id=>['started','session'].includes(id)),[],'no session or start date: nothing to tick');
});

test('TV moments: latest episode and finished season, with spoiler-prone titles opt-in',()=>{
 const show={id:'tv1',kind:'tv',title:'Severance',creator:'Dan Erickson',status:'watching',cover_url:null,progress_percent:40,rating:null};
 const ep=(id,season,episode,title)=>({id,show_id:'tv1',season_number:season,episode_number:episode,title});
 const b=bundle({media:[show,{...show,id:'m1',kind:'movie',title:'Arrival'}],episodes:[ep('e1',2,4,'Woe’s Hollow'),ep('e2',2,5,'Trojan’s Horse')],
  activity:[{id:'a',media_id:'tv1',episode_id:'e1',activity_date:'2026-11-01'},{id:'b',media_id:'tv1',episode_id:'e2',activity_date:'2026-11-04'}],
  seasons:[{id:'s1',show_id:'tv1',season_number:1,watched:true},{id:'s2',show_id:'tv1',season_number:2,watched:false}]});
 assert.ok(A.fieldsFor('media',b,'tv1').some(f=>f.id==='episode'));
 assert.ok(!A.fieldsFor('media',b,'m1').some(f=>['episode','episode-title','season'].includes(f.id)),'movies have no episodes');
 assert.ok(!A.streamAdapters.media.fields.find(f=>f.id==='episode-title').default,'episode titles start unticked');
 assert.deepEqual(A.streamAdapters.media.display(b,'tv1',['title','episode','season'],{}).meta,['Watched S2 · E5','Finished season 1']);
 assert.deepEqual(A.streamAdapters.media.display(b,'tv1',['title','episode','episode-title'],{}).meta,['Watched S2 · E5 “Trojan’s Horse”']);
 for(const line of A.streamAdapters.media.display(b,'tv1',['title','episode','episode-title','season'],{}).meta)assert.ok(line.length<=80,'fits the snapshot limit');
 assert.match(read('components/stream/StreamComposer.tsx'),/f\.id==='episode-title'\)setSpoiler\(true\)/,'choosing an episode title turns on spoiler protection');
});

test('each reaction has its own sound from the shared palette, after success only',()=>{
 const {reactionSounds}=load('components/stream/StreamReaction');
 assert.deepEqual(reactionSounds,{react:'confirm',love:'reveal',joy:'complete',cheer:'seal',celebrate:'celebrate'});
 assert.equal(new Set(Object.values(reactionSounds)).size,5);
 assert.match(read('components/stream/StreamReaction.tsx'),/if\(ok&&next\)\{setPlay\(n=>n\+1\);playSound\(reactionSounds\[kind\]\);\}/);
 assert.match(read('components/stream/Stream.css'),/:root:not\(\[data-magic=quiet\]\)[^{]*muse-stream-burst/,'Quiet keeps feedback without the flourish');
});

test('Share to Stream sits where people finish or save something meaningful',()=>{
 const places={'components/collections/MediaLibrary.tsx':/<ShareToStream kind="media" id=\{detail\.id\} category=(?:"watching"|\{kind==='album'\?'listening':'watching'\})/,
  'components/rituals/RitualEditor.tsx':/\{initial&&<ShareToStream kind="ritual" id=\{initial\.id\}/,
  'components/whimsy/WeeklySideQuests.tsx':/\{done&&\(\(\)=>\{const c=completions\.find[^}]*\}*[^<]*<ShareToStream kind="side-quest"/,
  'components/whimsy/FortuneCollectionCard.tsx':/<ShareToStream kind="fortune" id=\{item\.id\}/,
  'components/astrology/CosmicObservatory.tsx':/records\.chart&&<div className="muse-cosmic-share"><ShareToStream kind="astrology"/,
  'components/mood/Mood.tsx':/(share=\{record=>record\.emotionIds\.length\?|record\.emotionIds\.length>0&&)<ShareToStream kind="mood"/,
  'components/envision/aspirations/AspirationDetail.tsx':/<ShareToStream kind="aspiration" id=\{a\.id\} category="celebrating"/,
  'components/whimsy/BookDetail.tsx':/<ShareToStream kind="book"/,'components/whimsy/Dreamscapes.tsx':/ShareToStream/,'components/whimsy/TarotExperience.tsx':/ShareToStream/};
 for(const [file,pattern] of Object.entries(places))assert.match(read(file),pattern,file);
 assert.doesNotMatch(read('components/money/Money.tsx'),/ShareToStream/,'no money sharing');
});

test('reports are reviewed only with the service key, never through an app route',()=>{
 const sql=read('supabase/migrations/20261116000100_stream_v2.sql');
 assert.match(sql,/revoke all on function public\.stream_reports_review\(boolean\), public\.stream_report_resolve\(uuid,text,text\) from public, anon, authenticated/);
 assert.match(sql,/grant execute on function public\.stream_reports_review\(boolean\), public\.stream_report_resolve\(uuid,text,text\) to service_role/);
 assert.doesNotMatch(sql,/delete from public\.stream_posts/,'resolving never deletes a post');
 const script=read('scripts/stream-reports.mjs');assert.match(script,/Type muse-production to continue/);assert.doesNotMatch(script,/console\.log\([^)]*key/i,'never prints the key');
 assert.doesNotMatch(read('app/(app)/stream/page.tsx'),/report/i);
});

test('chart signs share from a real calculated chart, and never birth details',()=>{
 const {calculateNatal}=load('lib/astrology/calculations');
 const payload=calculateNatal({date:'2000-01-01',time:'12:00',accuracy:'exact',uncertaintyMinutes:0,place:{id:'s',name:'Synthetic place',latitude:51.4779,longitude:0,timeZone:'UTC'},zodiac:'tropical',houseSystem:'whole-sign'});
 const b=bundle({chart:{id:'ch',payload}});
 const d=A.streamAdapters.astrology.display(b,'ch',['sun','moon','rising'],{});
 assert.equal(d.title,'Capricorn Sun · Scorpio Moon · Aries Rising','real charts name bodies “Sun”, “Moon”: they must still resolve');
 assert.equal(A.streamAdapters.astrology.display(b,'ch',['sun'],{}).title,'Capricorn Sun');
 assert.equal(A.streamAdapters.astrology.display(b,'ch',[],{}),null,'nothing ticked: nothing to share');
 assert.doesNotMatch(JSON.stringify(d),/2000|12:00|Synthetic|51\.4|degree|house/i);
});
