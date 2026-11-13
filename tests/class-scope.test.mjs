import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {root} from './helpers.mjs';

// Muse CSS is global. Reading Plans and Today's plan (Daily Edit) both use short `.muse-plan-*` names; an unscoped
// Reading Plans rule once turned every Daily Edit task title into an editorial serif. Keep those rules scoped.
test('Reading Plans styles stay inside .muse-plans and cannot restyle Today’s plan',()=>{
 const css=readFileSync(`${root}/components/whimsy/plans/ReadingPlans.css`,'utf8');
 for(const name of ['muse-plan-title','muse-plan-list','muse-plan-more']){
  const selectors=[...css.matchAll(/(^|[},])\s*([^{}@]*\.${name}\b[^{}]*)\{/gm)].map(m=>m[2].trim());
  assert.ok(selectors.length,`${name} is still styled`);
  for(const selector of selectors)for(const part of selector.split(','))if(part.includes(`.${name}`))assert.match(part,/\.muse-plans\b/,`${part.trim()} must be scoped`);
 }
 const plan=readFileSync(`${root}/components/ScheduleCard.css`,'utf8');
 assert.doesNotMatch(plan.match(/\.muse-plan-title \{[^}]*\}/)?.[0]??'',/font-family/,'task titles inherit the interface face');
});
