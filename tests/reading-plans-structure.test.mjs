import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('Reading Plans migration is additive, owner-only and keeps plans as membership only',()=>{
 const sql=read('supabase/migrations/20261215000100_reading_plans.sql').split('\n').filter(l=>!l.trim().startsWith('--')).join('\n');
 assert.doesNotMatch(sql,/drop\s+(table|column)|alter\s+table\s+public\.whimsy_books|truncate|delete\s+from\s+public\.whimsy_books/i);
 assert.match(sql,/enable row level security/);assert.match(sql,/unique \(user_id, period_kind, period, book_id\)/);assert.match(sql,/on delete cascade/);
 assert.doesNotMatch(sql,/\bstatus\b\s+text|\brating\b/,'a plan stores no status or rating of its own');
 assert.doesNotMatch(sql,/security definer/i,'functions run as the caller so row level security applies');
});
test('Reading Plans UI shares one planner between the Dashboard and the full view, with accessible reordering',()=>{
 const plans=read('components/whimsy/plans/ReadingPlans.tsx'),shelf=read('components/whimsy/Bookshelf.tsx'),css=read('components/whimsy/plans/ReadingPlans.css');
 assert.match(shelf,/<ReadingPlans [^>]*variant="dashboard"/);assert.match(shelf,/<ReadingPlans [^>]*variant="full"/);
 assert.match(plans,/onKeyDown=\{keys\}/,'arrow keys reorder');assert.match(plans,/Move up/);assert.match(plans,/Move down/);
 assert.match(css,/\.muse-plan-handle\{[^}]*touch-action:none/,'only the handle blocks scrolling');
 assert.doesNotMatch(plans,/status===|setStatus|updateStatus/,'plans never write a status');
});
test('Up Next migration is additive, three-slot, one-book-per-slot and owner-only; the UI never writes a status',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261216000100_up_next.sql',import.meta.url),'utf8').split('\n').filter(l=>!l.trim().startsWith('--')).join('\n');
 assert.doesNotMatch(sql,/drop\s+(table|column)|alter\s+table\s+public\.whimsy_books|truncate/i);
 assert.match(sql,/slot between 0 and 2/);assert.match(sql,/unique \(user_id, book_id\)/);assert.match(sql,/enable row level security/);assert.doesNotMatch(sql,/security definer/i);
 const ui=read('components/whimsy/upnext/UpNext.tsx')+read('components/whimsy/upnext/UpNextFlow.tsx')+read('lib/books/use-up-next.ts');
 assert.doesNotMatch(ui,/status:\s*'reading'|setStatus|moveBook/,'Up Next never changes a status; starting goes through the existing start flow');
});
