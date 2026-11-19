// Journal history: entity-aware recall of older (including imported) entries, and the source-agnostic import core —
// validation that never rewrites words, duplicate keys, the preview, the enrichment estimate, the Muse JSON adapter,
// the not-yet-mapped Rosebud path, and an import runner that is safe to re-run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const R2 = load('lib/journal/import/rosebud'), C = load('lib/journal/context'), IM = load('lib/journal/import/model'), A = load('lib/journal/import/adapters'), R = load('lib/journal/import/run');
const tag = (id, kind, name, aliases = [], suppressed = false) => ({ id, kind, name, aliases, suppressed });
const entry = (o) => ({ id: o.id, journalId: o.journalId ?? 'j1', localDate: o.localDate, title: o.title ?? '', summary: o.summary ?? '', summarySource: o.summarySource ?? (o.summary ? 'ai' : null), status: 'completed', excludeFromMemory: o.excludeFromMemory ?? false, userWords: 20, mode: 'open', excerpt: o.excerpt, snippet: o.snippet, importedFrom: o.importedFrom ?? null, why: o.why });
const permission = C.memoryPermission({ memoryEnabled: true }, { id: 'j1', memoryScope: 'shared' }, [{ id: 'j1', memoryScope: 'shared' }]);

test('entity matching: names and confirmed aliases, word-bounded, capitalised people, never look-alikes or removed tags', () => {
  const tags = [tag('jamie', 'person', 'Jamie'), tag('sun', 'person', 'Sun', ['Son']), tag('paris', 'place', 'Paris'), tag('career', 'topic', 'Career'), tag('gone', 'person', 'Harvey', [], true), tag('art', 'topic', 'Art')];
  const ids = (latest, earlier) => C.matchEntities(tags, latest, earlier).map((m) => m.tagId);
  assert.deepEqual(ids('Girl, guess who messaged me again? Jamie!'), ['jamie']);
  assert.deepEqual(ids('I sat in the sun all afternoon'), [], 'the sun is not Sun the person');
  assert.deepEqual(ids('Son said the review went fine'), ['sun'], 'a confirmed alias reaches the canonical person');
  assert.deepEqual(ids('Jamiee and Jami and Jamieson'), [], 'similar names are never the same person');
  assert.deepEqual(ids('Harvey called'), [], 'a tag removed everywhere is never used');
  assert.deepEqual(ids('thinking about my career again'), ['career'], 'topics match regardless of case');
  assert.deepEqual(ids('I love art'), [], 'very short one-word topics are too ambiguous to match');
  const follow = C.matchEntities(tags, 'what do you think he wants?', ['Jamie texted me']);
  assert.deepEqual(follow.map((m) => [m.tagId, m.inLatest]), [['jamie', false]], 'a follow-up keeps the person named a message ago');
  assert.deepEqual(ids('Paris with Jamie, then career stuff').slice(0, 2), ['jamie', 'paris'], 'people come before places and topics');
});

test('ranking interleaves people with word matches, so one person cannot crowd out everything', () => {
  const r = C.rankRetrieved([{ name: 'Jamie', ids: ['j3', 'j2', 'j1'] }, { name: 'Paris', ids: ['p1'] }], ['s1', 'j2', 's2']);
  assert.deepEqual(r.map((x) => x.id), ['j3', 'p1', 's1', 'j2', 's2', 'j1']);
  assert.deepEqual(r.find((x) => x.id === 'j2').why, ['tag:Jamie', 'search'], 'an entry found both ways keeps both reasons');
  assert.ok(C.rankRetrieved([{ name: 'A', ids: Array.from({ length: 30 }, (_, i) => `a${i}`) }], [], 5).length === 5);
});

