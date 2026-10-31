# Whimsy and connected life data — approved roadmap

**PLANNED / NOT YET IMPLEMENTED.** This is product and architecture planning, not a schema, delivery commitment or description of working features. No tables, migrations, API clients, dependencies, widgets or new analytics are introduced by this document.

## Status and intent

Whimsy — **A LITTLE MAGIC NEVER HURT** — is Muse's personal cabinet of curiosities: curiosity, reflection, learning, imagination and occasional delightful nonsense. Its eventual experiences are independent but thoughtfully connected, editorial, atmospheric, interactive and distinctly Muse. It is not another productivity dashboard.

The existing implementation is only the `/whimsy` landing page with three Coming Soon previews, plus Daily Edit's separate optional compact Cosmic Forecast presentation/provider boundary. No live forecast provider is connected. Existing Mood, Planner, Rituals, Nourish, Money and Notes functionality awaits durable database persistence; their current session data is not a Whimsy backend.

All experiences and connections below are **PLANNED / NOT YET IMPLEMENTED**. Exact interfaces, providers, artwork/content licensing, storage schemas and delivery order remain future decisions.

## Personal persistence versus reference content

| Planned experience/data | Personal record policy | Reference/cached content policy |
| --- | --- | --- |
| Tarot Study & Journal | Intentional draws, original local date/time, orientation, personal interpretations, optional emotional associations and learning history | Canonical card reference data, symbolism and explanations reused by ID; do not copy deck descriptions into every draw |
| Dream Diary | Private dream text, original sleep/waking date, structured tags/associations and user edits | Optional interpretation aids remain clearly interpretive, separate from the user's account |
| Unhinged Fortune Cookie | Save/favorite only when explicitly chosen; optional day association | Curated/content-service library and lightweight retrieval; do not permanently log each display or duplicate text unnecessarily |
| Detailed Cosmic Forecast | No personal horoscope history by default | Date/sign/facet retrieval and appropriate caching; revisit history only for an explicitly approved save/favorite need |
| Fun Fact of the Day | No personal fact history or analytics | Credible sourced content, short explanation, retrieval/cache and lightweight repeat avoidance when practical |
| Book Diary / Reading Tracker | Personal reading status, optional progress, notes/reactions/highlights/reflections and history | Reusable book metadata where useful; user-entered books always remain possible |
| Optional Daily Edit weather | A configured location preference where needed; no personal weather-history tables | Current/forecast API retrieval and sensible caching, not indefinite response retention |
| Evening at a Glance | Derived projection of existing source records by default, not a second permanent day-summary record | Reference content stays distinguishable from personal recorded information |

Every meaningful user-entered field needs a reason, an appropriate persistence strategy, review/revisit, edit/delete where applicable and an analytical use only when useful. Not every field needs a chart. Never collect information simply because it might be interesting someday.

## Tarot Study & Journal

**PLANNED / NOT YET IMPLEMENTED:** combine daily draws, learning the deck and personal reflection, rather than a generic card generator with a text box.

- Draw/reveal a card of the day through a polished accessible interaction.
- Learn its name, suit, number, visual symbolism, accessible general meaning, upright/reversed interpretations and common contextual readings.
- Write a personal interpretation and response, optionally associating recorded emotions; revisit/edit past draws and reflections.
- Browse the full deck as reference, see personal history with each card and track learning/encounters separately from draw history.
- Keep established symbolic traditions separate from the user's own meaning. Tarot is reflective interpretation, never scientifically validated prediction.

Potential future analytics: card frequency, Major/Minor Arcana, suit and orientation distributions, cards encountered/studied, journal consistency, recurring interpretation themes and optional relationships to recorded feelings. Describe associations with appropriate denominators/context, never causation or scientific spiritual findings. No interpretation-mining service is selected or implied.

Architecture audit: distinguish canonical card reference, user-owned draw, original draw date/time/timezone, orientation, personal interpretation, optional emotion links and learning progress/history. Stable reference relationships avoid duplicated canonical prose. Deck content/artwork rights and historical reference-version needs require review before implementation.

## Dream Diary — capture, explore, understand

**PLANNED / NOT YET IMPLEMENTED:** title/freeform dream capture with a sleep or waking date, emotions experienced, and structured people/place/symbol/theme associations. Support lucid/recurring/nightmare or other useful categories, revisiting/editing, personal associations and possible interpretations. Interpretation invites reflection, never presents speculative symbolism as objective fact.

