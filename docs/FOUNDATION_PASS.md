# Foundation pass — implementation report

## Files created in this pass

- `docs/PRODUCT_RULES.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURE_SPEC.md`, and this report.
- `app/planner/page.tsx` — real Planner route with search-parameter Suspense boundary.
- `lib/planner.ts` — domain types, factories, selectors, date validation, reducer, timer accounting.
- `lib/planner-sample.ts` — clearly separated canonical sample records/taxonomies/events.
- `lib/constellations.ts` — optional profile motif registry.
- `components/PlannerStore.tsx` — canonical in-memory provider above routes.
- `components/MuseDrawer.tsx` / `.css` — reusable native modal glass drawer.
- `components/ProfileConstellation.tsx` / `.css` — decorative registered motif and reduced-motion styling.
- `components/planner/Planner.tsx` / `.css` — responsive board, Inbox, filters, date navigation, drag targets.
- `components/planner/PlannerTaskCard.tsx` — completion, details entry, compact context, drag handle.
- `components/planner/TaskQuickAdd.tsx` — title-first day/Inbox creation.
- `components/planner/TaskMoveControl.tsx` — keyboard/touch date and Inbox rescheduling.
- `components/planner/TaskDetails.tsx` — task fields, notes, subtasks, estimates/actual, timer.
- `components/planner/PlannerOrganization.tsx` — workspace/group/tag management.

## Existing files changed in this pass

Some were already untracked from earlier approved passes; this list distinguishes modifications from genuinely new files in this pass.

- `AGENTS.md` — durable reading/update/product preservation rules; existing Next agent block retained.
- `app/[module]/page.tsx` — exclude the real Planner route from generated placeholders.
- `app/globals.css` — semantic control/selection/completion roles, keeping atmosphere geometry unchanged.
- `app/themes.css` — complete semantic identities; Astral now blue/cobalt/cyan/ultraviolet, original Iridescent and Prism Noir atmosphere retained.
- `app/interactions.css` — theme-specific hover gradient roles.
- `components/AppShell.tsx` / `.css` — mount shared task provider, compose global theme control with Daily Edit temporal cluster; preserve sidebar/mobile navigation structure.
- `components/DailyEdit.tsx` — consume canonical Plan source.
- `components/MuseHeader.tsx` / `.css` — approximately 60/40 composition, wider two-line-oriented greeting, optional profile ornament; section/grid gap remains 20px.
- `components/DateNavigator.tsx` — reuse gradient edge on date controls.
- `components/ThemeSwitcher.tsx` / `.css` — reusable hover/focus edge and semantic selected state.
- `components/WeekNavigator.css` — theme-specific selected date.
- `components/ScheduleCard.tsx` / `.css` — shared tasks/events, semantic completion, bounded Planner links.
- `components/PlanEntryForm.tsx` — canonical task factory/default workspace; events remain distinct.
- `lib/models.ts` — extend existing task shape, retaining stable IDs and `complete`.
- `lib/daily-edit-data.ts` — remove independent Daily Edit task samples; retain lightweight events.
- `lib/mock-profile.ts` — optional mock zodiac sign alongside name/time zone.
- `lib/themes.ts` — blue-cosmos Astral preview orb.
- `tests/daily-edit.test.mjs` — shared-source, reducer/time/domain, theme contract and responsive structural checks.

## Documentation

PRODUCT_RULES records philosophy, ownership, Mood/missing-data semantics, analytics, stack and environment direction. DESIGN_SYSTEM records typography, official stars, materials, five theme identities, reusable interaction behavior, shell/header/Planner rules. FEATURE_SPEC explicitly labels implemented, approved/planned, and future/exploratory features, including horoscope, recurrence, other modules, persistence, and independent-account architecture. AGENTS instructs future work to read/update them without converting brainstorming into rules.

## Theme and interaction architecture

One component tree uses the same complete token set for all five themes. Existing color-family variables remain compatibility roles; semantic roles cover selection/background/border/text, navigation, focus, success, hover, progress, stars, surfaces and accent hierarchy. New Planner colors are semantic palette roles, not hardcoded theme hex in components. Adding a sixth theme primarily requires registry metadata and a complete token block.

Prism Noir's atmosphere/water colors are preserved. Astral's formerly pink/violet-heavy compatibility roles, atmospheric glow and progress now use blue/cobalt/cyan/ultraviolet. Iridescent's atmosphere, glass and water treatment remain intact; new selections are pearlescent aqua/orchid/blush. Nightbloom uses emerald/peacock and restrained berry; Solstice uses raspberry/coral with turquoise contrast.

