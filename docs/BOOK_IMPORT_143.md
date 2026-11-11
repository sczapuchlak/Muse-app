# Books Import 2.0 — #143

Implementation branch: `feature/books-import-143`, based on latest main `bc8229d` (including Atlas PRs #155–#158). Atlas visuals, shared styles, and Claude’s working files are untouched. No hosted migrations or deployment are part of this implementation.

## Real-data investigation (Staging, read only)

The successful Goodreads import has 684 source identities and 684 observations; the Library has 687 books and one saved session. Aggregate queries retrieved no titles, reviews or private notes. All 124 recorded ISBN warnings were the literal empty Goodreads formula `=""`, not invalid ISBN checksums. 560 records have usable ISBNs. Two source records have a DNF shelf. This explains 124 of the original 127 attention items without asking the reader to open each book.

No import data is repaired or rewritten automatically. Existing source IDs still reconnect the same books on refresh; Muse status, progress, cycles and opinions win. The two previously imported DNF sources keep their current Muse status until the reader changes it deliberately through the existing status controls. This prevents the follow-up from silently changing the accepted import.

## Cohesion and implementation

- `whimsy_books` remains the authoritative book; source observations remain immutable evidence, not a second Library. Review edits and selected editions retain the original parsed source row for provenance and refresh comparison.
- ISBN normalization handles literal spreadsheet wrappers, leading apostrophes, ISBN labels, full-width digits and Unicode separators. Empty formulas mean missing identifiers. Checksums remain mandatory, and scientific notation is never reconstructed from potentially rounded digits. Title/author fallback recognizes Goodreads’ explicit `(Series, #1.5)` suffix while retaining real subtitles and arbitrary parentheses.
- Catalog search and edition search reuse `/api/books/search` and `/api/books/editions`. Selection shows proposed fields before accepting them into the import preview. Muse fields stay protected. A title/author work fallback never supplies page count, publisher, format or an edition identifier when a requested ISBN edition was not verified. Selecting a different edition for a saved ISBN similarly supplies only work-level gaps.
- Required identity/status/history decisions are separate from informational ISBN, metadata, Series and Muse-wins notices. Filters expose each issue type. A reader can keep supplied data/unassigned history, skip a record, correct an ISBN, select a catalog edition, select a saved book, attach a read, or connect an existing unowned Series installment. Unresolved required decisions are skipped; optional metadata gaps never block valid books.
- Saved Series references are reused first. Goodreads title decorations no longer defeat otherwise exact title/author installment matches. Catalog metadata and saved provider IDs are combined. Each row retains its resolved Series decision separately from the 256-entry raw lookup cache, so large imports do not lose earlier verified associations through eviction. Manual ordering, fractional positions, hidden/manual entries and decorative placements remain authoritative. Review only offers existing eligible installment references; it creates no Series or decorative placement.
- DNF is a fifth native status. Existing editors, status selectors, filters and projections use it without layout changes. It is distinct from Paused, contributes no new completion, and preserves sessions/progress/opinions. Restarting from DNF uses the existing atomic reading-start flow and preserves the saved cycle. The existing discard safeguards continue to protect saved activity.
- Preparation and import copy state that processing requires the open window. Closing while busy opens a consequence/recovery explanation; stopping preparation skips remaining lookups, never source books. Pausing persistence keeps confirmed books and its existing resumable commands.
- All new styling is scoped to importer dialogs. Settings/setup/export/results fit their content; review retains a scrollable dataset and sticky actions.

## Migration and deployment gates

New migration: `20261214000100_book_dnf_status.sql`, ordered after main’s `20261213000100_manual_steps.sql`. The earlier candidate version collided with `custom_feelings` and was changed before any hosted application.

This migration edits only the canonical writer’s status allowlist and the existing atomic timer start/discard allowlists. It asserts the expected function baselines before replacing them. It changes no table rows, grants, ownership, sessions, histories or schema types. No generated database type change is needed because statuses live in the existing JSON payload.

Before acceptance deployment, review the latest main and Staging deployed commit for concurrent Atlas work. Apply the migration to Staging through `docs/DATABASE_RELEASES.md` only after explicit approval and dry-run review. Deploy to the existing muse-staging project without replacing unfinished work. Verify native DNF save/start/discard plus a disposable import before testing a real CSV. A branch-specific Vercel hold prevents this PR push from initiating deployments. Production migration/deployment and merge require separate approval.

## Verification

Results and remaining limitations are recorded in the PR. Local verification uses only the disposable loopback `muse-issue-133` stack, rebuilt from this branch’s complete migration baseline. Staging checks are read only; no test books/accounts are written there.

The representative synthetic 684-row fixture models the observed missing-ISBN distribution without copying personal book data. It is not a copy of Stephanie’s CSV. Live provider catalogs remain incomplete and can fail; the reader can keep source details or choose an edition. The importer does not declare a book standalone merely because no Series was found. Existing Series without an eligible unowned installment cannot be attached through this conservative picker; use existing Series management for structural corrections. No automatic status repair of the accepted 684-book import is performed.

### Final verification results

- Full JavaScript/React/domain suite: **938 passing** (two concurrent test processes).
- Import-specific regression tests: **26 passing**, including the 684-row realistic-format fixture and 25,000-row matching regression.
- All **11 SQL test files** pass on the rebuilt isolated database.
- **27 authenticated database checks** pass, including 1,005 persisted books, refresh, duplicate races, stale revisions, owner isolation, opinions/history, existing Series, DNF persistence/reimport and atomic restart/discard. Disposable test accounts were removed.
- **34 production-mode desktop/390px mobile checks** pass: Settings preference, route authentication/origin/batch limits, close messaging, edition preview/acceptance, real import/refresh, Series linkage, DNF, provider failure and CSV/ZIP downloads. A real 684-book browser import verifies every Series association survives cache eviction, and its refresh duplicates neither books nor memberships. Light/dark and mobile screenshots were inspected.
- Production webpack build and TypeScript pass. Lint has zero errors; five pre-existing warnings remain in unrelated QA scripts.
- Staging read-only checks: 687 books, 684 source links, 684 observations and one session before/after; source-link fingerprint unchanged. The book aggregate fingerprint changed during concurrent activity, so no assertion is made that other actors made no book edits. This task performed no Staging writes.
- New Atlas PRs #156, #157 and #158 were fast-forwarded into this isolated branch without overlapping importer files. No Atlas source/styles or shared UI styles are part of this PR diff.

The development-mode security smoke check hit a connection reset while exercising a rejected POST; the identical production-mode checks passed. Final UI acceptance used the production build.

Reproduce the main checks from the isolated feature checkout:

```sh
node --test --test-concurrency=2 tests/*.test.mjs
npm run db:133 -- test-all
npm run test:book-import:db
MUSE_IMPORT_UI_PRODUCTION=1 node scripts/test-book-import-143-ui.mjs
```

The UI command requires a production build configured for the isolated loopback test database, as documented in `BOOK_IMPORT_133.md`; it must never be pointed at a hosted database. Its catalog responses are deterministic fixtures, while persistence and downloads use the real isolated database.
