import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const read=f=>readFileSync(resolve(root,f),'utf8');

test('#101 compact toolbar titles: short ranges, year only when it is not this year',()=>{
 const D=load('lib/dates');
 assert.equal(D.compactDateRange('2026-11-12','2026-11-14','2026-11-09'),'Nov 12 – 14');
 assert.equal(D.compactDateRange('2026-11-30','2026-12-02','2026-11-09'),'Nov 30 – Dec 2');
 assert.equal(D.compactDateRange('2026-12-30','2027-01-01','2026-11-09'),'Dec 30 – Jan 1, 2027');
 assert.equal(D.compactDateRange('2027-03-02','2027-03-04','2026-11-09'),'Mar 2 – 4, 2027');
 const A=load('lib/agenda');
 assert.equal(A.compactAgendaTitle('day','2026-11-09','2026-11-09'),'Mon, Nov 9');
 assert.equal(A.compactAgendaTitle('month','2026-11-09','2026-11-09'),'November');
 assert.equal(A.compactAgendaTitle('month','2027-01-09','2026-11-09'),'January 2027');
});

test('#101 phone density is a per-device choice that defaults to Comfortable',()=>{
 const M=load('lib/mobile-density');
 assert.deepEqual([...M.mobileDensities],['comfortable','compact']);
 assert.equal(M.parseMobileDensity('compact'),'compact');
 assert.equal(M.parseMobileDensity('huge'),'comfortable');
 assert.equal(M.serverMobileDensity(),'comfortable');
 assert.match(read('app/design-language.css'),/:root\[data-mobile-density=compact\] \.muse-page\{/);
});

test('#101 the shared date setter keeps one identity so URL re-syncs cannot snap Today back',()=>{
 const s=read('components/MuseSession.tsx');
 assert.match(s,/const setDate=useCallback</);
 assert.match(s,/\},\[\]\);/);
});

test('#101 shared phone patterns exist once and screens use them',()=>{
 const css=read('app/design-language.css');
 for(const pattern of ['.muse-search-row','.muse-control-row','.muse-scroll-fade','.muse-phone-only','.muse-wide-only'])assert.ok(css.includes(pattern),pattern);
 for(const f of ['components/envision/bucket/BucketList.tsx','components/collections/Collections.tsx','components/money/Money.tsx','components/money/MoneyRecurring.tsx'])assert.match(read(f),/muse-search-row/,f);
 assert.match(read('components/planner/PlannerUtilities.tsx'),/data-rows="date-actions"/);
 assert.match(read('components/planner/Agenda.tsx'),/data-rows="date-actions"/);
 assert.match(read('components/rituals/Rituals.tsx'),/muse-rituals-phone-actions muse-phone-only/);
});

test('#101 the phone nav stays fixed; the More menu docks above it; the planner board fills the width',()=>{
 const shell=read('components/AppShell.css');
 assert.match(shell,/\.muse-bottom-navigation \{ position: fixed;/);
 assert.match(shell,/#muse-more-navigation\.muse-popover-panel \{[^}]*bottom: calc\(/);
 assert.match(read('components/AppShell.tsx'),/visualViewport/);
 assert.match(read('components/planner/Planner.css'),/@container muse-content \(max-width: 820px\) \{ \.muse-planner-layout \{ grid-template-columns: minmax\(0, 1fr\); \} \}/);
});

test('#101 light-card themes: newly found surfaces use the card ink, and phone popovers back onto the card',()=>{
 const s=read('app/surfaces.css');
 assert.match(s,/:root:is\(\[data-theme="astral"\],\[data-theme="nightbloom"\]\) :is\(\.muse-profile-hero, \.muse-showcase, \.muse-envision-empty, \.muse-intentions-start,/);
 assert.match(s,/\.muse-popover-panel,dialog \.muse-popover-panel\)\{background:linear-gradient\(var\(--floating-background\),var\(--floating-background\)\),var\(--glass-background\)\}/);
});
