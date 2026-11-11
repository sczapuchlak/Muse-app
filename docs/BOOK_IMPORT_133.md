# Book Library Import, Refresh & Export — #133

Implemented on `feature/book-library-import-133`. No hosted migration, merge or deployment is authorized by this document.

## Ownership and UI boundary

The existing Books Display entry now opens Settings and retains its existing Daily Edit preference write/retry owner. All new controls live in Settings and the new import/export dialogs. Existing Library composition, Reading Desk cards, Book Detail/Reads, Series spines/decorations, themes, shared dialogs and global CSS are unchanged. Data projections order active books and protect read/session relationships without changing their rendering.

A Library book remains in `whimsy_books`. Completions remain on that book; real sessions remain in `whimsy_reading_sessions`. Series and My Collections use their existing references. A source observation references the book and optionally a completion, retaining the source’s title, dates, opinion, notes and otherwise unmapped information. Later book renames never rewrite these snapshots. Source ratings/reviews are intentionally **not** presented in Book Detail in #133. That deferred UI should read `book_import_observations` by book/cycle and distinguish unassigned source information from confirmed completed reads; it must not create a second active opinion.

## Import behavior

- Goodreads is the native adapter. Generic CSV offers column mapping, an explicit five- or ten-point rating scale, ISO/unambiguous year-first dates and a stable source name. Fractional ratings are preserved. Goodreads zero stars means unrated.
- Other services are supported through generic mapping when their downloadable files are compatible; StoryGraph, Pagebound, LibraryThing and Hardcover are not advertised as dedicated adapters. No credentials, scraping, third-party account syncing or live third-party library API integration is involved. Existing public catalog metadata providers are reused.
- A 10 MB file / 25,000 data-row limit, 200 columns and 50,000-character cell limit bound parsing. UTF-8 and BOM-marked UTF-16 are accepted. Malformed quoting or shifted row widths fails before writes. Duplicate/ambiguous headers use manual mapping instead of silently selecting a column.
- Matching uses known source IDs, validated ISBNs (including ISBN-10/13 equivalence), verified provider IDs and normalized title/author. Ambiguous editions, missing-author collisions and repeated file identities require review. Books without ISBNs/covers remain valid. Generic files without IDs derive a stable identity from ISBN/title/author; changes to those identifiers may need manual review. Users should map a stable source ID when available.
- Muse values win. Safe empty metadata can be filled; existing progress, sessions, dates, active cycles, reviews, opinions and organization remain intact. Existing reading status/cycle/progress/dates are protected in the transaction as well as the preview. Change those through the existing book controls. Optional selected active-opinion replacements follow existing per-read ownership and retain old Muse values in `details.museBefore`. Imported page position never becomes a session/page log.
- A uniquely matching finish date can attach source history to a stored completion (legacy completions are materialized with the same stable ID). A first source finish clearly before known Muse reading start can add a historical completion. Further differing source dates are reviewed, never assumed to be rereads. Users can attach ambiguous information to a chosen existing read, leave it unassigned, or explicitly confirm a separate completion. Aggregate Goodreads Read Count never generates occurrences. Undated history remains attributed and uncounted.
- Existing unassigned Muse opinions stay unassigned when adding the first imported historical read. Imported completions never acquire old unlinked Muse sessions through date-window inference. Completion statistics expose `importedCompletions`; time, pages, pace and streaks still derive exclusively from actual sessions.
- Currently Reading is projected from real session dates/segments, recorded progress dates and meaningful start dates. Neither book creation/update time nor a source Date Added is reading activity. Unknown dates follow known dates, with stable ties. Importing an existing active book preserves its status and cycle ID.
- Existing saved series members are checked first. Catalog enrichment uses the existing resolver (Hardcover → Wikidata → Open Library) and book metadata lookup. Only uniquely verified existing series/installments connect. Fractional positions, roles, hidden rows, manual corrections, stars and current ownership remain authoritative. No Series records are automatically created. Missing/ambiguous/provider-failed series information stays unassociated with an explanation/review path; the rest of the book can import. Decorative placement is never written.
- Custom shelves/tags can optionally connect through My Collections. Stable source-shelf links survive Muse collection renames. Ambiguous existing collection names are reported instead of creating another group. No source disappearance deletes books, tags, reads or placements.

## Transactions, refresh and recovery

`save_imported_book` uses the canonical per-owner advisory lock and existing revision/command receipts. Each book, source identity, observation and optional organization connection commits atomically. New-book matches are rechecked inside that lock, with indexed normalized identity queries, so concurrent previews cannot duplicate a book. A stale Muse revision returns `PT409` for fresh review. Hidden/manual/stale Series rows are preserved and reported. The batch is resumable per book rather than one enormous database transaction.

Previously observed normalized fields distinguish changed and unchanged source records. JSON object ordering does not cause false changes. A source changing a date is not proof of another read. Unchanged files can still fill newly available verified metadata or connect a newly available existing series. There is no deletion reconciliation or automatic undo of later user edits.

