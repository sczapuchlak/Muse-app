import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {root,load} from './helpers.mjs';

const read=file=>readFileSync(join(root,file),'utf8');
const model=load('lib/stream/model'),adapters=load('lib/stream/adapters');
const emptyBundle=()=>({books:[],media:[],curated:[],curatedMembers:[],rituals:null,questCompletions:[],today:'2026-11-06',moods:[],dreams:[],tarot:[],fortunes:[],saved:[],chart:null,cards:[],bills:[]});

test('one contextual primary reaction per post, matching the original rules',()=>{
 const p=model.primaryReactionFor;
 assert.equal(p(null),'react','ordinary statuses: React');
 for(const c of ['reading','watching','dreaming','tarot','side-quests','fortunes','astrology'])assert.equal(p(c),'react',c);
 assert.equal(p('rituals'),'cheer','habit milestones: Cheer');
 assert.equal(p('money'),'celebrate','financial achievements: Celebrate');assert.equal(p('celebrating'),'celebrate');
 assert.equal(p('feeling'),'react','mixed or unknown moods stay neutral');assert.equal(p('feeling','love'),'love');assert.equal(p('feeling','joy'),'joy');
 assert.deepEqual(Object.keys(model.reactions),['react','love','joy','cheer','celebrate']);
 const sql=read('supabase/migrations/20261110000100_stream.sql');
 assert.match(sql,/when category = 'feeling' then primary_reaction in \('react','love','joy'\) when category = 'rituals' then primary_reaction = 'cheer'/,'the database enforces the same rule');
 assert.match(sql,/primary key \(post_id, reactor\)/,'one reaction per person per post');
});

test('mood tone: pleasant → Share Joy, unpleasant → Send Love, mixed → neutral',()=>{
 const b={...emptyBundle(),moods:[{id:'m',date:'2026-11-01',period:'evening',emotionIds:['emotion-anxious','emotion-hopeful']}]};
 const emotions=load('lib/emotions').emotionCatalog;const pleasant=emotions.find(e=>e.quadrant==='yellow').id,unpleasant=emotions.find(e=>e.quadrant==='blue').id;
 b.moods[0].emotionIds=[pleasant];assert.equal(adapters.moodTone(b,'m',[`emotion:${pleasant}`]),'joy');
 b.moods[0].emotionIds=[unpleasant];assert.equal(adapters.moodTone(b,'m',[`emotion:${unpleasant}`]),'love');
 b.moods[0].emotionIds=[pleasant,unpleasant];assert.equal(adapters.moodTone(b,'m',[`emotion:${pleasant}`,`emotion:${unpleasant}`]),'react');
 assert.equal(adapters.moodTone(b,'m',[]),'react','nothing chosen yet: neutral');
});

test('sensitive records start with nothing extra ticked; private writing is never copied in',()=>{
 const b={...emptyBundle(),moods:[{id:'m',date:'2026-11-01',period:'evening',emotionIds:['emotion-anxious']}],
  dreams:[{id:'d',loggedAt:'2026-11-01T08:00:00Z',text:'The full private dream',title:'The floating library',symbolIds:[],emotions:[],interpretation:'',notes:'secret notes'}]};
 for(const kind of ['mood','dream','tarot-reading','astrology','money-milestone'])assert.ok(adapters.sensitiveKinds.includes(kind),kind);
 assert.deepEqual(adapters.defaultApprovedFor('mood',b,'m'),[],'no emotion is preselected');
 assert.deepEqual(adapters.defaultApprovedFor('dream',b,'d'),[],'no dream detail is preselected');
 assert.equal(adapters.streamAdapters.mood.display(b,'m',[],{}),null,'a mood with nothing chosen shares nothing');
 const dream=adapters.streamAdapters.dream.display(b,'d',[],{});
 assert.equal(dream.title,'A dream');assert.ok(!JSON.stringify(dream).includes('private dream')&&!JSON.stringify(dream).includes('secret'),'the narrative and notes never appear unless typed in');
 assert.equal(adapters.streamAdapters.dream.display(b,'d',['title'],{excerpt:'  Only this line  '}).excerpt,'Only this line');
 const tarot=adapters.streamAdapters['tarot-reading'];assert.ok(tarot.texts[0].seed,'reflection is offered as an explicit “Start from my reflection”, not prefilled');
});