Potential future analytics: recurring themes, people/symbols/scenarios, emotional patterns, recall frequency and optional comparisons with recorded Mood/Stress. A missing dream entry is not evidence of dreamless sleep or poor recall; do not infer sleep measurements. Distinguish dream emotions from waking check-ins even when sharing canonical vocabulary IDs.

Architecture audit: structured associations alongside prose, original dream/sleep/waking date distinct from creation/edit timestamps, stable identity, strong authenticated user-level journal privacy, export/delete and deliberate excerpt sharing. Sensitive text must not appear automatically in dashboard summaries.

## Unhinged Fortune Cookie

**PLANNED / NOT YET IMPLEMENTED:** interactive cookie-crack/fortune reveal, with reduced-motion equivalent. Editorial target: **80% chaotic, absurd, dry, bizarre, mildly unhinged; 20% unexpectedly profound, thoughtful or beautiful**. Avoid generic affirmations, clichéd motivational quotes and repetitive wellness copy. This is intentionally ridiculous, not a predictive or therapeutic claim.

Users may open a cookie, explicitly save/favorite a fortune, browse their saved collection and optionally associate a saved favorite with a day. A display alone creates no permanent personal record. Content may use a curated library or later service; no provider/generator is selected. Prefer stable content references to repeated text, with licensing/version/availability needs considered during the audit.

An intentionally day-associated saved fortune may later appear as a small artifact in Evening at a Glance. Both the interactive component and optional Daily Edit widget remain separate planned features; neither is implemented in this header pass.

## Detailed Cosmic Forecast

**PLANNED / NOT YET IMPLEMENTED:** a detailed editorial horoscope with an overall daily outlook and expandable facets for love/relationships, career/ambitions, friendships/social life, personal growth, energy and emotional atmosphere. Facet structure/content/provider remain decisions to validate, not a connected API.

Frame astrology as interpretive entertainment/personal reflection, never established scientific prediction. Retrieve and cache date/sign content appropriately. Do not create per-user horoscope history or analytics by default. An explicitly approved future save/favorite use case could justify revisiting that policy.

The existing optional Daily Edit compact preview stays where it is. A future Whimsy detail experience should share its source boundary rather than create conflicting forecasts; no current placement or provider behavior changes.

## Fun Fact of the Day

**PLANNED / NOT YET IMPLEMENTED:** one genuinely interesting, sometimes bizarre daily fact from varied science, animals, history, language, space, nature, culture, inventions and other topics. Provide a short explanation, credible sources where appropriate and optional Tell me more. Avoid frequent repeats when practical.

Use reference content retrieval/lightweight caching, not personal historical fact records or personal analytics. Choose sources, attribution, accuracy checks and cache/repeat policy when implementing; no content API is chosen now.

## Personal Book Diary / Reading Tracker

**PLANNED / NOT YET IMPLEMENTED:** a lightweight enjoyment/reflection experience inside Whimsy, not a full Goodreads replacement or another obligation.

- Add books with title, author and useful metadata, including manual entry without an external lookup.
- Statuses: Want to Read, Currently Reading, Finished, Did Not Finish.
- Optional progress, personal notes/reactions/highlights/reflections; revisit and edit reading history.
- Current book may be surfaced in relevant Daily Edit summaries.

Potential future analytics: completed books over time, history, tracked genres/authors, explicitly logged reading consistency/progress, ratings/reactions, current/completed books. Never infer reading time, progress or daily activity merely from a book entry or Currently Reading status.

Audit reusable book metadata versus user-specific reading status/progress/notes/history. The correct historical current-book association needs explicit dates/status history rather than using today's status for every old day. No schema or metadata provider is selected.

## Optional Daily Edit widgets

**PLANNED / NOT YET IMPLEMENTED:** users may eventually choose which Whimsy experiences appear on Daily Edit. Do not build the widget/reordering system or new cards in this pass. Preserve the concise Daily Edit surface and its existing source ownership. Visibility and sensitive-excerpt permissions are distinct from merely having a source record.

## Evening at a Glance

**PLANNED / NOT YET IMPLEMENTED.** Working name: **Evening at a Glance**. A concise editorial snapshot near the bottom of Daily Edit, assembled from information already recorded; never another daily form, scorecard, wall of cards or surveillance report. Final design/content selection is undecided.