The UI reports actual completed/total counts at Reading CSV, Matching Muse books, Validating/enriching metadata, Connecting series, Preparing review and Importing approved changes. Metadata requests contain only public title/author/ISBN/provider identifiers, use batches of up to four, existing bounded provider caches, a 256-entry client cache and a per-user route rate limit. Provider failures/skip do not prevent importing supplied details. Sequential per-book transactions limit database pressure and allow pause/retry. Exact pending commands and confirmed IDs are retained in tab-scoped session storage; server receipts make uncertain retries safe. If tab storage is unavailable, keep the tab open or reupload the source for a fresh matching preview. No raw CSV is uploaded or permanently stored.

## Export

The Library CSV contains current book metadata, status, active opinion, dates, progress and collections. Collection names use JSON arrays to preserve embedded commas/semicolons and can be remapped on import. The optional uncompressed ZIP also retains all canonical book fields in `book-data.csv`, with separate CSVs for completions, actual sessions, journal, Series/members, Collections/members, source identities, source observations and source-collection references. Related IDs preserve relationships. Unicode, multiline fields and quoting are retained; formula-like cells are escaped for spreadsheet safety.

Only the primary Library CSV supports reimport through generic mapping. The ZIP is a reading archive, **not** an automatic full account restore. It excludes unsaved timers, goals, external artwork binaries and unrelated media. Pages are read with stable keys rather than silently stopping at PostgREST’s 1,000-row limit. Large exports fail explicitly at the defensive read limit rather than truncate. Reads are not a cross-table database snapshot; avoid simultaneous editing during archive preparation. Account export also includes the new provenance tables, and account deletion cascades all of them.

## Local verification environment

The shared local database has unrelated migration `20261204000100_conflict_errcode.sql`, originating in commit `0848b4c` / `fix/constellations-conflict-127`. It is absent from this branch’s intended main baseline. Its history was not reset/repaired/reconciled and no other branch was edited.

The disposable project is `muse-issue-133`, configured under `/private/tmp/muse-133-supabase`, using loopback ports 55321 (API), 55322 (database), 55323 (Studio), 55324 (mail). The helper copies this checkout’s exact migrations/templates, verifies loopback bindings and refuses stale copies. `rebuild` stops/removes data **only** for this explicitly guarded disposable project. It never uses the shared `muse-local` project. The repository’s Docker wrapper must be used because this Docker engine otherwise ignores the network’s loopback publishing default.

Commands from the feature checkout:

```sh
npm run db:133 -- rebuild
npm run db:133 -- test-all
npm run test:book-import
npm run test:book-import:db
npm run test:book-import:ui
node --test --test-concurrency=2 tests/*.test.mjs
npm run lint
npx --no-install next typegen
npx --no-install tsc --noEmit --incremental false
npm run build -- --webpack
```

The Supabase CLI’s `test db --workdir` selected the shared stack despite the custom workdir in this session. All test files use transaction rollback, and its history was not changed. The committed helper runs pgTAP directly in the explicitly named isolated container, avoiding that CLI path entirely. Browser/real API scripts also require the isolated port and create/delete disposable accounts. Screenshots are written outside the repository under `/private/tmp/muse133-ui-shots`.

## Staging release gate — not executed

1. Review migration `20261211000100_book_import_provenance.sql` and this branch’s final diff. The version is the next ordered feature migration after `20261210000100_series_catalog_art.sql`; it follows the repository’s timestamp/sequence naming and had no committed collision at implementation time. Do not rename an already applied hosted version.
2. With explicit staging approval, confirm the guarded CLI link targets staging and inspect its migration history/dry run. Only the approved prerequisites plus this migration should be pending. Do not import the unrelated local #127 migration or repair history to bypass a mismatch.
3. Run the documented guarded staging migration workflow in DATABASE_RELEASES, then authenticated import/refresh/export and Series checks with the actual configured catalog providers. Verify owner-only policies/grants, indexes, source identity uniqueness and read-opinion retention.
4. Live provider coverage remains dependent on catalog completeness and server credentials. Test a representative real Goodreads export and ambiguous editions on staging; fixtures cannot establish every provider’s live catalog quality.
5. Production migration, merge and deployment remain separate approval gates. No automatic rollback should delete imported user data; failed batches are retried/reviewed by source identity.

## Verification results

- Full JavaScript/React/domain regression suite: **892 passing**, using two concurrent test processes to limit memory. This includes **21 import-specific tests**, a 25,000-row matching test, ZIP validation with a standard reader, opinion/history protections and Currently Reading ordering.
- All **11 repository SQL test files** pass when executed directly in the isolated container.
- Real authenticated database journeys: **23 checks passing**, including 1,005 persisted imported books, paginated export, same-file refresh, two-client duplicate races, stale revisions, owner isolation, source history, preserved sessions/cycles, renamed Collections and verified existing Series membership. Disposable users are deleted afterward.
- **26 production-mode desktop/390px phone checks pass** for Settings/Daily Edit persistence, Goodreads preview/confirmation/results, conflict defaults, provider failure, generic rating conversion, repeat imports, Series linking and both downloads. Light/dark modal screenshots were inspected. Production-mode smoke verification also exercises metadata authentication/origin/batch limits.
- Production webpack build and TypeScript pass with the isolated local test configuration. Lint reports zero errors. Pre-existing warnings remain in the global Settings page’s package-version import and an unused variable in `scripts/test-local-reading-integrity.mjs`; neither file was changed by this feature.

No staging or production migration, deployment or merge was performed. Live catalog completeness and representative real-account export variations remain staging acceptance checks; deterministic fixtures cannot certify every external catalog entry.
