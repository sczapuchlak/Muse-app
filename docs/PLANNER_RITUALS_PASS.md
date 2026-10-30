# Planner refinement and Rituals — review report

This report describes the local-state implementation for this pass. PRODUCT_RULES, DESIGN_SYSTEM and FEATURE_SPEC remain the living sources of truth. FOUNDATION_PASS is the earlier implementation snapshot.

## Files created

- `app/rituals/page.tsx` — real Rituals route.
- `lib/rituals.ts`, `lib/rituals-sample.ts` — definitions/groups/entries, recurrence and streak semantics, reducer, sample data.
- `components/rituals/Rituals.tsx`, `Rituals.css` — week context, summaries, responsive groups and editor orchestration.
- `components/rituals/RitualStore.tsx` — Ritual domain commands over the established in-memory session store.
- `components/rituals/RitualGroup.tsx`, `RitualWeekCell.tsx` — grouped weekly tracking and semantic status cells.
- `components/rituals/RitualEditor.tsx`, `RitualEntryEditor.tsx`, `RitualGroupManager.tsx` — creation/editing/logging/group sheets.
- `components/planner/PlannerRail.tsx`, `PlanningDropZone.tsx` — planning source rail and shared day/Inbox drop targets.
- `components/MusePageHeader.tsx`, `MusePageHeader.css` — shared functional module header.
- `components/MuseChoiceMenu.tsx`, `MuseChoiceMenu.css` — bounded searchable choice popover for workspace/group/tag controls.
- `components/useMuseToday.ts` — shared hydration-safe profile-time-zone day clock.
- `components/MuseRitualFeedback.tsx`, `MuseRitualFeedback.css` — Orbital Glint, Constellation Celebration and cleanup/reduced-motion behavior.
- `tests/helpers.mjs`, `tests/rituals.test.mjs` — shared test compiler loader and Ritual domain/SSR checks.
- This report.

## Files materially changed

- `components/planner/Planner.tsx`, `Planner.css` — rail/canvas hierarchy, compact filters, integrated search, actual-today marker, time formatting, mobile views and dark materials.
- `components/planner/PlannerTaskCard.tsx` — before-task drop insertion and cleanup.
- `components/planner/TaskMoveControl.tsx` — keyboard Move earlier/later alternatives.
- `components/planner/TaskQuickAdd.tsx` — seed tag filters into planned task creation.
- `lib/planner.ts` — canonical placement/reordering command and readable duration formatting.
- `lib/dates.ts` — shared date validation moved here and re-exported from Planner for compatibility.
- `app/themes.css`, `lib/themes.ts` — complete Afterglow identity and five planning material roles in all themes.
- `app/interactions.css` — shared semantic organization accents, used by Planner and Rituals.
- `components/WeekNavigator.tsx` — use the shared day clock; existing UI/behavior preserved.
- `components/MuseDrawer.tsx` — opt-in editor autofocus with native modal focus containment/return preserved.
- `app/[module]/page.tsx` — exclude Rituals from placeholder generation.
- `lib/navigation.ts` — Appearance description now acknowledges six themes; sidebar structure unchanged.
- `tests/daily-edit.test.mjs` — six-theme restoration/contract/contrast, planning rail, canonical ordering and shared-state coverage.
- `docs/PRODUCT_RULES.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURE_SPEC.md` — durable approved decisions and accurate statuses.

Daily Edit layout and global navigation structure were not redesigned. No dependency was added.

## Planner completed

A 280px secondary planning rail now contains the workspace switcher, Unscheduled source pool, quick creation, and task cards. It is visually distinct from the dated tracks. User-defined workspaces scope the source and canvas; group/tag/title filters sit above the canvas and do not hide source tasks. Group filtering is single-choice; tag filtering requires all selected tags. Rail creation inherits workspace; planned creation also inherits canvas group/tags.

Four adjacent desktop days retain date, task count and readable total planned duration, for example 2h 45m. Actual today is distinct from selected day. Narrow desktop canvases scroll internally rather than squashing columns. Mobile recomposes into Day plan / Unscheduled views with date/week navigation, one day, and Move controls.

Native drag moves from the pool/between days. Drop above a task to reorder; drop on a day background to append. Keyboard Move earlier/later uses the same canonical placement command. IDs, due dates, completion, estimates, notes/subtasks and timers remain intact. Daily Edit consumes the same ordered task source and keeps its three-event/five-task preview.

Approved copy is implemented: MAKE SPACE FOR WHAT MATTERS / Planner / Make a plan that can move with you.

## Rituals completed

