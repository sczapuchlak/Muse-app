import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('Reading Plans migration is additive, owner-only and keeps plans as membership only',()=>{
 const sql=read('supabase/migrations/20261215000100_reading_plans.sql').split('\n').filter(l=>!l.trim().startsWith('--')).join('\n');
 assert.doesNotMatch(sql,/drop\s+(table|column)|alter\s+table\s+public\.whimsy_books|truncate|delete\s+from\s+public\.whimsy_books/i);
 assert.match(sql,/enable row level security/);assert.match(sql,/unique \(user_id, period_kind, period, book_id\)/);assert.match(sql,/on delete cascade/);
 assert.doesNotMatch(sql,/\bstatus\b\s+text|\brating\b/,'a plan stores no status or rating of its own');
 assert.doesNotMatch(sql,/security definer/i,'functions run as the caller so row level security applies');
});
test('Reading Plans live on their own page (Nov 26), with accessible reordering; the Dashboard shows Up Next instead',()=>{
 const plans=read('components/whimsy/plans/ReadingPlans.tsx'),shelf=read('components/whimsy/Bookshelf.tsx'),css=read('components/whimsy/plans/ReadingPlans.css');
 assert.doesNotMatch(shelf,/<ReadingPlans [^>]*variant="dashboard"/,'plans are made in Plans, not on the Dashboard');assert.match(shelf,/<ReadingPlans [^>]*variant="full"/);
 assert.match(shelf,/<BooksHomeTop /,'the Dashboard shows streak, Up next and Goals');
 assert.match(plans,/onKeyDown=\{keys\}/,'arrow keys reorder');assert.match(plans,/Move up/);assert.match(plans,/Move down/);
 assert.match(css,/\.muse-plan-handle\{[^}]*touch-action:none/,'only the handle blocks scrolling');
 assert.doesNotMatch(plans,/setStatus|updateStatus|status:\s*['"]/,'plans never write a status');
});
test('Up Next migration is additive, three-slot, one-book-per-slot and owner-only; the UI never writes a status',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261216000100_up_next.sql',import.meta.url),'utf8').split('\n').filter(l=>!l.trim().startsWith('--')).join('\n');
 assert.doesNotMatch(sql,/drop\s+(table|column)|alter\s+table\s+public\.whimsy_books|truncate/i);
 assert.match(sql,/slot between 0 and 2/);assert.match(sql,/unique \(user_id, book_id\)/);assert.match(sql,/enable row level security/);assert.doesNotMatch(sql,/security definer/i);
 const ui=read('components/whimsy/plans/Roulette.tsx')+read('lib/books/up-next.ts');
 assert.doesNotMatch(ui,/status:\s*'reading'|setStatus|moveBook/,'the wheel never changes a status; starting goes through the existing start flow');
});
test('Up Next reads from the plans (Nov 26): no Up Next store of its own, one wheel, Start reading reuses the start flow',()=>{
 const shelf=read('components/whimsy/Bookshelf.tsx'),plans=read('components/whimsy/plans/ReadingPlans.tsx'),home=read('components/whimsy/goals/BooksHome.tsx');
 assert.doesNotMatch(shelf,/<UpNext\b|upnext\/UpNext/,'the old slot-based Up Next card is gone');
 assert.match(home,/upNextQueue\(|upNextFromPlans\(/,'Up next on the Dashboard is derived from plan entries');assert.doesNotMatch(home,/save_up_next|up_next_slots/,'it never writes a queue of its own');
 assert.equal(shelf.split('\n').filter(l=>l.includes('<ReadingPlans ')&&l.includes("onStart={book=>void timerAction('start',book)}")).length,1,'the planner starts books through the existing timer start');
 assert.match(plans,/<Roulette /,'Spin to add uses the existing wheel');assert.match(plans,/Spin to add/);assert.match(plans,/Add books/);
 assert.match(plans,/initialSource="tbr"/,'the wheel starts on To Be Read');assert.match(plans,/taken=\{taken\}/,'books already in the plan are not offered');
 assert.match(plans,/adoptUpNext/,'old Up Next books are handed to the plan once');
 assert.doesNotMatch(plans,/setStatus|updateStatus|status:\s*['"]/,'plans never write a status');
 assert.ok(!existsSync(new URL('../components/whimsy/upnext/UpNext.tsx',import.meta.url)),'no second Up Next component remains');
});
test('Daily Edit\'s Bookshelf card uses the liquid meter, and daily-goal data stays derived (no counters, no migration)',()=>{
 assert.doesNotMatch(read('components/whimsy/BooksDayviewWidget.tsx'),/<progress/);assert.match(read('components/whimsy/BooksDayviewWidget.tsx'),/muse-desk-pool/);
 const lib=read('lib/whimsy/daily-goal.ts')+read('lib/whimsy/celebrations.ts');assert.doesNotMatch(lib,/streakCount|incrementStreak|localStorage|saveWhimsyRecord/,'goal streaks are recalculated from sessions, never stored');
});
test('Recently finished shows finished books (not sessions) and Recent reading sessions is its own container',()=>{
 const d=read('components/whimsy/BooksDashboard.tsx');
 assert.match(d,/export function RecentlyFinished/);assert.match(d,/completionEvents\(books\)/);assert.match(d,/export function RecentSessions/);
 const home=read('components/whimsy/goals/HomeV3.tsx');assert.match(home,/export function RecentActivity/);assert.match(home,/completionEvents\(books\)/,'finished books come from finished reads');assert.match(home,/sessions\.map\(/,'sittings are their own rows');assert.match(read('components/whimsy/goals/BooksHome.tsx'),/<RecentActivity /);
 assert.match(read('components/whimsy/BookSearch.tsx'),/<MuseSearch /,'Book search uses the shared Muse search field');
});