Possible source relationships, only when available:

- Mood's actual date/session feelings, influences, optional reflections and separate Energy/Stress/Overall Day values.
- Existing date-level intention text/emoji and ordered Day in Three (Day Vibe) emojis, without converting them into Yale emotion measurements.
- Whimsy's dated tarot draw plus a permitted short reflection excerpt/link; an explicitly saved/day-associated fortune; relevant personal reading records.
- Rituals' scheduled outcomes, existing completed Planner work and Daily Edit priorities, without inventing a combined productivity score.

Prefer a derived read projection over normalized source records, preserving authenticated user ownership, correct local date/timezone, source IDs and original-record navigation. Do not copy the same content into permanent summary records by default, require re-entry, manufacture missing entries or rewrite old days using current mutable state. Omit unavailable fields. Clearly distinguish actual recorded information from reference content/generated interpretation. Sensitive dream/tarot/other journal text requires deliberate product controls before surfacing.

The implemented compact **Dayprint** in Mood is an existing projection, not this future cross-module summary. Reuse canonical dated expression/check-ins; do not create a competing daily measurement store. Persisted summary snapshots require a later explicit product need and lifecycle/deletion policy.

## Connected Insights

**PLANNED / NOT YET IMPLEMENTED for these future connections.** Muse doesn't just remember what happened. It helps users make sense of it. Existing deterministic Insights is retained; no new engine or analytic dataset is created here.

Potential optional connections include tarot draws/reflections with recorded emotions; dream themes with Mood/Stress; explicitly recorded reading activity with reflections; intention emojis versus Day Vibes; recurrence-aware ritual consistency with Overall Day; and other cross-module questions with clear user value.

Use correct local-date joins, source relationships, independent denominators, missing-versus-zero semantics and sensible sample thresholds. Show observations rather than causal, clinical or spiritual scientific claims. Avoid duplicate dates/check-ins and biased joins that treat an absent entry as a negative outcome. Interpretive content and unvalidated emoji expression never become diagnostic measurements. Derived analyses must respect user permissions, edit/delete propagation and sensitive-text choices.

## Optional weather widget

**PLANNED / NOT YET IMPLEMENTED:** small Daily Edit current weather/temperature/high/low/conditions, with optional expanded forecast. Manual location is the default supported configuration; location permission is optional and only requested explicitly when the user chooses it. Use an appropriate future API with sensible caching and restrained request frequency. No provider chosen, permission requested, API connected or permanent personal weather-history table created now.

## Upcoming repository / Supabase audit guardrails

**PLANNED / NOT YET IMPLEMENTED:** prioritize reliable persistence for existing functional modules first; future Whimsy provides extension context, not immediate schema work.

Shared conventions to validate: authenticated ownership/RLS; stable IDs; local calendar dates plus source-appropriate timezone/capture semantics; original creation and last-modification timestamps; explicit cross-module references; optional Daily Edit associations; appropriate historical preservation; secure private journals; cross-device synchronization and conflict handling; source-aware review/export/edit/delete; deterministic meaningful analytics without duplication.

Do not pre-create every future table, add generic catch-all JSON records, introduce a universal event log duplicating all personal data, archive all API responses indefinitely or build pipelines for unimplemented features. Domain history may be justified for a real historical requirement; that does not authorize a universal duplicate log. External caches are not personal journals, and a chosen favorite is not equivalent to a content impression.

Revisit during the audit:

1. Ownership/lifecycle of canonical references versus user records, reference licensing/versioning and deletion cascades.
2. Local date versus capture/edit time, sleep/waking dates, explicit day associations and historical reading/state accuracy.
3. Permissions for sensitive excerpts, optional connections/widgets and deletion from derived/cached results.
4. Session-to-database migration, existing draft/record identity, per-user preferences, loading/conflict states and reliable cross-device sync.
5. Source/content cache keys, attribution/freshness, retention and minimal location handling; keep weather/forecast/facts out of personal history by default.
6. Analytics sufficiency, recurrence-aware opportunities, independent measurements, optional participation and honest missing-data handling.

Detailed schema, provider selection, generalized widget infrastructure and implementation ordering are future audit/product decisions. No schema or migration is approved merely by inclusion in this roadmap.
