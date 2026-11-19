# Journal history import and historical recall

**Status (Nov 19, 2026):** the format-independent importer and entity-aware recall are implemented and tested locally on branch `feat/journal-history-import` (migration `20270109000100`). **The Rosebud parser is not built:** no Rosebud export has been provided, and its Markdown structure must not be guessed. Muse's own JSON export is fully supported, so the whole pipeline can be exercised now.

## Phase 1: mapping report

Nothing below about Rosebud's format is assumed. Each row says what Muse will do *once the export shows the field exists*.

| Rosebud field (to confirm in the real export) | Muse destination | Expected handling |
|---|---|---|
| Entry date and time, time zone | `journal_conversations.local_date`, `started_at`, `time_zone`; message `created_at` | Direct if the export has ISO times; otherwise transform (parse its date format, take the zone from the export or ask once during preview). Never the import date. |
| Your messages and AI messages, in order | `journal_messages` (role `user`/`assistant`, original order, words untouched) | Direct once speaker markers are identified. Several AI replies in a row are kept (each answers the message before it). |
| Entry title | `title` with `title_source='import'` | Direct. Muse analysis never overwrites it. |
| Rosebud summary or analysis | `summary` (`summary_source='import'`) + the full original in `journal_import_sources.original` | Kept as written and labelled as Rosebud's. Muse's own analysis (optional) is stored separately in `journal_analyses`. |
| Tags, people, topics | Existing tag records (`journal_tags`), linked as `source='ai'` | Reuses an existing tag by exact name or confirmed alias (so Sun/Son merges apply); a tag removed "never suggest again" is skipped. |
| Journal names | Mapped in the preview to an existing journal or a new one | Mapping is explicit; nothing moves existing entries. |
| Companion/persona name | `companion_name` snapshot | Shown on the entry; no Muse companion is created. |
| Images/attachments | Reference kept in `original` only | Not imported in V1 (no files to validate yet). Old images are never sent to AI. |
| Rosebud entry id | Duplicate key `id:<id>` | If absent, a SHA-256 fingerprint of the day + every message (whitespace-insensitive) is the key. |