- Week navigation and selected-date control, actual-today indication, backdated edits, user-created named/icon/accent groups, collapse and safe empty-group deletion.
- Add/edit rituals with group, measurement type, goal/unit, start date and daily/weekly/specific-weekday recurrence. Checkbox, quantity, duration in minutes, and whole-count weekly targets are supported.
- Seven aligned day cells per row on desktop; one focused-day touch control per row on mobile, with the week navigator/weekly context retained.
- Checkbox interaction and numeric/duration/weekly entry sheets. Future and unscheduled logging are blocked. Quantity entries can be cleared to restore missing state; explicit zero is retained as data.
- Complete/logged, unlogged/partial past, open today, upcoming and not-applicable states remain distinct. Weekly targets accumulate across eligible dates; blank eligible days are not daily failures.
- Recurrence-aware observed streaks skip unscheduled dates. Daily and weekly goals/streak units remain separate. Small summaries use actual sample/session records, not fabricated insights.
- Orbital Glint on ordinary completion and four-star Constellation Celebration only at meaningful thresholds. All crossed thresholds are remembered within the session to avoid replay after undo/backfill corrections.

## Afterglow and dark hierarchy

Afterglow uses graphite/charcoal with luminous mint/aqua, electric lilac/periwinkle and selective peach/pink. It supplies the same 77 tokens as every other theme; selector label/orb, accents, progress, stars, focus, hover, glass and selected states update through the existing registry/preferences. Existing Prism Noir background/global glass/progress colors are preserved.

Dark planning surfaces distinguish atmosphere, column/rail, and task/control levels through theme-tinted translucent material tokens and clearer borders. Automated checks validate task/metadata contrast and elevated task luminance for every dark theme. These numeric checks do not substitute for visual review.

## Reusable patterns

Shared MusePageHeader, choice popover, day clock, planning drop zone, semantic organization accents, Orbital Glint and Constellation Celebration. MuseStar, Muse Spark, MuseDrawer, GlassPopover, date/week navigation and gradient hover/focus/press remain the established implementations. New effects are local/absolute/pointer-transparent, clean up after themselves, and replace movement with a static glow under reduced motion.

## Local state and intentional deferrals

Tasks/events still use the one Planner source. Ritual definitions, groups, entries, collapse and milestone keys use the existing memory session and survive client navigation only. Theme preference alone persists across refresh. Starter groups/names and records are identifiable samples.

No Supabase/auth/calendar API, full analytics, horoscope API or later module was built. Durable positions, user ownership/RLS, unique ritual/date constraints, recurrence/goal versions, correction history, optimistic conflicts and durable milestone eligibility belong to persistence work. Richer month/year/weekday analytics remain approved/planned.

No conflict with established product direction was found. One deliberate temporary constraint protects data meaning: after its first entry, a ritual's type/goal/start/schedule cannot change; title/group remain editable. History-safe effective-dated changes are planned rather than silently reinterpreting old records. Weekly-target eligible-day semantics are explicitly distinct from daily scheduled obligations.

## Verification and browser review

Lint, 38 automated tests, production build and local HTTP rendering checks for /, /planner and /rituals pass. Tests include all six theme contracts/contrast/material separation; canonical task moves/order/completion; recurrence-aware streaks, missing/zero, backdating/future rejection, weekly aggregation, group safety, milestone replay and reduced-motion structure.

No browser is connected. No desktop/mobile screenshot, real drag gesture, focus traversal or animated visual verification is claimed. Existing local preview is http://localhost:3000; the attempted additional dev process exited on detecting that server, which was left untouched.

Inspect closely:
1. All six Planner themes, especially dark task-versus-column separation and Afterglow's graphite/candy balance.
2. Rail/canvas hierarchy at laptop widths, internal board scrolling, workspace context and compact filters.
3. Mobile Day plan / Unscheduled switching and Ritual selected-day entry controls.
4. Ritual state distinctions, backdated edits and weekly-target progress.
5. Completion feedback: the sample “A moment before the scroll” has two prior scheduled completions; completing Thursday on the sample date can cross the three-opportunity milestone. Also review reduced-motion static feedback.
6. Keyboard focus, native drawers, popovers, drag/order alternatives and theme switching across routes.

Nothing committed or pushed. Stop here for visual review; no subsequent module is part of this pass.

## Continuation audit after interruption

Re-read AGENTS and the three source-of-truth documents, inspected the working tree and existing components, and compared the implementation against the Planner/Rituals request. The feature work above was already present before the interruption; no replacement implementation or unrelated refactor was necessary.

This continuation corrected the Afterglow row's Markdown table formatting in DESIGN_SYSTEM and completed fresh verification: lint, all 38 tests, production build, HTTP 200 responses and expected rendered markup for Daily Edit/Planner/Rituals, matching 77-token contracts across six themes, and generated Rituals group/week structure. Existing working changes and the local server were preserved.

Browser discovery still returned no connected browser. Desktop/mobile screenshots, all-theme visual approval, real drag gestures, focus traversal and animation review remain unverified. These are the remaining review items, rather than missing local feature implementations. Persistence, history-safe schedule versions and full analytics remain intentionally deferred as specified above. No new durable product decisions were introduced in the continuation.