test('money milestones and astrology never expose financial or birth details',()=>{
 const b={...emptyBundle(),bills:[{id:'b',name:'Rent at 12 Main St',amountCents:185000,dueDate:'2026-11-01',recurrence:'monthly',paid:true}],
  cards:[{id:'c',name:'Chase Sapphire 4242',balanceCents:0,limitCents:500000,apr:24.9}],
  chart:{id:'ch',payload:{placements:[{body:'sun',sign:'leo',degree:12.3,house:5,uncertain:false},{body:'moon',sign:'pisces',degree:3,house:12,uncertain:false}],ascendant:{sign:'virgo',possibleSigns:['virgo'],longitude:160}}}};
 const m=adapters.streamAdapters['money-milestone'];
 for(const id of ['b','c']){const d=JSON.stringify(m.display(b,id,['title','date'],{}));for(const leak of ['Main St','1850','185000','Chase','4242','500000','24.9'])assert.ok(!d.includes(leak),`${id}: ${leak}`);}
 assert.deepEqual(m.candidates({...b,bills:[{...b.bills[0],paid:false}],cards:[{...b.cards[0],balanceCents:1200}]}),[],'unpaid bills and cards with a balance are not milestones');
 const sql=read('supabase/migrations/20261110000100_stream.sql');
 assert.match(sql,/\(display - array\['kind','title','glyph','date'\]\) = '\{\}'::jsonb/,'the database allows only the dedicated money shape');
 assert.match(sql,/display->>'title' in \('Paid off a credit card','Paid a bill on time'\)/);
 const a=adapters.streamAdapters.astrology.display(b,'ch',['sun','moon','rising'],{});
 assert.equal(a.title,'Leo Sun · Pisces Moon · Virgo Rising');assert.ok(!/12\.3|house|degree/i.test(JSON.stringify(a)),'signs only: no degrees or houses');
 assert.equal(adapters.streamAdapters.astrology.display(b,'ch',[],{}),null,'nothing is shared until a placement is ticked');
});

test('feed filters and card presentation follow the original specification',()=>{
 assert.deepEqual(model.feedFilters.map(f=>f.label),['All','Reading & Watching','Life Updates','Whimsy','Celebrations']);
 assert.equal(model.cardTone({kind:'activity',category:'reading'}),'literary');assert.equal(model.cardTone({kind:'activity',category:'dreaming'}),'mystical');
 assert.equal(model.cardTone({kind:'activity',category:'money'}),'celebratory');assert.equal(model.cardTone({kind:'status',category:null}),'status');
 const stream=read('components/stream/Stream.tsx');assert.match(stream,/Quiet in the universe today/);
 assert.doesNotMatch(stream,/sample|fake|placeholder friend/i,'no fake friend activity');
 assert.deepEqual(model.audienceOptions.map(a=>a.id),['private','friends','selected']);
});

test('the database keeps Stream private by default and function-only',()=>{
 const sql=read('supabase/migrations/20261110000100_stream.sql');
 assert.match(sql,/audience text not null default 'private'/);assert.match(sql,/p_audience text default 'private'/);
 for(const t of ['stream_posts','stream_post_members','stream_reactions','stream_comments','stream_notifications','stream_preferences','stream_reports'])assert.ok(sql.includes(`'${t}'`),t);
 assert.match(sql,/execute format\('revoke all on public\.%I from public, anon, authenticated', t\)/,'no direct table access');
 assert.match(sql,/muse_private\.are_friends\(viewer, p\.author\)/,'current friendship (and blocking) decides access');
 assert.match(sql,/when p\.spoiler then 'Spoiler-protected post'/,'spoilers never reach notifications');
 assert.match(sql,/if not post\.comments_enabled then raise exception/,'authors can switch comments off');
 assert.doesNotMatch(sql,/create table public\.(friendships|social_identities|friend_requests)/,'no duplicate social tables');
});

test('Stream sits in navigation, can be hidden, and Share to Stream is in-context',()=>{
 const nav=load('lib/navigation');const item=nav.navigation.find(n=>n.id==='stream');
 assert.equal(item.href,'/stream');assert.ok(nav.mobileMoreIds.includes('stream'));
 assert.match(read('components/AppShell.tsx'),/showStream \|\| item\.id !== "stream"/,'hiding Stream only filters navigation');
 assert.match(read('components/stream/StreamNotifications.tsx'),/Hiding Stream only tidies your navigation/);
 const share=read('components/stream/ShareToStream.tsx');assert.match(share,/<dialog/);assert.match(share,/showModal/,'opens over the current page');
 for(const f of ['components/whimsy/Bookshelf.tsx','components/whimsy/Dreamscapes.tsx','components/whimsy/TarotExperience.tsx'])assert.match(read(f),/<ShareToStream /,f);
});

test('reaction animations play once, after success, and respect Muse Magic and reduced motion',()=>{
 const css=read('components/stream/Stream.css'),button=read('components/stream/StreamReaction.tsx');
 assert.match(button,/const ok=await onToggle\(next\);.*if\(ok&&next\)\{setPlay/s,'only after the database confirms');
 for(const k of ['react','love','joy','cheer','celebrate'])assert.match(css,new RegExp(`muse-stream-burst\\[data-kind=${k}\\] i\\{`),k);
 assert.match(css,/@media \(prefers-reduced-motion:no-preference\)\{\s*:root:not\(\[data-magic=quiet\]\)/,'gated by reduced motion and Muse Magic');
 assert.match(css,/:root\[data-magic=extra\] \.muse-stream-burst\{--reach:1\.45\}/,'Extra magic reaches a little further');
 assert.doesNotMatch(css,/animation:[^;]*infinite/,'never continuous');
});