**Still to inspect in the real export** (the brief's Phase 1 list): single file vs. many vs. ZIP; date/timestamp format; how speakers are marked; whether full conversations or only your words are exported; which analysis/summary/insight/title/tag fields exist; journal and persona names; attachment references; inconsistent or missing fields. The parser is written against that sample, with a fixture test built from a redacted copy, then mapped into `ImportEntry` (`lib/journal/import/model.ts`).

## What an import does

- **Files stay on the device until you confirm.** The browser reads and validates them (`lib/journal/import/adapters.ts`), then shows a preview: entries found, ready, already imported, can't import (with reasons, never quoting the entry), the date range, your messages vs. AI replies, which fields each entry keeps, and where each exported journal goes.
- **One entry, one database call** (`import_journal_entry`, security invoker, so row-level security applies). An entry is written all or nothing as an ordinary finished entry (`origin='import'`) with its original date, time, order and words. Three run at a time, with progress and Stop. A large export can't time out, and a failure costs only that entry.
- **Idempotent.** The source id (or the fingerprint) is unique per account. Importing the same export again imports nothing twice. Matching dates are never treated as duplicates, and an existing Muse entry is never overwritten.
- **Deletion is respected.** An imported entry you delete by hand isn't brought back by a re-import (reported as "you'd deleted"). **Remove this import** (Earlier imports) deletes only that import's entries, never one written in Muse, so the file can be imported again.
- **Provenance is separate:** `journal_import_batches` (counts, status, a report with positions, dates and reasons, never text) and `journal_import_sources` (source, key, fingerprint, batch, entry, immutable original metadata). The entry shows "imported from Rosebud" quietly in its date line.
- **No AI runs during an import.**

## Optional historical enrichment

Journal settings → Privacy & usage → Import journal history → **Optional: analyse imported entries**.

- Lists imported entries with no ready Muse analysis (`journal_enrichment_candidates`).
- Before anything runs, you choose Next 10, Next 25 or All, and see the request count, a likely cost, and the most the spending guard could reserve. For example, with `gpt-6.1-terra` an analysis is likely about $0.01 and at most about $0.02; 600 entries is likely about $6, at most about $12. It also shows what's left of the month and day.
- It runs only after you tick the confirmation. Requests go one at a time, paced under 8 a minute. It stops at any budget limit, skips entries already analysed, and can be resumed any time.
- The analysis is told the entry is historical and dated. It may propose a memory only as something you clearly stated, worded with when it was true ("As of March 2025, …"), never a guess about someone else.
- **Suggestion limits for imported entries:** at most 2 per entry, none close to a memory already known or waiting, and none while 30 AI suggestions are waiting. Everything still goes through Memory Studio approval.
- Rosebud's own title and summary are never replaced (`title_source`/`summary_source = 'import'`).

## Historical recall (core requirement)

`lib/journal/context.ts` (pure, tested) and `lib/journal/server/retrieve.ts`. Everything is read with your own client, so row-level security applies.

1. **Approved memories and the last 7 days** come first, as before (cacheable).
2. **Entities.** People, places, topics and My tags named in what you just said, or in your previous three messages (so "what do you think he wants?" keeps Jamie). Matching uses the name or a confirmed alias, is word-bounded, and needs the capital for people and places ("Sun" the person, not "the sun"). Similar names are never treated as one person, and removed tags never match.
3. `journal_tag_history` returns, for each named tag, how many permitted entries it has, their date span, and its newest older entries. This uses canonical tags, so merges and aliases apply.
4. **Full-text search** on the latest message runs as before.
5. **Ranking** interleaves the sources: each entity's newest entry, then the best word matches, then each entity's next entry. One person can't crowd out everything else.
6. **What is sent:** at most 4 older entries in about 3,400 characters. Each is dated with how long ago it was ("1 year 8 months ago"), labelled "imported from Rosebud", carries its summary (labelled as Rosebud's when it is) and, when it helps, the passage that matched. A count line comes first: "Jamie (person): in 14 journal entries, from Mar 2, 2025 to Oct 2, 2026".
7. **Framing:** dated records, not current facts; past guesses aren't facts; replies in imported entries came from another app; if it isn't listed, the companion doesn't know it.
8. **Permissions are unchanged:** memory off (global, journal, or conversation), journal-only scope, kept out of AI context, drafts. Images are never loaded. The retrieved block goes only into the current reply, so history doesn't pile up across turns.

**Recall check (diagnostic):** Journal settings → Memory → **Check what your companion would recall**. Type a sentence; Muse runs the same selection as a reply (`action: "recall"`), with no AI and no cost, and lists the entries it would bring in and why ("tagged Jamie", "matching words"). This is how Staging retrieval is verified without treating a plausible AI answer as proof.

## Tests

- `node --test tests/journal-history.test.mjs`: entity matching (aliases, look-alikes, "the sun", removed tags, follow-ups), ranking, framing and bounds, permissions, relative dates, import validation, fingerprints, preview, estimates, the Muse adapter, the not-yet-mapped Rosebud path, and a runner that is safe to re-run and can be stopped.
- `npm run test:journal:history` (local Supabase): imported entries are ordinary finished entries with their original date, time, order and words, including several AI replies in a row. Also: provenance owner-only and append-only; duplicates by content and by id; native entries untouched; refusals; per-account isolation; search; tag history counts permitted entries only; the real `loadMemory` recalls Jamie by tag, keeps him in a follow-up, follows the Son→Sun alias, and ignores "the sun"; memory off sends nothing; manual deletion is respected; undo removes only that import; account deletion removes everything.
- `node scripts/test-journal-history-ui.mjs` (local app): 27 browser checks, from the preview through import, report, search, the provenance note, the recall check, re-import duplicates, removal and phone width.
- `scripts/verify-hosted-journal-import.sql`: a read-only schema check for Staging and Production.

## Staging and Production

1. Staging: apply `20270109000100` (`npm run db:push:staging`), run `scripts/verify-hosted-journal-import.sql`, then deploy to `muse-staging`.
2. When the Rosebud export arrives: inspect it, finish the mapping report above, build the parser with a redacted fixture test, then preview it on Staging. Then a 5–10 entry test import (a normal conversation, several AI replies, analysis if exported, a person, tags, an earlier year). Then History, search, highlights, Continue from here and the recall check on a Jamie entry. Then the full archive. No bulk enrichment without your go.
3. Production, only with your approval:
   - Confirm a backup (Supabase daily backups, and/or the Journal JSON export just before).
   - Apply the migration (dry run first) and run the verification script.
   - Merge and deploy.
   - You import from your own Production account. Staging data is never copied.

   Recovery: **Remove this import** undoes a batch exactly. The migration is additive (new tables and functions, widened checks), so existing data is untouched.
