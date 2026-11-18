// Fortune & Fun (Fortunes & Nonsense + Weekly Side Quests) is hidden for now: no invitations in, nothing deleted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';
const V = load('lib/module-visibility'), N = load('lib/navigation'), S = load('lib/stream/model'), A = load('lib/profile/adapters'), W = load('lib/whimsy/integrations'), PM = load('lib/profile/model');

test('Fortune & Fun is hidden everywhere it invites you in', () => {
  assert.ok(V.isHidden('fortune-fun'));
  assert.ok(!N.navigation.some((i) => i.id === 'fortune-fun') && !N.mobileMoreIds.includes('fortune-fun'), 'not in the sidebar or More');
  assert.ok(N.allDestinations.some((i) => i.id === 'fortune-fun' && i.href === '/whimsy/side-quests'), 'the destination and its route remain');
  assert.ok(!S.shortcuts.some((s) => ['fortunes', 'side-quests'].includes(s.id)), 'no new Fortune or Side Quest posts');
  assert.ok(!S.shortcuts.some((s) => s.kinds.some((k) => ['fortune', 'side-quest'].includes(k))), 'Celebrating no longer offers side quests');
  assert.equal(S.shortcutById('fortunes')?.label, 'Fortunes', 'earlier posts still render with their label');
  assert.ok(!A.adapterOrder.includes('side-quest') && A.adapters['side-quest'], 'Showcase stops offering side quests but can still display them');
  assert.ok(PM.starterIdeas.length > 0 && !PM.starterIdeas.some((t) => t.suggest?.includes('side-quest')), 'Showcase starter ideas no longer suggest side quests');
  const prefs = ['side-quests', 'fortunes', 'tarot', 'dreamscapes'].map((experience) => ({ experience, enabled: true }));
  const shown = W.configuredWhimsyWidgets(prefs).map((w) => w.experience);
  assert.ok(!shown.includes('side-quests') && !shown.includes('fortunes') && shown.includes('tarot'), 'Daily Edit widgets for hidden experiences stay off even if they were turned on');
});
