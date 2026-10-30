# Hero, Planner, Ritual and Mood refinement — review report

This pass implements both attached briefs, including the Ritual status/week-progress and Mood picker sections appended to the regression brief. Existing theme palettes, domain identity, dates, canonical task/meal ownership and navigation organization are retained. No dependency, persistence, commit or push was added. Permanent rules live in PRODUCT_RULES, DESIGN_SYSTEM and FEATURE_SPEC; previous reports are historical snapshots.

## Planner regression analysis and solution

Source/served CSS inspection found a fragmented outer layout: toolbar, rail and canvas were separately positioned across grid rows, the rail spanned two rows, and responsive overrides were distributed through the stylesheet. The nested board enforced three 230px minimum tracks regardless of available canvas width. This made the layout unnecessarily fragile around content-width changes. The exact browser-computed failure from the visual report could not be reproduced without a connected browser; the original stylesheet was being served, so missing CSS is not an established cause.

The replacement has two structural grid children: bounded 260–280px source rail and flexible minmax(0,1fr) canvas. Both explicitly use available width/min-width:0; the day tracks share that width rather than retaining their own overflowing minimums. Three useful columns display above 1050px content width, two at 821–1050px, and one at/below 820px. The logical rolling window remains three days and arrows shift one day. No date/completion/due-date/task model was duplicated or changed.

Search and the compact Filters/Today/arrows row live in the rail. The workspace menu has context choices, unscheduled counts, selected state, New workspace and organization management. Unscheduled/day task creation, metadata, estimates, events, drag handles, Move and reorder continue to use the original model. The rail scrolls independently. Mobile Planning Space opens in a native sheet; compact Filters/day navigation stay reachable outside. Sheet popovers portal inside the active dialog and use its coordinates so native focus/inert boundaries do not disable them.

## Header and hero corrections

- Removed the sidebar connector SVG and its line styling. The logo/collapse control remain independent, with only two tiny standalone signature stars.
- Daily Edit explicitly enforces a no-wrap horizontal signature-stars → Theme Picker row, with date/week beneath. The profile-driven constellation has clearer lines/nodes and avoids compounded opacity. Its desktop visibility threshold is less aggressive; decoration yields to controls below 900px content width. Existing 160px constellation height is retained, without adding a decorative vertical stack.
- Broad module hero artwork now occupies the central illustration track with no rectangular art panel or functional overlap. Shared SVG primitives compose different illustrations: Planner's map/path with three fragments; Rituals' intersecting orbits/phase markers; Nourish's botanical curves, leaf geometry, crescent and MuseStar blooms. Distant points, faint linework and selective official stars create depth.
- Functional hierarchy remains mantra/title/subtitle left, artwork center, context/date right. Module heights/compositions vary deliberately. Narrow layouts reduce/hide artwork before controls crowd. No theme-specific component copies or new palette values.
- Planner and Rituals copy retained. Nourish mantra is now NOURISH WHAT CARRIES YOU, with its existing title/subtitle.
- Sparse node shimmer uses the shared timing system; reduced motion leaves static art. No screensaver motion, photography, cartoon planets or new star geometry.

## Ritual refinements and decisions

The underlying Complete/Partial/Missed/Unknown/Not Scheduled/Upcoming states and dated history are preserved. Complete numeric/duration cells retain the actual recorded value in a vivid filled control with a small check badge. Complete binary cells use a filled check. Only Partial displays a progress ring. Unknown/open uses an empty indicator, explicit missed an ×, not scheduled a dash, upcoming its subtle star. Today no longer creates a double-ring completion treatment. Weekly sessions remain sessions; the weekly aggregate explicitly marks its goal complete.

`ritualDayProgress` computes full completed scheduled daily goals / scheduled daily goals. There was no approved fractional-adherence model, so partials remain separate rather than receiving invented proportional credit. Future dates and dates without daily obligations have no percentage/bar. A nonempty perfect daily-goal date receives an official MuseStar, with a small Spark on a new transition, not initial history hydration. Clearing/undo removes the star. Weekly targets remain separate obligations and do not create daily failures or daily perfect-star requirements. Missing records are not reclassified as Missed.

