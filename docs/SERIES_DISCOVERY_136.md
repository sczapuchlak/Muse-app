# Books & Series Discovery #136 — implementation notes

Status: implemented on `fix/136-unified-series-search` (PR #140). Staging migrations: `20261206000100_series_discovery.sql` (applied earlier) and `20261210000100_series_catalog_art.sql`. Production: **not approved, not applied.**

## Product shape

- **Collections is the only Books home.** Collections › Books shows the Reading Desk (timer, nightstand, Reading Challenge, next read) above the library. Reading Atlas is `/collections/reading-atlas`. The old standalone Books view and `/whimsy/bookshelf` redirect here (a `book` link opens that book; `view=atlas` opens the Atlas).
- **Book page** `/collections/books/<id>`: identity with the series chip, synopsis, ordered series strip, the reading companion (the existing timer and session write paths), and Sittings / Journal / Reads / Details.
- **Series page** `/collections/series/<saved id>` or `/collections/series/<source>-<catalog id>`. A catalog series is rendered as found; it is saved only when the reader adds or stars one of its books. Saved series keep manual corrections, stars and hidden installments.
- **Add Book** is one search with a Books · Series switch. Book results carry series chips, a preview and Quick Add (bookmark = Want to Read; ▾ = choose a shelf). "Which edition?" appears only when editions differ in format, length, publisher, year or language. "Add with details…" and manual entry use the full editor.
- **Context:** Back from a book or series returns to the search, book, series or Collections it was opened from (browser history, so scroll and search state are restored). The Add Book search survives for the browser session until the dialog is closed.

## Data

`collection_series` / `collection_series_members` remain the one series owner. Members may be catalog-only (no `book_id`). New nullable columns: `catalog_cover_url`, `catalog_cover_color`, `catalog_pages`, `catalog_release_year` on members, `catalog_completed` on series, and role `collection` for omnibus/box sets (never counted toward progress, never auto-linked to an owned book). A saved book records its Hardcover work in `metadataSource.hardcoverId` (+ `enrichedAt`).

Catalog enrichment fills only empty book-level fields: synopsis, first publication date, genre (mapped to Muse genres), missing artwork. It never sets a saved book's page count and never replaces a reader's value. Quick Add saves the chosen edition's cover, pages, ISBN, publisher and date; the catalog fills only what that edition lacks.

## Root causes fixed

1. *"Could not open series."* — opening a catalog series forced a save, and Hardcover installments without a release date were written as `''` into a `date` column. Dates are now strict ISO or absent, and viewing never saves.
2. *Lost search / legacy Books detour* — the Series modal replaced the Add Book dialog and "Back" went to the Books page. Series is now a page with contextual Back.
3. *New books without their series* — the matched series was never saved with the book. Quick Add saves it; any book without a series is matched (by Hardcover id, then ISBN, then exact title/author) when its page opens.
4. *Hidden synopsis* — the description was stored but collapsed; it is now visible, and Hardcover fills it when the edition had none.
5. *Empty start date on Want to Read adds* — omitted rather than written as `''`.

## Ordering

Hardcover `book_series.position` is the reading order (prequels `0.x`, novellas `x.y` in place). Hardcover lists translations and other-edition records as separate books at the same position, so the catalog is normalized to **one work per position**: the record most readers have (then the featured one) represents it, and distinct works with their own position are kept whatever their language. Unpositioned entries need their own readership (≥2% of the series' most-read book, minimum 3). Bundles — `compilation` on the series row or book, or bundle titles such as "Series: 5-6", "Box Set", "Complete … Collection", "Books 1-3" — are listed under Collections & box sets. Duplicate records (`canonical_id`) are dropped. Counts shown are normalized works, not raw catalog rows. Saved series from before normalization refresh once (`CATALOG_SHAPE_SINCE`), removing catalog-only rows the reader never owned, starred or corrected. "Next in order" prefers the first unread whole-number book. Counts and release information are shown only when the catalog supplies them; the series summary sentence is assembled only from supplied values.

## Hardcover setup

Server-only `HARDCOVER_API_KEY` with `read:catalog` (set in the Staging Vercel project; secrets cannot be pulled locally). Without it, saved series and the Wikidata/Open Library fallbacks still work, and search shows book results without series chips.

## Local QA

`scripts/hardcover-fixture.mjs` serves Hardcover-shaped fixture data (Throne of Glass, A Court of Thorns and Roses) for local development; start `next dev` with `HARDCOVER_API_KEY=fixture HARDCOVER_API_URL=http://127.0.0.1:4555/graphql` (the override is ignored in production builds). `scripts/qa/books-harness.mjs` creates a disposable local account and drives headless Chrome for the journeys. Fixture data verifies UI and flows only; live catalog coverage must be checked on Staging.

## Primary books, additional works, collections

One definition everywhere (`bookSeriesPrimary` in `lib/collections/models.ts`): a catalog book series' **primary books** are its works at whole-number positions. They form the main shelf, the "#3 of 7" denominator on search chips and book pages, and series completion ("0 of 7 primary books read"; unreleased primary books are noted, not subtracted). **Additional works** — prequels and novellas at fractional positions, unpositioned companions, books whose own series is another — keep their real positions, covers and status controls and are tracked separately. **Collections & box sets** are listed apart and never counted. Edition formats (dramatized/audio-drama/full-cast adaptations, split editions, "Part N of M") are editions of a work already present and never appear; edition-only catalog series are not offered in search. When the catalog's own primary count differs from the whole-numbered works, or the catalog marks none, or gives no order, the Series page says so (`primaryBasisNote`). Series a reader assembled keep their own mainline roles.

Search chips are resolved for the books a search shows (ISBN, then exact title + author) and remembered for the session, so refining a query never drops them.

**Completion.** Finishing the core story finishes the series: reading every primary book shows **Core complete** (100%), even with unread additional works. Every released primary book read while another is announced shows **Caught up**. Reading every primary and additional work is an optional extra, **All works complete**. Additional works show their own optional count; collections are marked *Not counted*. Reading Atlas series rows and Collections cards use the same primary counts (`seriesProgress` → `bookSeriesPrimary`).
