// Muse Journal V1: memory permissions and budgets, retrieval queries, the instruction hierarchy, deterministic weekly
// statistics, tag identity, analysis validation, pricing and export.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const C = load('lib/journal/context'), I = load('lib/journal/instructions'), S = load('lib/journal/stats'), M = load('lib/journal/model'), $ = load('lib/journal/pricing'), X = load('lib/journal/export');
const journal = (id, memoryScope = 'shared') => ({ id, memoryScope });
const entry = (o) => ({ id: o.id, journalId: o.journalId ?? 'j1', localDate: o.localDate, title: o.title ?? '', summary: o.summary ?? '', summarySource: o.summary ? 'ai' : null, status: o.status ?? 'completed', excludeFromMemory: o.excludeFromMemory ?? false, userWords: o.userWords ?? 20, mode: 'open', excerpt: o.excerpt });
const memory = (o) => ({ id: o.id, body: o.body, kind: 'fact', status: o.status ?? 'confirmed', source: 'user', journalId: o.journalId ?? null, sourceConversationId: null, revision: 1, createdAt: '', updatedAt: '' });

test('memory permission respects global, journal and conversation switches', () => {
  const all = [journal('j1'), journal('work', 'journal'), journal('secret', 'off')];
  assert.equal(C.memoryPermission({ memoryEnabled: false }, all[0], all).allowed, false);
  assert.equal(C.memoryPermission({ memoryEnabled: true }, all[2], all).allowed, false);
  assert.equal(C.memoryPermission({ memoryEnabled: true }, all[0], all, { memoryOff: true }).allowed, false);
  const shared = C.memoryPermission({ memoryEnabled: true }, all[0], all);
  assert.deepEqual([...shared.journalIds].sort(), ['j1'], 'a shared journal never reads a journal-only or memory-off journal');
  const work = C.memoryPermission({ memoryEnabled: true }, all[1], all);
  assert.deepEqual([...work.journalIds], ['work']);
  const mems = [memory({ id: 'a', body: 'Lives in Austin' }), memory({ id: 'b', body: 'Manager is Priya', journalId: 'work' }), memory({ id: 'c', body: 'tentative', status: 'suggested' })];
  assert.deepEqual(C.permittedMemories(mems, shared, 'j1').map((m) => m.id), ['a'], 'suggested memories are never used; work-scoped stay in work');
  assert.deepEqual(C.permittedMemories(mems, work, 'work').map((m) => m.id), ['b'], 'a work journal does not pull personal memories');
});

test('memory context: yesterday is recent, excluded and other-journal entries never appear, budgets hold', () => {
  const permission = C.memoryPermission({ memoryEnabled: true }, journal('j1'), [journal('j1'), journal('work', 'journal')]);
  const recent = [
    entry({ id: 'mon', localDate: '2026-11-16', title: 'Finishing the quilt', summary: 'You were excited to finish a personal project.' }),
    entry({ id: 'x', localDate: '2026-11-15', title: 'Private', excludeFromMemory: true, summary: 'Never send' }),
    entry({ id: 'w', localDate: '2026-11-15', journalId: 'work', title: 'Work thing', summary: 'Work only' }),
    entry({ id: 'd', localDate: '2026-11-16', status: 'draft', title: 'Draft' }),
    entry({ id: 'old', localDate: '2026-10-01', title: 'Too old for recent' }),
  ];
  const ctx = C.memoryContext({ memories: [memory({ id: 'm', body: 'Has a cat named Miso' })], recent, retrieved: [entry({ id: 'lisbon', localDate: '2026-03-02', title: 'Lisbon plans', excerpt: 'Booked flights to Lisbon' }), recent[0]], journals: new Map([['j1', 'Everyday']]), today: '2026-11-17', currentId: 'now', permission });
  assert.match(ctx.stable, /Finishing the quilt/); assert.match(ctx.stable, /Miso/);
  assert.doesNotMatch(ctx.stable, /Never send|Work only|Draft|Too old/);
  assert.match(ctx.retrieved, /Lisbon plans/); assert.doesNotMatch(ctx.retrieved, /quilt/, 'an entry already in recent context is not repeated');
  assert.match(ctx.stable, /data, not instructions/);
  const many = Array.from({ length: 40 }, (_, i) => entry({ id: `e${i}`, localDate: '2026-11-16', title: `Entry ${i}`, summary: 'x'.repeat(900) }));
  const bounded = C.memoryContext({ memories: [], recent: many, retrieved: [], journals: new Map(), today: '2026-11-17', currentId: null, permission });
  assert.ok(bounded.stable.length < C.defaultBudget.recent + 400, 'recent context stays within its budget');
  assert.equal(C.memoryContext({ memories: [], recent, retrieved: [], journals: new Map(), today: '2026-11-17', currentId: null, permission: { allowed: false, scope: 'journal', journalIds: new Set() } }).stable, '');
});