Reusable gradient hover/focus and Muse Spark were retained and extended, not duplicated. Static cards remain static; genuine controls opt into edges. Spark stays brief, absolute, theme-aware and reduced-motion compatible. New MuseDrawer provides native dialog accessibility. Constellation shimmer is gentle and disabled with reduced motion.

## Header and constellation

The greeting uses a wider approximately 60% editorial track and responsive clamp sizing rather than a narrow three-line measure. The 40% temporal track groups stars/date/week; the one global theme selector occupies its top-right row on desktop and retains its normal mobile placement. The content-section title stays 20px before the grid. Exact line breaks require browser review.

ProfileConstellation consumes zodiacSign through a registry, never a hardcoded visual-component sign. The mock profile supplies Virgo; missing/unsupported signs render nothing. Seven official MuseStar nodes/six fine connections form a stylized ornament, not a scientific chart or horoscope. No astrology API was added.

## Planner and Daily Edit integration

AppShell owns PlannerProvider, with one task collection and a separate event collection. Pure domain commands are used from both pages. The task contract keeps ID/title/workspace/group/tags, plannedDate, independent dueDate, time slot, notes, estimate, actual time, completion, subtasks, optional recurrence metadata and createdAt. Changing plannedDate does not change dueDate, complete the task or duplicate it.

Daily Edit filters that collection for selectedDate, uses configurable three-event/five-task previews, counts all records, and routes overflow to date-specific Planner. Planner is the full local environment; there is no parallel DailyEditTasks dataset.

## Fully working local features

- Four adjacent desktop days, compact focused-day mobile/week navigation, date picker, Inbox, search/workspace/group filtering.
- Quick task creation in days/Inbox; detail title editing, organization, planned/due dates, optional time, notes, estimated minutes, delete.
- Workspaces: create/rename/accent/safe empty deletion. Groups: create/rename/move workspace/delete. Tags: reusable/multiple/create/rename/accent/delete.
- One-level subtasks: add/edit/check/delete.
- Completion with Muse Spark and shared state across views.
- Move/date picker/Inbox and native desktop drag/drop using the same command; keyboard/touch have explicit Move.
- One task timer at a time, pause/switch/complete accounting, independent fractional actual minutes, live details readout, reopen running timer from Planner.
- Existing Daily Edit priorities/intention/movement/water/meals/Mood/Pulse and app-shell navigation retained.

These are local-state implementations. They survive client navigation, not refresh.

## Approved/planned, not implemented

Recurrence generation/editing, historical timer logs, backend persistence, authentication/RLS, calendar integration, full other modules/Insights, expanded greeting library, Appearance controls beyond theme and system reduced motion, dashboard card reorder/reset. Only recurrence metadata is prepared; no fake recurrence engine. Horoscope remains exploratory/not v1.

## Implementation decisions

Preserved the existing `complete` boolean rather than renaming domain records. Organization accents use three theme-relative roles. Occupied workspaces cannot be deleted; deleting groups/tags clears their task references and keeps tasks. Basic timer allows one active task. Narrow desktop boards scroll locally to preserve column usability; mobile shows one day. Native drag/drop avoids a dependency while Move supplies an accessible alternative. Domain data remains in memory; only the existing theme preference persists.

## Checks and pre-persistence debt

Lint, 23 automated domain/SSR/structural tests, TypeScript through production build, and production build pass. Theme contract/contrast checks, preview counts, identity-preserving moves, shared completion, safe deletion, timer independence, official-star ornament and responsive structure are covered. No browser is connected: no visual, drag gesture, real keyboard/focus or touch verification is claimed. Review all themes/header/Planner locally before approval.

Before Supabase: ownership/user scoping and RLS; schema/foreign-key migrations; explicit date/time-zone and recurrence-instance semantics; validated server/repository boundaries; loading/error/optimistic conflict handling; auditable timer sessions instead of trusting browser clocks; browser interaction/accessibility/contrast QA. The existing experimental Turbopack CSS rule does not reliably export CSS-module mappings, so this pass uses prefixed ordinary CSS; address the pipeline before introducing CSS modules.

No dependencies added. No Supabase, auth or external integration. No Git configuration changes, commits or pushes.
