# Series Discovery #136 — local implementation and credential setup

## Product and ownership

`collection_series` and `collection_series_members` remain the one series owner. A discovered installment is a member reference with title, source ID, position, role and optional release date; `book_id` is null until it matches or is deliberately added to an existing Library book. The book, edition, sessions, journal, ratings and reading cycles remain in their existing owners. Removing a member sets a persistent hidden/manual override; it does not delete a book. Refresh never deletes saved members. A stronger saved source is retained if a weaker fallback responds.

Discovery is triggered by opening an individual book and skipped while its saved series refresh is younger than 30 days. An in-process 12-hour cache also avoids repeated requests inside the server. Refresh Series bypasses that cache and records a new successful refresh time. If a refresh fails, the saved catalog remains visible. Unknown publication status and incomplete series counts remain unknown. A book with no discovered series is cached for the current browser session; retry on a future visit remains possible.

Existing Library and Add Book searches show a clickable series badge directly on each matching book when saved membership or a bounded Hardcover catalog lookup supplies reliable metadata. Series-name matches also appear as clearly labeled Series results. Both open `SeriesLibrary` without adding a Library book or fetching editions. Book detail badges open that same view. There is no separate Series search action or Collections overview Series button; the contextual Collections route remains for deep-link and non-book franchise compatibility.

## Hardcover setup

1. Open [Hardcover API settings](https://hardcover.app/account/api) while signed in and create a named Personal Access Token with an expiration date.
2. Grant **`read:catalog`** only. This includes `read:catalog:data` for books, editions, series and `book_series`, and `read:catalog:search` for series/book search. No Library, journal or write scopes are used.
3. Set the server environment variable `HARDCOVER_API_KEY` in local `.env.local` and the deployment environment's secret settings. Restart the server after local changes. Never use a `NEXT_PUBLIC_` variable, paste the token into the browser, or commit it.
4. After applying the local migration, open an owned book from a known series and use Refresh Series; test the existing Books search for book badges and series-name results. If Hardcover returns 401, renew the token; if 403, verify `read:catalog`.

No token was present in the implementation environment. Live catalog coverage and account-specific responses are therefore **unverified**. Mocked contract tests check the documented query shape and parsing; they do not establish actual counts for example series.

## Verified public API surface

Hardcover's [published GraphQL schema](https://github.com/hardcoverapp/hardcover-docs/blob/main/schema.graphql) exposes `search` with `query_type`, `series_by_pk`, `series` with `id`, `name`, `description`, `books_count`, `primary_books_count`, `is_completed`, `author` and `book_series`; `book_series` exposes `position` as a float, `featured`, `compilation`, and `book`; `books` exposes `release_date` and contributors. [Scope capabilities](https://github.com/hardcoverapp/hardcover-docs/blob/main/capabilities.json) list those operations under `read:catalog`. [Getting Started](https://github.com/hardcoverapp/hardcover-docs/blob/main/src/content/docs/api/Getting-Started.mdx) documents bearer PATs, beta status, limits and server-side secret handling. Schema availability is verified; live values, the meaning of `featured` for all catalogs, and release-date coverage require credential testing. Muse treats `featured && !compilation` as its provisional mainline indicator and labels other entries optional. A source count is never synthesized from the number of returned rows.

## Migration and validation

Migration: `supabase/migrations/20261206000100_series_discovery.sql`. It adds nullable catalog metadata and ghost/member correction fields to existing series tables and expands the member check constraint; it does not move or rewrite personal books or history. The SQL **passed against local Supabase inside a BEGIN/ROLLBACK transaction** and was applied to Staging through the guarded workflow. Staging history and a read-only schema dump confirmed the new objects. The shared local ledger contains unrelated version `20261204000100` absent from this checkout; it was not repaired or included in #136. Production still has #136 pending, and this search correction must pass Staging QA before its migration or deployment.

Known limits: Hardcover's public API has not been exercised with a real credential; multiple equally featured series on one book are left unresolved rather than guessed; Hardcover's `book_series` query is bounded to 100 references, so very large catalogs may be partial; Google Books search availability and edition quality depend on its existing integration. Open Library can return unordered subject matches. Manual correction is always available.
