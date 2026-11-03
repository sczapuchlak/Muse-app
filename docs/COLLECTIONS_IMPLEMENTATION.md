# Collections implementation audit and staged plan

Status: local implementation assembled; verification and release gaps below. No hosted migration or deployment is approved by this document.

## Existing foundation

- Books are canonical owner-owned `whimsy_books` records. Reading sessions, goals, and the single active timer are separate records linked by existing book IDs. `read_whimsy`, revision-checked save commands, and the timer RPC already protect ownership and retry behavior.
- `Bookshelf`, `ReadingAtlas`, `BooksDayviewWidget`, `lib/whimsy/books.ts`, and `lib/whimsy/integrations.ts` provide the current book UI, calculations, Daily Edit projection, Insights inputs, and recap-ready reading measures. Preserve these modules and their saved dates and IANA zones.
- Current Bookshelf supports manual titles, author, genre, cover URL, status, pages, sessions, timer, goals, rating, emoji review, and final thoughts. It does **not** have an external book metadata search provider. Existing status `planned` maps to Want to Read.
- `/whimsy/bookshelf` is the existing deep link. A Collections move must preserve it as an alias or redirect, update the optional Daily Edit link, and keep saved widget preferences (`experience='bookshelf'`) valid.
- There is no canonical movie, TV, game, ordered-series, or curated-collection storage yet. These require owner-scoped persistence and new validation; they cannot be represented as sample cards.

## Implementation sequence

1. Collections shell and shared selectors: one parent route, Board/Library controls, filters, and an adapter over existing books and new media. No book copying.
2. Books relocation: reuse the Bookshelf UI and service under Collections; preserve the old route, record IDs, sessions, goals, timer, and Insights/Dayview contracts. Remove the Bookshelf tab from Whimsy only after the new route is functional.
3. Owner-scoped new media: manual movie, show, and game add/edit/delete with appropriate metadata, status, reviews, and activity. TV episodes and rewatch/play sessions remain distinct from canonical items.
4. Ordered series and personal collections: independent membership records, explicit installment scope, derived progress, cross-media groupings, and no automatic status changes.
5. Actual-record Analytics/recap selectors and future Daily Edit contracts. Preserve the present Bookshelf widget and reading metrics.
6. Auth, persistence, data-isolation, responsive, theme, keyboard, and regression QA before any release proposal.

## Provider decision boundary

Manual entry is the no-cost baseline. No external metadata integration is selected yet. Official sources checked November 3, 2026:

- [Open Library API guidance](https://openlibrary.org/developers/api): human-initiated lookup and caching are encouraged; default limit 1 request/second, identified requests 3/second. It is not intended as a bulk or high-traffic commercial backend. Cover rights and use at Muse scale still need review.
- [TMDB developer FAQ](https://developer.themoviedb.org/docs/faq): free with attribution for noncommercial use; commercial use requires a separate license. Do not add it without a production-rights decision.
- [TVmaze API](https://www.tvmaze.com/api): show and episode metadata is CC BY-SA with attribution and ShareAlike obligations, and at least 20 requests per 10 seconds per IP. The ShareAlike effect on Muse's retained metadata and artwork needs review before use.
- [IGDB API documentation](https://api-docs.igdb.com/): free use is noncommercial under Twitch terms, with app credentials. Do not add it without a production-rights decision.

No provider content or imagery should be silently copied into durable user records. Manual metadata remains editable when a provider is unavailable.

## Migration and release risks

- New tables need owner checks, revision/command idempotency, foreign keys, account export/deletion, and tests against more than one account. Migration files may be developed and tested locally; hosted application requires separate approval.
- Existing book IDs and historical reading timestamps remain in place. Moving the screen does not migrate or rewrite those records. A book can appear in multiple curated groupings without a second canonical copy.
- Series denominators must identify released versus announced or user-defined scope. Unknown installments and unaired episodes stay out of available-completion counts.
- Without verified provider rights, only user-entered metadata and user-supplied licensed/HTTPS artwork may appear in the release candidate. Do not label metadata search complete until a provider passes licensing and reliability review.

## Local implementation status (November 3, 2026)

- Implemented locally: sidebar and responsive Collections route; Board/Library views with type, status, genre, rating, tag, series, favorite and date filters; existing Bookshelf relocation and old-route redirect; manual movie, TV and game CRUD; dated view/play sessions; TV episode catalog and available-episode progress; manual ordered series with explicit scope; private cross-media curated groups with atomic reordering; actual-record Insights and recap selectors; account export. Existing book records are not copied.
- Additive migrations `20261103000100`–`20261103000300` were applied only to local Supabase. They add owner RLS, relationship checks, and atomic curated order changes. Hosted Staging and Production remain untouched.
- Still partial: no licensed metadata lookup or auto-discovery, no known-but-unsaved series installments, no automatic series suggestions, no historical series milestone snapshots, no annual recap interface, no new Daily Edit widgets, and no social sharing. Unwatched TV episode titles are hidden by default, with an explicit reveal control. New media writes use revision checks but do not yet use the existing Whimsy command-receipt protocol for every uncertain network outcome.
- Verified locally: 402 unit/integration tests, 226 SQL assertions, disposable two-account RLS/integrity/cascade checks, production build, lint, and authenticated browser checks covering Whimsy routing, old Bookshelf redirect, book/media/series/curated saves, account export, Insights focus, four viewport widths and all nine themes in both material modes. Existing book records were read through the original service with no copy or rewrite.
- Release still requires explicit approval for hosted migrations and a provider decision before automated metadata lookup. Additional manual accessibility and artwork-rights review should precede hosted rollout.