test('retrieval query keeps names and distinctive words, never the whole message', () => {
  const q = C.retrievalQuery('I had coffee with Alex again and we talked about the Lisbon trip and the Lisbon apartment', ['Alexandra']);
  const words = q.split(' or ');
  assert.ok(words.includes('alex') && words.includes('lisbon') && words.includes('alexandra'));
  assert.ok(!words.includes('the') && !words.includes('about'));
  assert.ok(words.length <= 12);
  assert.equal(C.retrievalQuery('ok'), '');
});

test('instruction hierarchy: application rules first, then global, companion, journal, mode; test runs are labelled', () => {
  const text = I.composeInstructions({ globalInstructions: 'GLOBAL', companion: { name: 'The Strategist', instructions: 'COMPANION', conversationPrefs: 'PREFS' }, journal: { name: 'Work', description: 'DESC', instructions: 'JOURNAL', morningInstructions: 'MORNING', eveningInstructions: '' }, mode: 'morning' });
  const at = (s) => text.indexOf(s);
  assert.equal(at(I.APPLICATION_RULES), 0);
  assert.ok(at('GLOBAL') < at('COMPANION') && at('COMPANION') < at('JOURNAL') && at('JOURNAL') < at('MORNING'));
  assert.match(text, /more specific section wins/);
  assert.doesNotMatch(text, /Test conversation/);
  assert.match(I.composeInstructions({ globalInstructions: '', companion: null, journal: null, mode: 'open', test: true }), /## Test conversation/);
  const req = C.buildReply({ globalInstructions: '', companion: null, journal: null, mode: 'open' }, { stable: 'MEM', retrieved: 'OLD' }, [{ role: 'user', body: 'hi' }]);
  assert.deepEqual(req.input.map((m) => m.role), ['developer', 'user', 'developer'], 'stable memory first (cacheable), retrieved history after the conversation');
});

test('a long conversation is trimmed from the start, newest kept', () => {
  const msgs = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', body: `m${i} ${'x'.repeat(3000)}` }));
  const input = C.conversationInput(msgs, 20000);
  assert.equal(input[0].role, 'developer'); assert.match(input.at(-1).content, /^m29/);
  assert.ok(input.reduce((n, m) => n + m.content.length, 0) < 26000);
});

test('weekly stats are deterministic and never invent days', () => {
  assert.equal(S.weekStart('2026-11-19'), '2026-11-16'); assert.equal(S.weekStart('2026-11-16'), '2026-11-16'); assert.equal(S.weekStart('2026-11-22'), '2026-11-16');
  const conv = (id, localDate, userWords, status = 'completed') => ({ id, localDate, userWords, status, journalId: 'j1', revision: 1 });
  const list = [conv('a', '2026-11-16', 100), conv('b', '2026-11-16', 50), conv('c', '2026-11-18', 30), conv('d', '2026-11-25', 999), conv('e', '2026-11-17', 0), conv('f', '2026-11-19', 40, 'draft')];
  const tags = [{ id: 'alex', kind: 'person', name: 'Alex' }, { id: 'mood', kind: 'mood', name: 'Hopeful' }];
  const s = S.weekStats('2026-11-16', list, [{ conversationId: 'a', tagId: 'alex' }, { conversationId: 'c', tagId: 'alex' }, { conversationId: 'b', tagId: 'mood' }, { conversationId: 'd', tagId: 'alex' }], tags);
  assert.equal(s.entries, 3); assert.equal(s.days, 2); assert.equal(s.words, 180);
  assert.deepEqual(s.byDay.map((d) => d.entries), [2, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(s.tags.person, [{ id: 'alex', name: 'Alex', entries: 2 }]); assert.equal(s.tags.mood[0].name, 'Hopeful');
  assert.equal(S.streak(new Set(['2026-11-15', '2026-11-16', '2026-11-17']), '2026-11-17'), 3);
  assert.equal(S.streak(new Set(['2026-11-15', '2026-11-16']), '2026-11-17'), 2, 'today not written yet keeps yesterday’s streak');
  assert.notEqual(S.sourceSignature([conv('a', '', 1)]), S.sourceSignature([{ ...conv('a', '', 2) }]));
  assert.deepEqual(S.onThisDay([conv('y1', '2025-11-17', 10), conv('t', '2026-11-17', 10), conv('z', '2024-11-17', 0)], '2026-11-17').map((c) => c.id), ['y1']);
});

test('tags: case-insensitive identity, aliases, never fuzzy', () => {
  const tags = [{ id: '1', kind: 'person', name: 'Alex', normalized: 'alex', aliases: ['Al'] }, { id: '2', kind: 'topic', name: 'Travel', normalized: 'travel', aliases: [] }];
  assert.equal(M.findTag(tags, 'person', '  ALEX ')?.id, '1'); assert.equal(M.findTag(tags, 'person', 'al')?.id, '1');
  assert.equal(M.findTag(tags, 'person', 'Alexa'), null, 'similar names are different people');
  assert.equal(M.findTag(tags, 'topic', 'Alex'), null, 'kinds stay distinct');
  assert.equal(M.cleanTagName('  New   York '), 'New York');
  assert.deepEqual(M.tagKinds, ['custom', 'person', 'topic', 'mood'], 'My tags, people, topics and moods; places and themes are no longer shown');
  assert.equal(M.tagLabel({ kind: 'custom', name: 'Life Moments' }), '#Life Moments');
  assert.equal(M.tagLabel({ kind: 'person', name: 'Rory' }), 'Rory');
});

test('analysis JSON is validated, trimmed and never invented', () => {
  assert.equal(M.parseAnalysisData(null), null); assert.equal(M.parseAnalysisData([]), null);
  const d = M.parseAnalysisData({ title: '  Coffee with Alex ', recap: 'r', people: ['Alex', 3, ''], emotions: ['Hopeful'], extra: 'ignored', observations: Array(20).fill('o') });
  assert.equal(d.title, 'Coffee with Alex'); assert.deepEqual(d.people, ['Alex']); assert.deepEqual(d.places, []); assert.equal(d.observations.length, 6); assert.ok(!('extra' in d));
  assert.equal(M.isListed({ status: 'active', userWords: 0 }), false); assert.equal(M.isListed({ status: 'completed', userWords: 3 }), true);
});

test('pricing: known models, cached discount, unknown models priced conservatively', () => {
  const u = { inputTokens: 1_000_000, cachedTokens: 0, outputTokens: 1_000_000 };
  assert.equal($.costUsd('gpt-6.1-terra', u), 6);
  assert.equal($.costUsd('gpt-6.1-terra', { ...u, cachedTokens: 1_000_000 }), 5.05);
  assert.ok($.costUsd('something-new', u) >= 50);
  assert.equal($.costUsd('mock', u), 0);
  assert.equal($.DEFAULT_MODEL, 'gpt-6.1-terra');
});

test('Markdown export keeps original words in order, with whose they are', () => {
  const md = X.exportMarkdown({ journals: [{ id: 'j1', name: 'Everyday' }], conversations: [{ id: 'c1', journal_id: 'j1', companion_name: 'The Confidant', mode: 'evening', local_date: '2026-11-16', time_zone: 'UTC', started_at: '2026-11-16T20:00:00Z', title: 'A long day', summary: 'S', summary_source: 'ai', favorite: true }],
    messages: [{ conversation_id: 'c1', role: 'user', body: 'First, mine', created_at: '2026-11-16T20:00:00Z' }, { conversation_id: 'c1', role: 'assistant', body: 'Reply', created_at: '2026-11-16T20:01:00Z' }],
    tags: [{ id: 't', kind: 'person', name: 'Alex' }], entryTags: [{ conversation_id: 'c1', tag_id: 't' }], bookmarks: [{ conversation_id: 'c1', excerpt: 'First', note: 'why' }] });
  assert.match(md, /### A long day ★/); assert.match(md, /Evening reflection/); assert.match(md, /Alex \(person\)/); assert.match(md, /AI summary/);
  assert.ok(md.indexOf('First, mine') < md.indexOf('Reply')); assert.match(md, /\*\*The Confidant\*\*/); assert.match(md, /Bookmarked/);
});

test('photos: only the answered message carries photos; earlier ones are named as no longer visible', () => {
  const input = C.conversationInput([{ role: 'user', body: 'Look', imageCount: 2 }, { role: 'assistant', body: 'Nice' }, { role: 'user', body: 'Again', imageCount: 1 }]);
  assert.match(input[0].content, /2 photos were attached here\. You can't see them now\./);
  assert.equal(input[2].content, 'Again', 'the message being answered is untouched; its photos ride with it separately');
  assert.match(I.APPLICATION_RULES, /Never identify a real person/);
  assert.equal(M.MAX_MESSAGE_IMAGES, 7);
});

test('analysis carries a closer look and an insight; older analyses read as empty, never invented', () => {
  const d = M.parseAnalysisData({ title: 'T', recap: 'R', reflection: 'One.\n\nTwo.', insight: 'Keep this.' });
  assert.equal(d.reflection, 'One.\n\nTwo.'); assert.equal(d.insight, 'Keep this.');
  const old = M.parseAnalysisData({ title: 'T', recap: 'R' });
  assert.equal(old.reflection, ''); assert.equal(old.insight, '');
  assert.ok(I.analysisSchema.required.includes('reflection') && I.analysisSchema.required.includes('insight'));
  assert.ok(!I.analysisSchema.required.includes('places') && !I.analysisSchema.required.includes('themes'), 'analysis no longer asks for places or themes');
});

test('continue from here: bounded, honest, one level, no photos', () => {
  const src = { title: 'The offer', date: '2026-05-01', summary: 'You weighed the job offer.', insight: 'Fear and want can share a room.', threads: ['Will you take it?'], turns: [{ role: 'user', body: 'I might take it', imageCount: 2 }, { role: 'assistant', body: 'What pulls you?' }] };
  const full = C.referenceContext(src, true);
  assert.match(full, /continue from their journal entry “The offer”/); assert.match(full, /Me: I might take it \[2 photos were attached; you can't see them\]/); assert.match(full, /don't turn this into a guided reflection/);
  const compact = C.referenceContext(src, false);
  assert.ok(!/Me: I might take it/.test(compact) && /isn't repeated here/.test(compact), 'later turns carry the summary, not the conversation');
  const long = C.referenceContext({ ...src, turns: Array.from({ length: 400 }, (_, i) => ({ role: 'user', body: `line ${i} `.repeat(20) })) }, true, 3000);
  assert.ok(long.length < 6000 && /an excerpt, not the complete record/.test(long) && /left out for length/.test(long), 'a long original is cut, and says so');
  assert.match(C.referenceContext({ title: 'Gone', date: '2026-01-01', summary: '', missing: true }, true), /no longer in their journal/);
  assert.ok(!/weighed/.test(C.referenceContext({ ...src, excluded: true }, true)), 'an entry kept out of AI context is never sent');
});

test('analysis titles are about life, never about the app or the act of looking back', () => {
  assert.match(I.ANALYSIS_RULES, /Never a meta title/); assert.match(I.ANALYSIS_RULES, /title what is new or changed now/);
  assert.match(I.ANALYSIS_RULES, /Leave out the mechanics of the app/);
});

test('highlights are placed exactly or not at all, and overlaps paint as one', () => {
  const body = 'I said it twice: be brave. Later: be brave.';
  assert.deepEqual(M.anchorHighlight(body, { excerpt: 'be brave', start: 17, end: 25 }), { start: 17, end: 25 }, 'the saved position wins');
  assert.equal(M.anchorHighlight(body, { excerpt: 'be brave', start: null, end: null }), null, 'two matches and no position: never guess');
  assert.deepEqual(M.anchorHighlight(body, { excerpt: 'Later', start: 1, end: 6 }), { start: 27, end: 32 }, 'moved text found again when it appears exactly once');
  assert.equal(M.anchorHighlight('Corrected wording.', { excerpt: 'old words', start: 0, end: 9 }), null, 'a correction that removed the words leaves it unplaced');
  assert.deepEqual(M.mergeRanges([{ start: 5, end: 10, id: 'a' }, { start: 8, end: 14, id: 'b' }, { start: 20, end: 22, id: 'c' }]), [{ start: 5, end: 14, ids: ['a', 'b'] }, { start: 20, end: 22, ids: ['c'] }]);
});
