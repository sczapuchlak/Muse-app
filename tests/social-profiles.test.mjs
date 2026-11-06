import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
const awaitFs={existsSync,readdirSync};
import {join} from 'node:path';
import {root,load} from './helpers.mjs';

const read=path=>readFileSync(join(root,path),'utf8');
const gradients=load('lib/profile/gradients'),avatars=load('lib/profile/avatars'),adapters=load('lib/profile/adapters'),model=load('lib/profile/model'),identity=load('lib/social/identity');

// ---------------- #16 Social foundation ----------------
test('usernames: case-insensitive, validated and reserved names refused on the device too',()=>{
 assert.equal(identity.normalizeUsername('  @Ava.Reads '),'ava.reads');
 for(const bad of ['ab','.ava','ava.','a..b','ava reads','ava!','x'.repeat(31)])assert.equal(identity.localUsernameStatus(bad),'invalid',bad);
 for(const reserved of ['admin','Muse','settings','friends'])assert.equal(identity.localUsernameStatus(reserved),'reserved',reserved);
 assert.equal(identity.localUsernameStatus('ava_reads.2'),null,'valid names go to the database for availability');
 assert.equal(identity.suggestUsername('Stéphanie'),'stephanie');
 const sql=read('supabase/migrations/20261109000100_social_foundation.sql');
 for(const name of identity.reservedUsernames)assert.ok(sql.includes(`'${name}'`),`${name} is reserved in the database too`);
});

test('the social foundation is private by default and enforced in the database',()=>{
 const sql=read('supabase/migrations/20261109000100_social_foundation.sql');
 assert.match(sql,/discoverable boolean not null default false/,'nobody is discoverable until they choose');
 assert.match(sql,/friend_requests_one_pending/,'no duplicate pending requests');
 assert.match(sql,/check \(user_low < user_high\)/,'one friendship row per pair');
 assert.doesNotMatch(sql,/grant (select|insert|update|delete)[^;]*on public\.(friend_requests|friendships|social_blocks) to authenticated/,'relationship tables are function-only');
 assert.match(sql,/grant update \(display_name, avatar_id, discoverable, participation\)/,'usernames and ids cannot be edited directly');
 assert.match(sql,/create function muse_private\.are_friends[\s\S]*not muse_private\.is_blocked/,'blocking overrides friendship on every check');
 assert.match(sql,/'avatarId', i\.avatar_id\)/,'identity cards carry no auth ids or emails');
 const card=sql.slice(sql.indexOf('create function muse_private.identity_card'),sql.indexOf('$$;',sql.indexOf('create function muse_private.identity_card')));
 assert.doesNotMatch(card,/'(email|userId|user_id)'/,'no auth identifiers in cards');
 assert.match(sql,/avatar_id text not null default 'moon-witch' check \(avatar_id ~ '\^\[a-z\]\[a-z0-9-\]\{2,47\}\$'\)/,'avatars are ids, never images or URLs');
 assert.doesNotMatch(sql,/storage\.|bucket/,'no image storage');
});

// ---------------- #26 Profiles & Showcases ----------------
test('banner and border presets: art-directed layers, two moods, stable ids',()=>{
 const all=gradients.gradientPresets,offered=gradients.offeredGradients;
 assert.equal(new Set(all.map(g=>g.id)).size,all.length,'unique ids');
 assert.ok(offered.length>=18&&offered.length<=24,`${offered.length} offered`);
 for(const family of ['soft','magic'])assert.ok(offered.filter(g=>g.family===family).length>=6,family);
 for(const g of all){assert.match(g.id,/^[a-z0-9-]{2,40}$/,g.id);assert.ok(g.layers.split('gradient(').length>2,`${g.id} is layered`);assert.doesNotMatch(g.layers,/conic-gradient/,`${g.id}: no colour wheels`);}
 for(const name of ['Nebula Noir','Milky Way','Aurora Dreams','Solar Flare','Desert Sunset'])assert.ok(offered.some(g=>g.name===name),name);
 // Every id ever offered keeps resolving, so saved profiles and Showcases never change on their own.
 for(const id of ['nebula-kiss','midnight-prism','vampire-velvet','secret-garden','mermaid-lagoon','disco-fever','moonstone','rosewater','blue-moon','champagne-toast','cosmic-candy','cherry-bomb','electric-cobalt','lime-wire','solar-flare','rainbow-riot','emerald-city','copper-kettle','olive-grove','golden-hour'])assert.equal(gradients.gradientById(id).id,id,id);
 assert.equal(gradients.gradientById('nope').id,'nebula-kiss','unknown ids fall back safely');
 for(const s of model.starterIdeas)assert.ok(offered.some(g=>g.id===s.gradient),`${s.id} starter uses an offered preset`);
});

