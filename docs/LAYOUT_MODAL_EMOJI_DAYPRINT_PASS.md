# Layout, modal, emoji and Dayprint corrections

## Implemented in this focused pass

- Planner desktop surfaces use the measured viewport remainder after the actual header/toolbar/page spacing, not a fixed viewport subtraction or maximum height. Workspace/task counts do not change the shell height. Rail and day capture controls sit at the bottom; source tasks and dated schedule/tasks have internal overflow. Short available heights and mobile use natural page flow rather than cramped scroll regions. Task identities, cards, timers, dates and native placement are unchanged.
- Classification retains its immediate Workspace/Group behavior and portal bounds, with a full token-sized search-to-heading gap, consistent heading/option spacing and padded close/header.
- Shared SVG icons use three vivid opaque theme stops without the pale refractive highlight band or default blur. Glass remains on surfaces; functional close/action buttons use readable monochrome glyphs. Existing semantic/Yale colors, themes, geometry, sizes, gold rewards and optional selective jewels remain.
- The shared modal is explicitly a column. The feeling picker puts title and X in one horizontal header, with search/filters, one scrolling result area and persistent selection/Done footer below. Native Escape/focus containment and return-to-trigger remain.
- Mood uses an independent left stack: check-in, then its own Day in Three card; the separate right Day Pulse card sizes to content. Reflection/Meter remain below. Mobile stacks in that order. Daily Edit retains its existing embedded entry point so its dashboard information architecture is not changed.
- Day in Three uses one continuous full-vocabulary picker with a local draft, visible selections/count, a three-item limit, explicit replacement/removal, Done and Cancel. Escape/X/outside cancellation does not commit. Saved emojis have simple remove actions and open editing when clicked; cycling/reorder arrows are removed. Its existing per-local-date confirmed list is the only source in both Daily Edit and Mood/history.
- Dayprint has date/intention on the left and labeled Day in Three plus attributable ratings on the right, wrapping naturally on narrow screens. Session sections below retain their feelings/influences/reflections and edit/delete. It filters records to its own date, preserves Morning/Evening identity and never combines conflicting ratings.
- Removed Planner's reset footer and Mood's repeated favorites/reset notice. Accurate session update/status remains. Settings has a development-only prototype/storage indication; no persistence is claimed.

## Day Pulse integrity: mismatch deliberately preserved

**Inspected current representation:** `EmotionalCheckIn` stores Energy, Stress and Overall Day alongside each explicit local date + Morning/Evening session. `useMood`, history, summaries and current Insights consume those records. No persisted daily Pulse entity exists and no seeded emotional-history records are invented. Users may nevertheless have entered different Morning and Evening scores in their live session.

**Approved intended direction:** one daily Day Pulse per authenticated user/local calendar date; separate Morning/Evening emotional sessions for feelings, influences, reflections and session capture metadata. Intention/emoji and ordered Day in Three remain date-level expression, analytically separate from Yale feelings and ratings.

**Safe current presentation:** the right summary explicitly says Morning ratings / Evening ratings, preserves each actual value and omits missing fields. Day Pulse controls show the selected session's attribution. No score is selected as the daily answer, averaged, copied, overwritten or discarded. Existing record/session identity and independent observation counts remain. This is not represented as a completed daily-model migration.

### Upcoming repository / Supabase audit

1. Specify a canonical daily Pulse relation with stable ID, authenticated ownership, local date, timezone, nullable independent 1–10 dimensions, original createdAt and updatedAt; one record per user/local date.
2. Keep emotional sessions separate and preserve explicit period, original local date/timezone/createdAt and existing emotion/influence/reflection IDs/content. Editing time must not reclassify capture time/session.
3. Inventory legacy per-session values before any conversion. Preserve provenance and all distinct observations. Conflicting Morning/Evening values need explicit user review or an approved conversion policy; do not silently choose latest, average them or infer a daily score. Even a single legacy session value cannot silently acquire a different meaning.
4. Update Daily Edit, Mood, Dayprint, independent means, trend/relationship denominators and delete/clear semantics together. Keep legacy session observations clearly attributed and analytically separate until resolved; prevent old/new duplicate counting.
5. Separate clearing a daily Pulse from deleting an emotional session. Preserve correct user/local-date joins across DST/timezone changes and original timestamps, not UTC truncation or edit-date joins.
6. No schema, migration, new backend, automatic backfill or second live score store is introduced in this UI correction batch.

**Product decision still required:** how to interpret/resolve legacy session scores when transitioning to the approved daily record, particularly conflicts. New persistence should use the clean separation rather than bake the current prototype coupling into Supabase.

## Files created

- `components/planner/usePlannerHeight.ts`
- `tests/layout-corrections.test.mjs`
- This report/audit note.

## Files materially changed

- Planner: `Planner.tsx`, `Planner.css`, `PlannerRail.tsx`.
- Shared presentation: `PrismaticSvg.tsx`, `PrismaticSvg.css`, `MuseIconButton.tsx`, `MuseControls.css`, `MuseModal.tsx`, `MuseModal.css`, `EmotionPicker.tsx`, `MoodCard.tsx`.
- Expression/history: `EmojiPicker.tsx`, `EmojiPicker.css`, `DayInThree.tsx`, `DayPulseCard.tsx`, `lib/daily-expression.ts`, `components/mood/Mood.tsx`, `Mood.css`, `Dayprint.tsx`.
- `app/settings/page.tsx` development-only notice.
- `docs/PRODUCT_RULES.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURE_SPEC.md`.

No theme definitions, backend, financial calculations, authentication or domain-record migrations changed. All existing working-tree work was preserved. No commit or push.

## Validation

Domain tests cover immutable emoji drafts/cap/replacement and conflict-preserving, date-filtered Dayprint presentation. Existing model tests retain independent scores and session identity. Actual local headless-browser checks cover desktop Planner viewport sizes, stable rail height on workspace switch, internal overflow, bottom capture, classification bounds/spacing, proper modal title/X/footer, continuous emoji selection, removal/replacement, Cancel/Done/Escape, shared Dayprint and separate Morning/Evening records. Final lint/type/build results and responsive completion are recorded below after verification.

Final verification: lint clean, TypeScript clean, 167/167 tests and production Next build passed. Actual isolated headless Chrome checks passed Planner at 1440×1200/900/540, 1280×720, 820×740 and 390×740; stable workspace changes; long source/day lists with internal overflow; native drop through the new content scroller; classification spacing/bounds; all nine themes at desktop/390/320 widths (27 Mood/emoji viewport cases); and Frosted light/dark/birthday bottom-right picker bounds with keyboard selection/Escape. Feeling-picker header/scroll/footer bounds and native Escape/focus return passed. One/two/three selections, explicit replacement/removal, Cancel/Done/Escape/outside cancellation, zero confirmation and return focus when its original emoji trigger is removed passed. Confirmed emojis were shared across Daily Edit/Mood and projected in Dayprint. Separate conflicting Morning/Evening scores stayed attributable and unchanged. Desktop/mobile screenshots were inspected. No claim of exhaustive cross-browser or physical-device testing. No UI blockers remain; the daily Pulse conflict/migration policy remains an explicit upcoming-audit product/data decision.
