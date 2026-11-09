import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const read=f=>readFileSync(resolve(root,f),'utf8');

test('#105 one memory per local day, enforced by the database and handled on retry',()=>{
 const sql=read('supabase/migrations/20261126000100_daily_memories.sql');
 assert.match(sql,/unique \(user_id, local_date\)/);assert.match(sql,/char_length\(btrim\(body\)\) between 1 and 500/);
 assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.daily_memories from public, anon, authenticated/);
 for(const p of ['owner_read','owner_insert','owner_update','owner_delete'])assert.match(sql,new RegExp(`create policy ${p} on public\\.daily_memories`));
 const lib=read('lib/memories.ts');assert.match(lib,/r\.error\.code!=='23505'/,'a concurrent insert for the same day updates that memory instead of duplicating');
 const M=load('lib/memories');assert.equal(M.cleanBody('  hi  '),'hi');assert.equal(M.cleanBody('x'.repeat(900)).length,500);assert.equal(M.cleanEmoji('  '),null);
});

test('#105 Little Moment lives in Day Pulse (also on the Mood tab) but saves independently; Day in Three unchanged',()=>{
 const pulse=read('components/DayPulseCard.tsx');
 assert.match(pulse,/<\/DailyCapture>[\s\S]*<LittleMoment date=\{date\} \/>/,'outside the Day Pulse save wrapper, so Reset/ratings never touch it');
 assert.match(pulse,/update\(\{ energy: null, stress: null, overallDay: null \}\)/,'Reset still only clears the ratings');
 assert.doesNotMatch(read('components/DayInThree.tsx'),/LittleMoment|memor/i);
 const mood=read('components/mood/Mood.tsx');assert.doesNotMatch(mood,/<LittleMoment date=\{date\}\/>/,'#12: shown once, inside Day Pulse on the Mood tab');assert.match(read('components/mood/MoodCheckInLayout.tsx'),/<DayPulseCard date=\{date\}\/>/);assert.match(mood,/memories\.map\(m=>m\.date\)/,'memory-only days still appear in Mood history');
 assert.match(read('components/memories/LittleMoment.tsx'),/What’s one thing you’ll remember about today\?/);
 assert.match(read('app/api/account/export/route.ts'),/dailyMemories:dailyMemories\.data/);
});

test('#105 carousels: Little Moments, Bright Days and month Intentions page compactly, never a long list',()=>{
 const {EntryCarousel}=load('components/design/EntryCarousel');
 const items=Array.from({length:365},(_,i)=>({id:`d${i}`,label:`Day ${i+1}`}));
 const html=renderToStaticMarkup(React.createElement(EntryCarousel,{items,label:'Little moments',itemKey:x=>x.id,describe:x=>x.label,render:x=>React.createElement('p',null,x.label)}));
 assert.equal((html.match(/muse-entry-carousel-item/g)??[]).length,3,'only one page mounted, however many entries');
 assert.match(html,/1–3 of 365/);assert.match(html,/aria-roledescription="carousel"/);assert.match(html,/Previous Little moments/);
 const end=renderToStaticMarkup(React.createElement(EntryCarousel,{items:items.slice(0,10),label:'x',startAtEnd:true,itemKey:x=>x.id,describe:x=>x.label,render:x=>x.label}));
 assert.match(end,/10 of 10/,'memories open on the most recent page');
 const S=read('components/insights/glance/GlanceSections.tsx');
 assert.match(S,/<EntryCarousel items=\{best\} label="Bright days"/);assert.match(S,/<EntryCarousel items=\{memories\} label="Little moments"/);
 assert.match(read('components/insights/glance/InsightsGlance.tsx'),/<MonthIntentions days=\{range\.days\} intentions=\{daily\.intentions\}/,'#104: month intentions are a chronological list');
 const G=load('lib/insights/glance'),days={},ci=[];for(let i=1;i<=20;i++){const d=`2026-11-${String(i).padStart(2,'0')}`;days[d]={record:{date:d,intention_text:'',intention_emoji:null,day_in_three:[],energy:null,stress:null,overall_day:9},priorities:[],checkins:[]};}
 assert.equal(G.dailyGlance(days,ci,[],G.glanceRange('month','2026-11-04')).rating.best.length,20,'same Bright Days criteria; the carousel can show them all');
});