test('personality badges: six accented categories, icons, legacy ids preserved',()=>{
 const badges=load('lib/profile/badges');const list=badges.profileBadges;
 assert.ok(list.length>=50&&list.length<=60,`${list.length} badges`);
 assert.equal(new Set(list.map(b=>b.id)).size,list.length,'unique ids');assert.equal(new Set(list.map(b=>b.label.toLowerCase())).size,list.length,'no duplicate wording');
 assert.deepEqual(badges.badgeCategories.map(c=>c.label),['Books & Fictional Crushes','Theater & Entertainment','Creative Pursuits','Pets & Everyday Life','Mystical & Cosmic','Gaming & Personality']);
 assert.equal(new Set(badges.badgeCategories.map(c=>c.accent)).size,6,'distinct accents');
 for(const b of list){assert.match(b.id,/^[a-z0-9-]+$/,b.id);assert.ok(b.icon,b.id);assert.ok(badges.badgeCategories.some(c=>c.id===b.category),b.id);}
 for(const label of ['I ❤️ Pointy-Eared Pretty Boys','One More Chapter (Liar)','Collector of Unfinished Hobbies','Broadway Is a Personality Trait','Fangs, Fae & Bad Decisions'])assert.ok(list.some(b=>b.label===label),label);
 for(const banned of [/chaos goblin/i,/hex appeal/i,/cat staff/i])assert.ok(!list.some(b=>banned.test(b.label)),String(banned));
 for(const id of ['bookworm','night-owl','dreamer','stargazer','tarot-reader','ritual-keeper','collector','chaos-goblin','plant-parent','coffee-fiend','music-lover','wanderer','artist','gamer','film-buff','baker'])assert.ok(badges.badgeById(id),`legacy ${id}`);
 assert.deepEqual(badges.normalizeBadges(['coffee-fiend','caffeine-dependent','nope','chaos-goblin','a','b','c','d','e','f','night-owl']),['caffeine-dependent','adhd-whirlwind','night-owl']);
 assert.equal(badges.MAX_BADGES,6);
});

test('bundled Muse avatars: unique descriptive ids, one image each, only the id is stored',()=>{
 const {existsSync,readdirSync}=awaitFs;const list=avatars.museAvatars;
 assert.ok(list.length>=70,`${list.length} avatars`);assert.equal(new Set(list.map(a=>a.id)).size,list.length);
 for(const a of list){assert.match(a.id,/^[a-z][a-z0-9-]{2,47}$/,a.id);assert.ok(existsSync(join(root,'public/avatars',`${a.id}.webp`)),`${a.id} artwork`);assert.ok(a.name.trim().length>1);}
 assert.equal(readdirSync(join(root,'public/avatars')).length,list.length,'no orphan artwork files');
 for(const group of avatars.avatarGroups)assert.ok(list.some(a=>a.group===group),group);
 assert.equal(list[0].id,avatars.defaultAvatar,'the default comes first');assert.equal(avatars.avatarById('unknown').id,avatars.defaultAvatar);
 assert.equal(avatars.avatarSrc('reading-dragon'),'/avatars/reading-dragon.webp');
});

