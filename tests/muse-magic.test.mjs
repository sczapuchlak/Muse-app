import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {root,load} from './helpers.mjs';

const read=file=>readFileSync(join(root,file),'utf8');
/** A tiny browser: storage, events, media queries and a fake Web Audio context that records what it schedules. */
function fakeBrowser({reduced=false,magic='magical',audio=true}={}){
 const store=new Map(),session=new Map(),events=new EventTarget();const started=[];let now=0;
 class Node{connect(n){return n??this;}}
 class Param{constructor(){this.value=1;}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}cancelScheduledValues(){}setTargetAtTime(v){this.value=v;}}
 class Ctx{constructor(){this.state='running';this.destination=new Node();}get currentTime(){return now;}createGain(){const g=new Node();g.gain=new Param();return g;}
  createDynamicsCompressor(){return new Node();}createOscillator(){const o=new Node();o.frequency={value:0};o.start=t=>started.push(t);o.stop=()=>{};return o;}resume(){return Promise.resolve();}}
 globalThis.window={localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,String(v))},
  matchMedia:q=>({matches:q.includes('reduce')?reduced:false}),addEventListener:(...a)=>events.addEventListener(...a),removeEventListener:(...a)=>events.removeEventListener(...a),dispatchEvent:e=>events.dispatchEvent(e),
  ...(audio?{AudioContext:Ctx}:{})};
 store.set('muse.magic',magic);
 return {started,advance:s=>{now+=s;},store};
}
const fresh=name=>load(name,true);

test('sound effects are off by default, persist, and stay independent of motion settings',()=>{
 fakeBrowser({reduced:true,magic:'quiet'});const pref=fresh('lib/sound-preference');
 assert.equal(pref.readSound(),false,'off until chosen');
 pref.selectSound(true);assert.equal(window.localStorage.getItem('muse.sound'),'on','persisted like the Muse Magic level');
 const reloaded=fresh('lib/sound-preference');assert.equal(reloaded.readSound(),true,'survives a reload');
 const magic=read('components/MuseMagic.tsx');assert.match(magic,/Sound effects/);assert.match(read('components/ThemeSwitcher.tsx'),/<SoundToggle\/>/,'also in the Themes menu');
});

test('the sound system plays only when allowed, never overlaps, and lets a bigger moment take over',()=>{
 const b=fakeBrowser();load('lib/sound-preference',true);const sound=fresh('lib/muse-sound');
 assert.equal(sound.playSound('complete'),false,'muted by default: nothing plays');
 window.localStorage.setItem('muse.sound','on');const pref=fresh('lib/sound-preference');pref.selectSound(true);
 const s=fresh('lib/muse-sound');
 assert.equal(s.playSound('complete'),true,'plays when on');const scheduled=b.started.length;assert.ok(scheduled>0);
 assert.equal(s.playSound('complete'),false,'rapid repeats collapse into one');
 assert.equal(s.playSound('confirm'),false,'a lesser sound never talks over a playing one');
 assert.equal(s.playSound('book'),true,'a more important moment gently takes over');
 b.advance(5);assert.equal(s.playSound('confirm'),true,'after it finishes, the next sound plays');
 for(const name of s.soundNames)assert.ok(s.soundDuration(name)<=2,`${name} is short`);
});

test('without Web Audio the sound system is a silent no-op',()=>{
 fakeBrowser({audio:false});fresh('lib/sound-preference').selectSound(true);
 assert.equal(fresh('lib/muse-sound').playSound('celebrate'),false);
});

test('celebrations happen once per key, announce without motion, and queue rather than stack',()=>{
 fakeBrowser();const c=fresh('lib/celebrate');
 assert.equal(c.celebrate({kind:'book',message:'Another universe explored.',key:'book:1:2026-11-06:1'}),true);
 assert.equal(c.readCelebration().visual,true);assert.equal(c.readAnnouncement(),'Another universe explored.','always announced for assistive tech');
 assert.equal(c.celebrate({kind:'book',message:'again',key:'book:1:2026-11-06:1'}),false,'the same finish never replays');
 assert.equal(c.celebrate({kind:'constellation',stars:3,message:'Your stars aligned today.'}),true);
 assert.equal(c.readCelebration().kind,'book','a second moment waits its turn');
 c.dismissCelebration();assert.equal(c.readCelebration(),null,'Skip ends it immediately');
 c.resetCelebrations();

 fakeBrowser({reduced:true});const quiet=fresh('lib/celebrate');
 quiet.celebrate({kind:'constellation',stars:7,message:'Seven days. Seven little victories.'});
 assert.equal(quiet.readCelebration(),null,'reduced motion: no visual');
 assert.equal(quiet.readAnnouncement(),'Seven days. Seven little victories.','but the feedback is still there');
 fakeBrowser({magic:'quiet'});const q2=fresh('lib/celebrate');q2.celebrate({kind:'starburst',message:'Three days in rhythm.'});
 assert.equal(q2.readCelebration(),null,'Quiet Muse Magic: no visual');
});

