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
test('twenty border gradients with genuine colour range',()=>{
 const presets=gradients.gradientPresets;
 assert.equal(presets.length,20);assert.equal(new Set(presets.map(g=>g.id)).size,20);
 for(const family of ['dark','light','bright','earthy'])assert.ok(presets.filter(g=>g.family===family).length>=4,family);
 const hue=hex=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(d<.08)return null;let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;return (h*60+360)%360;};
 const dominant=g=>{const hues=g.stops.map(hue).filter(h=>h!==null);return hues.length?hues[Math.floor(hues.length/2)]:null;};
 const purplePink=presets.filter(g=>{const h=dominant(g);return h!==null&&h>=260&&h<=345;}).length;
 assert.ok(purplePink<=4,`only ${purplePink} purple/pink-led presets`);
 assert.ok(presets.some(g=>g.stops.length===2)&&presets.some(g=>g.stops.length===3)&&presets.some(g=>g.stops.length>=5),'two-colour, three-colour and multicolour');
 assert.equal(gradients.gradientById('nope').id,'nebula-kiss','unknown ids fall back safely');
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
});

test('the profile theme is page-scoped and restores the visitor’s own theme',()=>{
 const override=read('lib/theme-override.ts');assert.match(override,/return\(\)=>set\(null\)/,'leaving clears it');
 assert.match(read('components/ThemeSwitcher.tsx'),/setAttribute\("data-theme", override \?\? activeId\)/);
 assert.doesNotMatch(override,/localStorage|selectTheme|data-material/,'never saved; Crystal/Frosted untouched');
 for(const file of ['components/profile/MyProfile.tsx','components/profile/FriendProfile.tsx','components/profile/ProfileCustomizer.tsx','components/profile/ShowcaseStudio.tsx'])assert.match(read(file),/useThemeOverride\(/,file);
 const nav=load('lib/navigation');const item=nav.navigation.find(n=>n.id==='profile');assert.equal(item.group,'Tools','My Profile lives in the account area');assert.ok(nav.mobileMoreIds.includes('profile'));
});