test('recalled history is dated, labelled with where it came from, bounded and never framed as current fact', () => {
  const retrieved = [
    entry({ id: 'r1', localDate: '2025-03-02', title: 'Jamie at the gallery', summary: 'They met Jamie at an opening and wondered if he was interested.', summarySource: 'import', importedFrom: 'rosebud', snippet: 'I think Jamie might be interested', why: ['tag:Jamie', 'search'] }),
    entry({ id: 'r2', localDate: '2026-06-10', title: 'Coffee', excerpt: 'Jamie and I got coffee', why: ['tag:Jamie'] }),
  ];
  const entities = [{ name: 'Jamie', kind: 'person', aliases: ['J'], entries: 14, first: '2025-03-02', last: '2026-10-02' }];
  const ctx = C.memoryContext({ memories: [], recent: [], retrieved, entities, journals: new Map([['j1', 'Everyday']]), today: '2026-11-18', currentId: 'now', permission });
  assert.match(ctx.retrieved, /not current facts/); assert.match(ctx.retrieved, /not established facts/); assert.match(ctx.retrieved, /don't fill the gap/);
  assert.match(ctx.retrieved, /Jamie \(person; also written “J”\): in 14 journal entries, from Mar 2, 2025 to Oct 2, 2026/);
  assert.match(ctx.retrieved, /Mar 2, 2025 \(1 year 8 months ago\)/);
  assert.match(ctx.retrieved, /imported from Rosebud/); assert.match(ctx.retrieved, /Summary written by Rosebud at the time/);
  assert.match(ctx.retrieved, /A passage that matched/);
  assert.match(ctx.retrieved, /Replies in imported entries came from another app/);
  assert.deepEqual(ctx.used.retrieved, ['r1', 'r2']); assert.deepEqual(ctx.used.why.r1, ['tag:Jamie', 'search']); assert.deepEqual(ctx.used.entities, ['Jamie']);
  const many = Array.from({ length: 30 }, (_, i) => entry({ id: `m${i}`, localDate: '2025-01-01', title: `Entry ${i}`, summary: 'x'.repeat(2000), why: ['tag:Jamie'] }));
  const big = C.memoryContext({ memories: [], recent: [], retrieved: many, entities, journals: new Map(), today: '2026-11-18', currentId: null, permission });
  assert.ok(big.used.retrieved.length <= C.defaultBudget.retrievedEntries, 'a few entries, never the archive');
  assert.ok(big.retrieved.length < C.defaultBudget.retrieved + 900, 'the recalled block stays within its budget');
  const off = C.memoryContext({ memories: [], recent: [], retrieved, entities, journals: new Map(), today: '2026-11-18', currentId: null, permission: { allowed: false, scope: 'journal', journalIds: new Set() } });
  assert.equal(off.retrieved, '', 'memory off sends nothing, not even counts');
  const excluded = C.memoryContext({ memories: [], recent: [], retrieved: [entry({ id: 'x', localDate: '2025-01-01', excludeFromMemory: true, summary: 'secret' })], journals: new Map(), today: '2026-11-18', currentId: null, permission });
  assert.doesNotMatch(excluded.retrieved, /secret/);
});

test('ago: plain relative dates', () => {
  assert.equal(C.ago('2026-11-17', '2026-11-18'), 'yesterday');
  assert.equal(C.ago('2026-11-08', '2026-11-18'), '10 days ago');
  assert.equal(C.ago('2026-10-20', '2026-11-18'), '4 weeks ago');
  assert.equal(C.ago('2026-05-01', '2026-11-18'), '6 months ago');
  assert.equal(C.ago('2024-11-18', '2026-11-18'), '2 years ago');
});

const base = (o = {}) => ({ index: 0, sourceKey: null, journalName: 'My Journal', companionName: 'Rose', title: 'A day', summary: '', localDate: '2025-04-01', timeZone: 'America/Chicago', startedAt: '2025-04-01T20:00:00-05:00', completedAt: null, messages: [{ role: 'user', body: '  Hello there  ', createdAt: null }, { role: 'assistant', body: 'Hi!', createdAt: null }, { role: 'user', body: '   ', createdAt: null }], tags: [{ kind: 'person', name: ' Jamie ' }, { kind: 'person', name: 'jamie' }], original: {}, ...o });

test('import entries are trimmed at the edges only, and anything unfaithful is reported instead of fixed', () => {
  const e = IM.normalizeEntry(base());
  assert.deepEqual(e.messages.map((m) => m.body), ['Hello there', 'Hi!'], 'empty messages drop; words are untouched');
  assert.deepEqual(e.tags, [{ kind: 'person', name: 'Jamie' }], 'duplicate tags collapse');
  assert.equal(IM.entryProblem(e, '2026-11-18'), null);
  assert.match(IM.entryProblem({ ...e, localDate: '2027-01-01' }, '2026-11-18'), /future/);
  assert.match(IM.entryProblem({ ...e, localDate: '04/01/2025' }, '2026-11-18'), /date/);
  assert.match(IM.entryProblem({ ...e, messages: [{ role: 'assistant', body: 'only AI', createdAt: null }] }, '2026-11-18'), /no words of yours/);
  assert.match(IM.entryProblem({ ...e, messages: [{ role: 'user', body: 'x'.repeat(100001), createdAt: null }] }, '2026-11-18'), /longer than Muse can store/);
  assert.match(IM.entryProblem({ ...e, title: 't'.repeat(201) }, '2026-11-18'), /title/);
  assert.equal(IM.localDateIn('2025-04-02T03:30:00Z', 'America/Chicago'), '2025-04-01', 'a late-night entry stays on its own day');
});

test('duplicate keys: the source id when there is one, else a whitespace-insensitive content fingerprint', async () => {
  const a = IM.normalizeEntry(base()), b = { ...a, messages: a.messages.map((m) => ({ ...m, body: m.body.replace(' ', '   ') })) };
  const fa = await IM.fingerprint(a);
  assert.match(fa, /^[0-9a-f]{64}$/);
  assert.equal(fa, await IM.fingerprint(b), 'spacing differences are the same entry');
  assert.notEqual(fa, await IM.fingerprint({ ...a, localDate: '2025-04-02' }), 'the same words on another day are another entry');
  assert.notEqual(fa, await IM.fingerprint({ ...a, messages: [...a.messages, { role: 'user', body: 'more', createdAt: null }] }));
  assert.equal(IM.importKey({ sourceKey: 'abc' }, fa), 'id:abc');
  assert.equal(IM.importKey({ sourceKey: null }, fa), `fp:${fa}`);
  const p = IM.entryPayload(a);
  assert.equal(p.local_date, '2025-04-01'); assert.equal(p.messages.length, 2); assert.equal(p.tags[0].source, 'ai', 'imported tags are AI-made unless the source says the person made them');
});

test('preview: counts, date range, field coverage, journals; enrichment estimate before anything is spent', () => {
  const entries = [IM.normalizeEntry(base()), IM.normalizeEntry(base({ index: 1, localDate: '2024-06-01', summary: 'A summary', journalName: 'Work', messages: [{ role: 'user', body: 'w', createdAt: '2024-06-01T10:00:00Z' }] }))];
  const p = IM.previewOf({ entries, unavailable: { attachments: 'Not exported' } }, entries);
  assert.equal(p.valid, 2); assert.equal(p.first, '2024-06-01'); assert.equal(p.last, '2025-04-01');
  assert.deepEqual(p.messages, { user: 2, assistant: 1 });
  assert.equal(p.fields.find((f) => f.key === 'assistant').count, 1); assert.equal(p.fields.find((f) => f.key === 'summary').count, 1); assert.equal(p.fields.find((f) => f.key === 'times').count, 1);
  assert.equal(p.fields.find((f) => f.key === 'attachments').note, 'Not exported');
  assert.equal(p.needsAnalysis, 1);
  const est = IM.enrichmentEstimate(Array.from({ length: 100 }, () => ({ chars: 6000 })), 'gpt-6.1-terra');
  assert.equal(est.count, 100); assert.ok(est.typical > 0.5 && est.typical < 2, `typical ${est.typical}`); assert.ok(est.reserved > est.typical, 'the reserve is the ceiling');
  assert.equal(IM.enrichmentEstimate([], 'gpt-6.1-terra').typical, 0);
  assert.ok(IM.enrichmentEstimate([{ chars: 1000 }], 'unknown-model').typical > IM.enrichmentEstimate([{ chars: 1000 }], 'gpt-6.1-terra').typical, 'unknown prices are conservative');
});

const file = (name, text) => ({ name, size: text.length, text: async () => text });
test('adapters: a Muse export maps fully; other Markdown and ZIPs are refused plainly', async () => {
  const exp = { format: 'Muse Journal', version: 1, journals: [{ id: 'j', name: 'Everyday' }],
    conversations: [
      { id: 'c1', journal_id: 'j', companion_name: 'Thought Partner', mode: 'evening', status: 'completed', origin: 'journal', local_date: '2025-02-01', time_zone: 'Europe/Paris', started_at: '2025-02-01T19:00:00Z', completed_at: '2025-02-01T20:00:00Z', title: 'Paris', summary: 'S' },
      { id: 'c2', journal_id: 'j', companion_name: '', mode: 'open', status: 'draft', origin: 'journal', local_date: '2025-02-02', time_zone: 'UTC', started_at: '2025-02-02T19:00:00Z', completed_at: null, title: '', summary: '' },
      { id: 'c3', journal_id: 'j', companion_name: '', mode: 'open', status: 'completed', origin: 'playground', local_date: '2025-02-03', time_zone: 'UTC', started_at: '2025-02-03T19:00:00Z', completed_at: null, title: '', summary: '' }],
    messages: [{ conversation_id: 'c1', role: 'assistant', body: 'Second', created_at: '2025-02-01T19:05:00Z' }, { conversation_id: 'c1', role: 'user', body: 'First', created_at: '2025-02-01T19:01:00Z' }],
    tags: [{ id: 't', kind: 'place', name: 'Paris' }, { id: 'u', kind: 'custom', name: 'travel' }], entryTags: [{ conversation_id: 'c1', tag_id: 't', source: 'ai' }, { conversation_id: 'c1', tag_id: 'u', source: 'user' }], analyses: [{ conversation_id: 'c1', status: 'ready', data: { title: 'x' } }] };
  const r = await A.readImport([file('muse-journal.json', JSON.stringify(exp))]);
  assert.ok(r.ok); const e = r.parsed.entries;
  assert.equal(e.length, 1, 'drafts and Studio tests are not imported'); assert.equal(r.parsed.problems.length, 1);
  assert.deepEqual(e[0].messages.map((m) => m.body), ['First', 'Second'], 'original order by time');
  assert.equal(e[0].mode, 'evening'); assert.equal(e[0].sourceKey, 'c1'); assert.equal(e[0].timeZone, 'Europe/Paris');
  assert.deepEqual(e[0].tags, [{ kind: 'place', name: 'Paris', source: 'ai' }, { kind: 'custom', name: 'travel', source: 'user' }]);
  assert.deepEqual(e[0].original.analysis, { title: 'x' }, 'its analysis is kept as it was');
  const md = await A.readImport([file('notes.md', '# whatever')]);
  assert.equal(md.ok, false); assert.match(md.reason, /doesn’t look like a Rosebud export/);
  assert.match((await A.readImport([file('x.zip', 'PK')])).reason, /Unzip it first/);
  assert.match((await A.readImport([file('x.json', '{')])).reason, /couldn’t be read/);
  assert.match((await A.readImport([file('x.json', '{"a":1}')])).reason, /isn’t a Muse Journal export/);
});

test('import runner: one entry per call, failures isolated, safe to re-run, and stoppable', async () => {
  const entries = [0, 1, 2, 3].map((i) => IM.normalizeEntry(base({ index: i, localDate: `2025-04-0${i + 1}` })));
  const seen = new Set();
  const one = async (e, key) => { if (e.index === 2) throw Object.assign(Error('A message is empty or too long'), { code: '22023' }); if (seen.has(key)) return { status: 'duplicate', conversation_id: 'c' }; seen.add(key); return { status: 'imported', conversation_id: `c${e.index}` }; };
  const first = await R.runImport(entries, one, { concurrency: 2 });
  assert.deepEqual([first.imported, first.duplicates, first.failed, first.stopped], [3, 0, 1, false]);
  assert.equal(first.outcomes.find((o) => o.status === 'failed').reason, 'A message is empty or too long');
  const again = await R.runImport(entries, one);
  assert.deepEqual([again.imported, again.duplicates, again.failed], [0, 3, 1], 'running it again imports nothing twice');
  const stop = new AbortController(); let calls = 0;
  const partial = await R.runImport(entries, async () => { calls++; stop.abort(); return { status: 'imported' }; }, { concurrency: 1, signal: stop.signal });
  assert.equal(calls, 1); assert.equal(partial.stopped, true);
});

// An invented export in Rosebud's real layout (no real journal text): same-day entries, an untitled one, Markdown
// headings and rules inside a reply, an entry without tags or reflection, and the trailing non-entry sections.
const ROSEBUD = ['# 🌹 Rosebud data export', '', 'Generated: 2026-11-19T07:44:32.539Z', '', '---', '', '# 🌹 Rosebud entries', '', '### March 1, 2025 - March 2, 2025', '', '---', '',
  '## 🔥 Gallery night', '### Sunday, March 2nd, 2025', '', '#### Tags', '**Emotions:** Excited, Nervous', '**People:** Jamie', '**Topics:** Dating, Art', '', '#### Reflection', 'You met Jamie.', '', 'It felt easy.', '', '#### Entry', '',
  '**Rosebud:** How was tonight?', '', '**Wren Example:** I met Jamie.', 'Second line.', '', '**Rosebud:** Lovely.', '', '## TL;DR', '### Monday', '---', 'Keep going.', '', '**Wren Example:** Thanks', '', '---', '',
  '## Untitled', '### Sunday, March 2nd, 2025', '', '#### Entry', '', '**Rosebud:** Hi', '', '**Wren Example:** Morning pages.', '', '---', '',
  '## 🌙 Older', '### Saturday, March 1st, 2025', '', '#### Entry', '', '**Rosebud:** Hey', '', '**Wren Example:** Quiet day.', '', '---', '',
  '# Drafts', '', '## A draft', '', '# Weekly reports', '', '### Week of', 'text'].join('\n');
test('Rosebud: entries, speakers, tags, reflection and dates read exactly; replies keep their own Markdown', async () => {
  const r = await A.readImport([file('rosebud-2026.md', ROSEBUD)], { timeZone: 'America/Chicago' });
  assert.ok(r.ok); const p = r.parsed;
  assert.equal(p.source, 'rosebud'); assert.equal(p.entries.length, 3); assert.equal(p.problems.length, 0);
  assert.deepEqual(p.notImported, ['Drafts', 'Weekly reports']);
  const [a, b, c] = p.entries.map(IM.normalizeEntry);
  assert.equal(a.title, '🔥 Gallery night'); assert.equal(b.title, '', '“Untitled” means no title');
  assert.deepEqual([a.localDate, c.localDate], ['2025-03-02', '2025-03-01']);
  assert.deepEqual(a.messages.map((m) => m.role), ['assistant', 'user', 'assistant', 'user']);
  assert.equal(a.messages[1].body, 'I met Jamie.\nSecond line.');
  assert.equal(a.messages[2].body, 'Lovely.\n\n## TL;DR\n### Monday\n---\nKeep going.', 'headings and rules inside a reply stay in the reply');
  assert.equal(a.messages[3].body, 'Thanks', 'the closing separator is not part of the last message');
  assert.equal(a.summary, 'You met Jamie.\n\nIt felt easy.'); assert.deepEqual(a.original.analysis, { reflection: 'You met Jamie.\n\nIt felt easy.' });
  assert.deepEqual(a.tags.map((t) => `${t.kind}:${t.name}`), ['mood:Excited', 'mood:Nervous', 'person:Jamie', 'topic:Dating', 'topic:Art']);
  assert.equal(b.summary, ''); assert.equal(b.tags.length, 0);
  assert.equal(a.companionName, 'Rosebud'); assert.equal(a.original.time_unknown, true);
  assert.equal(a.startedAt, '2025-03-02T18:01:00.000Z', 'midday in their zone; the first-listed same-day entry is the later one');
  assert.equal(b.startedAt, '2025-03-02T18:00:00.000Z');
  assert.equal(IM.entryProblem(a, '2026-11-19'), null);
  const prev = IM.previewOf(p, p.entries.map(IM.normalizeEntry));
  assert.match(prev.fields.find((f) => f.key === 'times').note, /dates only/);
  assert.equal(R2.middayIn('2025-07-01', 'America/Chicago'), '2025-07-01T17:00:00.000Z', 'daylight time is respected');
});