test('Muse’s celebration voice rotates and never sounds generic',()=>{
 fakeBrowser();const copy=fresh('lib/celebration-copy');
 for(let i=0;i<40;i++){const a=copy.pickLine('book'),b=copy.pickLine('book');assert.notEqual(a,b,'never the same line twice in a row');}
 const all=Object.values(copy.celebrationCopy).flat().join(' ');
 for(const banned of [/great job/i,/congratulations/i,/achievement unlocked/i,/you should/i])assert.doesNotMatch(all,banned);
 assert.ok(copy.celebrationCopy.book.includes('Another universe explored.'));
});

test('streak tiers reuse the existing streak count and never mark a break',()=>{
 fakeBrowser();const t=fresh('components/rituals/StreakMoments');
 assert.deepEqual([...t.streakTiers],[3,7,14,30,100,365]);
 assert.equal(t.tierFor(2),0);assert.equal(t.tierFor(7),7);assert.equal(t.tierFor(29),14);assert.equal(t.tierFor(400),365);
 const src=read('components/rituals/StreakMoments.tsx');assert.match(src,/tier<=previous\.tier\)return/,'falling streaks are never marked');
 assert.match(read('components/rituals/RitualGroup.tsx'),/ready=\{settled\}/,'only once the save has settled');
});

test('signature moments trigger only after successful saves and keep existing behaviour',()=>{
 const books=read('components/whimsy/Bookshelf.tsx');
 const i=books.indexOf("await saveWhimsyRecord(client,'books',{record,expectedRevision:book.revision");const j=books.indexOf("celebrate({kind:'book'");
 assert.ok(i>0&&j>i,'the book ritual follows the saved finish');assert.match(books,/key:`book:\$\{book\.id\}:\$\{details\.finishedOn\}:/,'once per read');
 const priorities=read('components/PrioritiesCard.tsx');assert.match(priorities,/settled=!!status\?\.loaded&&!status\.pending&&!status\.saving&&!status\.error/);assert.match(priorities,/key:`priorities:\$\{date\}`/);
 const water=read('components/WaterCard.tsx');assert.match(water,/<AchievementBadge achieved=\{achieved\} label="Water goal achieved"/,'the existing water finish is preserved');assert.match(water,/key:`water:\$\{initialDay\.date\}`/);
 assert.match(read('components/rituals/RitualWeekCell.tsx'),/store\.whenSaved\(\(\)=>\{trigger\(feedback\.kind\);playSound/,'habit chimes follow the save');
 assert.match(read('components/whimsy/WeeklySideQuests.tsx'),/onSaved\?\.\(\)/,'the seal chime follows the saved week');
 assert.match(read('components/stream/StreamReaction.tsx'),/if\(ok&&next\)\{setPlay\(n=>n\+1\);playSound/,'Stream reuses the shared sound system');
});

test('motion is tokenized, gated and never continuous',()=>{
 const motion=fresh('lib/motion');for(const k of ['press','settle','success','celebration','milestone','scene'])assert.ok(motion.motion[k]>0,k);
 assert.ok(motion.motionTokens['--ease-out']&&motion.motionTokens['--motion-scene']);
 for(const f of ['components/MuseCelebrations.css','app/muse-magic-motion.css','components/PrioritiesCard.css','components/WaterCard.css']){
  const css=read(f);assert.doesNotMatch(css.slice(css.indexOf('#34')),/animation:[^;]*infinite/,`${f}: no continuous animation`);assert.match(css,/prefers-reduced-motion/,f);}
 assert.match(read('app/muse-magic-motion.css'),/@media \(prefers-reduced-motion:no-preference\)\{\s*\/\*[^*]*\*\/\s*:root:not\(\[data-magic=quiet\]\)/);
 assert.match(read('components/MuseCelebrations.tsx'),/className="muse-cel-skip"/,'every moment can be skipped');
 assert.match(read('components/MuseCelebrations.css'),/\.muse-cel\{[^}]*pointer-events:none/,'never blocks the page');
});