test('safe adapters only ever produce fields the database accepts, and only the approved ones',()=>{
 const allowed=['kind','title','subtitle','image','meta','rating','progress','status','glyph','date'];
 const bundle={books:[{id:'b1',title:'Piranesi',author:'Susanna Clarke',status:'reading',reviewEmojis:[],rating:4,coverUrl:'https://covers.example/p.jpg',totalPages:200,currentPage:50,finalThoughts:'PRIVATE THOUGHTS',sessions:[]}],media:[{id:'m1',kind:'movie',title:'Spirited Away',creator:'Hayao Miyazaki',cover_url:'http://insecure.example/x.jpg',status:'watched',rating:5,review:'PRIVATE REVIEW',notes:'PRIVATE NOTES',progress_percent:null}],curated:[{id:'c1',title:'Comfort reads',description:'Soft books',icon:'book'}],curatedMembers:[{collection_id:'c1'},{collection_id:'c1'}],rituals:null,questCompletions:[],today:'2026-11-05'};
 const book=adapters.adapters.book.display(bundle,'b1',['title']);
 assert.deepEqual(book,{kind:'book',title:'Piranesi'},'only the title when only the title is approved');
 const full=adapters.adapters.book.display(bundle,'b1',['title','author','cover','status','progress','rating']);
 assert.deepEqual(full,{kind:'book',title:'Piranesi',subtitle:'Susanna Clarke',image:'https://covers.example/p.jpg',status:'Reading',progress:25,rating:4});
 const film=adapters.adapters.media.display(bundle,'m1',['title','creator','cover','rating']);
 assert.equal(film.image,undefined,'only https images');assert.ok(!JSON.stringify(film).includes('PRIVATE'));
 assert.deepEqual(adapters.adapters.curated.display(bundle,'c1',['title','count']).meta,['2 favourites']);
 assert.equal(adapters.adapters.book.display(bundle,'gone',['title']),null,'a deleted source is detected');
 const card=adapters.adapters['tarot-card'].display(bundle,'tarot-major-17',['title','art','section']);assert.equal(card.title,'The Star');assert.match(card.image,/^\/tarot\//);
 for(const kind of adapters.adapterOrder){for(const field of adapters.adapters[kind].fields)assert.match(field.id,/^[a-z]+$/);}
 for(const display of [book,full,film,card])for(const key of Object.keys(display))assert.ok(allowed.includes(key),key);
 assert.equal(adapters.displayChanged(book,{...book,title:'Piranesi (new)'}),true);assert.equal(adapters.displayChanged(book,{...book}),false);
 assert.equal(adapters.displayChanged(book,null),false,'a missing source is not an “update”');
});

test('money milestones are words only',()=>{
 for(const text of ['Paid off $2,400','Saved 5k','Down 1200 dollars','Cleared £300'])assert.match(text,adapters.moneyAmountPattern,text);
 for(const text of ['Paid off a credit card!','Debt-free at last','First budget I kept'])assert.doesNotMatch(text,adapters.moneyAmountPattern,text);
 const d=adapters.victoryDisplay({title:'Paid off a credit card!',subtitle:'',date:'2026-11-01',glyph:'trophy',money:true});
 assert.deepEqual(d,{kind:'money-milestone',title:'Paid off a credit card!',date:'2026-11-01',glyph:'trophy',status:'Financial milestone'});
 assert.doesNotMatch(read('lib/profile/adapters.ts'),/from '@\/lib\/money'|money_|transactions/,'victories never read Money records');
});

test('profile sections, privacy defaults and the friend view',()=>{
 assert.deepEqual(model.normalizeSections([{id:'showcases',hidden:true},{id:'bogus'}]).map(s=>`${s.id}:${s.hidden}`),['showcases:true','about:false','badges:false']);
 assert.equal(model.defaultProfile('disco-damage').visibility,'private');assert.equal(model.defaultProfile('nope').theme,'iridescent');
 const sql=read('supabase/migrations/20261109000200_profiles_showcases.sql');
 assert.match(sql,/visibility text not null default 'private'/);assert.match(sql,/visibility text not null default 'draft'/,'new Showcases start as drafts');
 assert.match(sql,/s\.visibility = 'friends'/);assert.match(sql,/i\.source_state = 'ok'/,'missing sources never reach friends');
 assert.match(sql,/not exists \(select 1 from jsonb_object_keys\(d\) k where k not in \('kind','title','subtitle','image','meta','rating','progress','status','glyph','date'\)\)/,'the database enforces the display allow-list');
 assert.match(sql,/select coalesce\(jsonb_typeof\(d\) = 'object'/,'a missing title fails the check');
 assert.doesNotMatch(sql,/storage\.|banner_path|avatar_path/,'no stored images');
 for(const [table,kind] of [['whimsy_books','book'],['collection_media_items','media'],['collection_curated','curated'],['rituals','ritual'],['whimsy_quest_completions','side-quest']]){
  assert.match(sql,new RegExp(`after delete on public\\.${table} for each row execute function muse_private\\.showcase_source_deleted\\('${kind}'\\)`),`${table} deletions revoke Showcase items`);
  assert.match(sql,new RegExp(`when '${kind}' then exists \\(select 1 from public\\.${table} where user_id = owner`),`${kind} existence is checked on every read`);
 }
 assert.match(sql,/i\.source_state = 'ok' and muse_private\.showcase_source_exists\(owner, i\.source_kind, i\.source_id\)/,'the friend view checks sources live');
});

test('the profile theme is page-scoped and restores the visitor’s own theme',()=>{
 const override=read('lib/theme-override.ts');assert.match(override,/return\(\)=>set\(null\)/,'leaving clears it');
 assert.match(read('components/ThemeSwitcher.tsx'),/setAttribute\("data-theme", readThemeOverride\(\) \?\? readThemePreference\(\)\)/);
 assert.doesNotMatch(override,/localStorage|selectTheme|data-material/,'never saved; Crystal/Frosted untouched');
 // Another person's profile, Preview as a friend and the Customize live preview wear the profile theme...
 assert.match(read('components/profile/FriendProfile.tsx'),/useThemeOverride\(view\?\.profile\.theme/);
 assert.match(read('components/profile/ProfileCustomizer.tsx'),/useThemeOverride\(/);
 assert.match(read('components/profile/MyProfile.tsx'),/useThemeOverride\(preview\?/,'own museum: only while previewing as a friend');
 // ...and the person's own pages never switch theme on their own.
 assert.doesNotMatch(read('components/profile/ShowcaseStudio.tsx'),/useThemeOverride/);
 assert.equal((read('components/profile/MyProfile.tsx').match(/useThemeOverride\(/g)||[]).length,1,'setup does not repaint the page');
 assert.match(read('components/atelier/AppearanceBridge.tsx'),/readThemeOverride\(\)\?\?readApplied\(\)\?\.definition\.base\?\?readThemePreference\(\)/,'the Atelier bridge honours the page-scoped theme');
 // A full page load paints the saved theme first (no flash of the default theme).
 const layout=read('app/layout.tsx'),prepaint=load('lib/appearance-prepaint');
 assert.match(layout,/appearancePrePaintScript/);assert.match(layout,/suppressHydrationWarning/);
 assert.match(prepaint.appearancePrePaintScript,/muse\.theme/);assert.match(prepaint.appearancePrePaintScript,/"astral"/);assert.match(prepaint.appearancePrePaintScript,/indexOf\(t\)>-1/,'only known theme ids');
 const nav=load('lib/navigation');const item=nav.navigation.find(n=>n.id==='profile');assert.equal(item.group,'Tools','My Profile lives in the account area');assert.ok(nav.mobileMoreIds.includes('profile'));
});