Category containers clip their banner/pseudo-element to their rounded boundary. Header margins/padding derive from the same local group-padding value at desktop/mobile sizes; no arbitrary margin patch or loss of group gradient identity.

## Mood picker

The feeling picker is now a native `MuseModal`, approximately 660px wide and 75dvh on desktop, near-full-width/90dvh on mobile, with short-screen adaptation. Search/quadrants and Done occupy fixed flex regions; only results scroll. Desktop results use two columns and mobile one. The whole vocabulary is browseable without searching; existing search/quadrant/multi-select IDs and check states are preserved. Horizontal filter scrolling is allowed on narrow screens, with no second vertical scrollbar.

`useMuseDialog` is the common modal/sheet lifecycle: native focus containment/Escape, initial focus, body scroll lock and focus return. The modal inherits Crystal/Frosted plus dedicated floating depth, with no new motion. Search remains focus-visible, arrow/Home/End keys browse results through a roving tab stop, and Tab reaches Done without traversing the whole vocabulary. Done never requires scrolling through the list.

## Files created

- `components/celestial/CelestialPrimitives.tsx`, `PlannerCelestial.tsx`, `RitualsCelestial.tsx`, `NourishCelestial.tsx`
- `components/planner/PlannerUtilities.tsx`, `PlannerWorkspaceMenu.tsx`
- `components/rituals/RitualWeekNavigator.tsx`
- `components/MuseModal.tsx`, `MuseModal.css`, `useMuseDialog.ts`
- This report.

## Files materially changed

- `components/AppShell.tsx`, `AppShell.css`; `MuseHeader.css`; `ProfileConstellation.tsx`, `ProfileConstellation.css`
- `components/PageCelestial.tsx`, `PageCelestial.css`; `MusePageHeader.tsx`, `MusePageHeader.css`
- `components/planner/Planner.tsx`, `Planner.css`, `PlannerRail.tsx`, `PlannerFilters.tsx`, `PlannerOrganization.tsx`
- `components/rituals/Rituals.tsx`, `Rituals.css`, `RitualGroup.tsx`, `RitualWeekCell.tsx`; `lib/rituals.ts`
- `components/WeekNavigator.tsx`, `WeekNavigator.css`
- `components/MoodCard.tsx`, `EmotionPicker.tsx`, `MuseDrawer.tsx`, `GlassPopover.tsx`
- `components/nourish/Nourish.tsx` (mantra only)
- `app/globals.css`, `app/materials.css` (picker sizing/scrolling and floating depth)
- `tests/daily-edit.test.mjs`, `tests/refinement.test.mjs`, `tests/rituals.test.mjs`
- `docs/PRODUCT_RULES.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURE_SPEC.md`

## Validation / review limits

Lint, TypeScript, all 68 tests and the production build pass. New checks cover full scheduled-day credit, no future/empty-day fake zeroes, partial/complete quantity markup, perfect-day reward semantics, and full vocabulary browsing. Existing task identity/moves/reorder/time totals, recurrence/streaks, shared meals, theme/material contrast and data ownership checks still pass.

Live localhost:3000 checks return 200 and expected markup without Next error templates for Daily Edit, Planner, Rituals, Nourish Plan, Saved Meals and Grocery List. The response includes three logical day columns, the rail/canvas structure, the restored constellation/appearance row, no sidebar connector, and the new Nourish mantra.

CSS constraint estimates with the expanded desktop sidebar are approximately: 1440px viewport → three 291px tracks; 1280px → three 237px tracks; 1200px → two 322px tracks; 390px mobile → one 342px track. These are sizing-rule estimates, not browser measurements.

No in-app browser is connected. Desktop viewport rendering, perceived constellation visibility in six themes, drag/drop gestures, focus/tab behavior, modal scrolling/mobile keyboard interaction and actual performance remain browser-review items; source/HTTP/SSR checks are not visual verification. In particular review Planner at roughly 1440/1280/1200px and mobile with both sidebar states, Ritual completion versus partial and perfect-day changes, category banner clipping, and the picker’s final scroll row/Done footer in Crystal and Frosted. Refresh the preview to load the revised component/layout code.
