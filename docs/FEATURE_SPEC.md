# Muse feature specification

Status vocabulary: **IMPLEMENTED** means working in this local-state prototype, not production/persisted. **APPROVED/PLANNED** is approved direction awaiting implementation. **FUTURE/EXPLORATORY** is an idea to evaluate separately. Domain data resets on refresh; theme and material preferences are stored.

## Global shell and Appearance

IMPLEMENTED: grouped desktop rail, quiet top-edge collapse/expand toggle, expanded-only restrained celestial logo decoration, active MuseStar, mobile Today/Planner/Rituals/More, global six-theme picker/localStorage (Iridescent, Astral, Nightbloom, Solstice, Prism Noir, Afterglow). Every route shares component structure/material. Navigation uses dedicated fixed pages; unfinished destinations share clearly labelled placeholders. The obsolete `[module]` route is removed, so fixed pages do not await runtime URL params and unknown destinations return 404.

APPROVED/PLANNED: Further Appearance controls for magic (Off/Subtle/Enchanted), atmospheric intensity (Subtle/Luminous/Dreamy), accents, layout, reduced motion. Themes, Crystal/Frosted material choice and system reduced motion are functional; the remaining Appearance controls are planned.

## Daily Edit

IMPLEMENTED: first-name mock profile, optional registered profile-driven Virgo constellation (unsupported/missing signs omit it), balanced editorial greeting input architecture, date/week navigation, backdated local editing, personal intention, max three inline priorities, movement, quantity water, meals, Mood, Day Pulse, bounded Plan summary. Mood/Day Pulse share a roughly 60/40 desktop row and stack mobile. Records survive client route/day navigation in memory.

APPROVED/PLANNED: rotating library of approximately 100–200 warm/witty/magical greetings (currently one seeded greeting), authenticated/onboarded profile, reorderable snap-grid cards and reset layout, canonical ritual surfacing. Nourish assignments already share their canonical source with Daily Edit. Profile-driven constellation is decorative; horoscope is not v1.

## Movement

IMPLEMENTED: multi-select, stable type IDs, defaults and custom types, rename/delete custom types, management, bounded quick options (max five), More overflow. Selecting overflow promotes that movement into the same number of shelf slots and evicts a least-recent unselected choice where possible. All selections remain intact; a single-line named summary preserves visibility when more types are selected than fit. Recency and shelf preferences are session-local. Custom types survive route/day navigation only.

APPROVED/PLANNED: explicit preferred/pinned quick types, durable custom-type persistence and week/month/custom-period analytics by movement type.

## Water

IMPLEMENTED: quantities in oz, +12/+24/+32/+40 default quick amounts plus Custom arbitrary adds, editable current total and daily goal, luminous theme progress. Manage changes goal and four distinct positive quick-add amounts; Edit changes the selected day’s total. Goal/quick amounts are shared in session; totals are date-based. Not glasses.

## Mood

IMPLEMENTED: Yale Mood Meter-aligned rich searchable emoji vocabulary; Red high-energy unpleasant, Blue low-energy unpleasant, Green low-energy pleasant, Yellow high-energy pleasant. Stable IDs/quadrant axes retained; clean result labels, multi-select, quadrant filters, large responsive native feeling-picker modal with fixed search/quadrant controls, one scrolling results grid and fixed Done footer; focus containment, Escape and return focus. The full vocabulary is browseable without searching, with arrow-key results navigation and a single results tab stop before Done. Reusable influence tags, max three, overflow through More.

APPROVED/PLANNED: definitions, favorites, history; emotion/weekday/tag and movement/habit relationship analytics without causal claims.

## Day Pulse

IMPLEMENTED: three optional independent Energy/Stress/Overall Day 1–10 signals with dates/timestamps, native-radio luminous segmented controls, endpoint copy, visible numeric values, glint, Reset. No generic slider or aggregate score. Overall Day may remain unanswered. Future Insights comparisons are APPROVED/PLANNED.

## Planner — Phase 1

IMPLEMENTED (local in-memory):
- Canonical task/event source in `PlannerProvider`, mounted above route content in AppShell. Daily Edit and Planner read and dispatch to this same reducer; stable task IDs/completion survive client navigation.
- Secondary 280px planning rail with user-defined workspace switcher, unscheduled pool and quick creation beside a rolling three-day canvas. Selected workspace scopes both; group/tag/status live behind one Filters button and bounded Search and a compact Filters/Today/arrows utility area live in the rail. Workspace choices include counts and New workspace/organization management. Today anchors at today; arrows shift one day without reloading or snapping to weeks. The desktop rail/canvas are two explicit side-by-side tracks, with three flexible day columns, then two when space narrows. Mobile shows one day with Planning Space in a sheet, date/week navigation and Move. The sheet reuses the same source/task creation model; its popovers remain within the native modal boundary.
- Title-first quick creation in rail or day columns. Workspace/group/tag context seeds rail or day creation. Rail tasks have no plannedDate; day tasks receive that date. Both use the same canonical task factory. New workspace and organization management are available from the rail. Group filter is single-choice, tag filters match all selected tags, search matches titles. Detail drawer uses a native modal dialog for focus containment, Escape, inert background, scroll isolation, and focus return.
- Workspaces: create, rename, semantic accent, safe delete only if empty and without groups; at least one remains. Groups are separate workspace collections: create/rename/move/delete (clears references, not tasks). Tags: reusable, multiple per task, create/rename/accent/delete (removes references, not tasks).
- Details: title, workspace/group/tags, planned date, due date, optional time slot, estimated minutes, notes, one-level editable/checkable/deletable subtasks. Completion uses Muse Spark.
- Move/date picker and return to Inbox change plannedDate without changing due/completion or duplicating records. Native desktop drag from rail/between days is retained; dropping above a task reorders, dropping on a day background appends. Move earlier/later controls supply keyboard reordering. Canonical local task-array order is shared with Daily Edit; durable position storage is planned.
- One running task timer across routes; start/pause in details, accumulate fractional actual minutes independently of estimate, pause previous timer on switch, and stop on task completion/deletion. Actual readout refreshes while details are open. Timer/domain records reset on refresh and are not durable logs.
- Daily Edit preview: configurable three events/five tasks, counts include all records, overflow routes to `/planner?date=…`; events also use `#planner-events`. Direct Planner links synchronize selected date. Schedule stays distinct from Tasks.

Task contract: id, kind, title, workspaceId, optional groupId, tagIds[], optional plannedDate/dueDate/timeSlot/notes/estimatedMinutes, actualMinutes, **complete** (preserved existing boolean field), subtasks[], optional recurrence metadata, createdAt. Events keep their own date/dateTime model and collection. Task IDs `flowers` and `read` were retained during migration from the former Daily Edit sample.

APPROVED/PLANNED: actual recurrence generation and recurrence UX (only optional frequency/interval/until metadata exists), full calendar integration, durable database records/history, richer time reporting and planning/actual analytics. Drag/drop is implemented using the browser's native desktop API, not an external framework; touch Move is primary. Browser interaction/visual QA is still required before release.

Foundation choices within approved scope: use existing `complete` field rather than renaming identity-bearing records; semantic palette roles for workspace/tag colors rather than unrestricted literal hex; reject occupied workspace deletion instead of destructive cascade; one timer at a time; rolling three-day planning with Today and one-day previous/next/date/week controls; preserve separate lightweight event collection. No persistent task store was added.

Before Supabase: introduce user ownership and RLS, schema migrations/foreign keys and date/time-zone rules; enforce boundary validation independent of UI; replace in-memory reducer commands with a repository/server layer and explicit loading/error/optimistic conflict handling; store auditable time sessions (browser wall-clock timestamps are prototype-only); define recurrence instance identity and completion history before generating repeats. Revisit the experimental Next/Turbopack CSS-module mapping issue before adopting CSS modules. Complete browser keyboard/touch/drag/contrast QA. None of these are represented as implemented backend features.

## Rituals

IMPLEMENTED (sample/local session):
- Real /rituals route using the established shell, six themes and both glass materials, shared celestial MusePageHeader/date/week controls and line icons. Eyebrow “A RHYTHM OF YOUR OWN”; support “Small things, returned to.”
- Monday-first week, previous/next week and direct date selection; actual-today indication. Desktop aligned seven-day group rows. Mobile stacked groups with one focused-day control selected through the week strip.
- User-created groups: create/rename/accent/icon, theme-relative gradient banner presets clipped to the rounded group boundary, compact collapse/expand, safe empty-group deletion (keep at least one). Starter names are sample data only.
- Add/edit named rituals with group, checkbox/quantity/duration/weekly-target type, goal/unit, daily/once-weekly/specific-weekday recurrence and start date. Title/group remain editable with history; schedule/type/goal/start are locked after the first log until effective-dated changes exist.
- All scheduled cells open an entry sheet: checkbox Complete/Missed/Clear; numeric/duration progress, explicit Missed and Clear; weekly quantities/no-session/Clear. Past days remain editable and future logging is disabled. Saving zero is explicit not done and records an outcome marker; clearing removes the log. Partial numeric/duration values use the reusable group-colored ring. Complete quantities/durations preserve their actual value in a filled control with an attached check; complete checkboxes use a filled check. Completed quantities do not render a ring. Unknown/open states use a neutral empty indicator; history semantics remain unchanged. Stable ritual/entry IDs are retained. Unscheduled days cannot receive logs and do not count against adherence/streaks.
- Recurrence-aware observed streaks: daily-type rituals count successive scheduled opportunities, weekly targets count qualifying weeks. An unlogged/partial today and current unfinished week remain open; an explicitly missed current daily goal closes its confirmed full-completion streak. Weekly-target eligible days are optional opportunities, not independent daily failures.
- Restrained real-record summaries: Complete, Partial, explicit Missed and Unknown counts remain separate; weekly goals met, group counts and per-ritual observed streak remain distinct. No generated insights, combined score or full analytics.
- Week-strip thin daily-completion lines count full scheduled daily goals only; accessible percentages and a perfect-day MuseStar. Future/no-daily-goal days have no zero-percent bar. Partial retains its own meaning, with no newly invented fractional adherence model. Weekly targets stay separate and do not become daily obligations. A new perfect day gets a small Spark; initial sample-history loading does not celebrate.
- Orbital Glint on ordinary completion; contained four-node Constellation Celebration at 3/7/14/30/60/100/365 scheduled-opportunity milestones or 4/8/12/26/52 weekly milestones. Only threshold crossings trigger, session milestone keys prevent replay after undo. Reduced-motion static glow.
- Records/definitions/groups/collapse and milestone keys survive client route/week navigation via the existing in-memory session store. They reset on refresh. Ritual logs are separate from Planner tasks and Daily Edit water/movement records.

APPROVED/PLANNED: durable records and completion history, effective-dated schedule/goal changes, richer recurrence/weekly-target configuration, all/group/individual analytics, completion rate, weekday patterns, monthly calendars, yearly GitHub-style heatmaps, week/month/custom ranges. Daily Edit ritual surfacing is planned, not implemented. No full Ritual analytics or Supabase added.

Implementation decisions: weekly target quantities use whole counts per eligible date; duration uses minutes; arbitrary numeric quantities allow decimals. Complete/Partial/Missed/Unknown/Not Scheduled/Upcoming are distinct durable analytical states. Positive values below a daily goal are Partial; target-met values are Complete. Missing past entries are Unknown and are never converted into Missed by elapsed time. Weekly positive session logs are not daily completions; only the weekly aggregate determines weekly success. Completion feedback waits for daily/weekly goal completion, not partial quantity increases. New local schedules protect existing history by locking measurement/recurrence after logging. Long-term history-safe changes require schedule versions before persistence.

## Nourish

IMPLEMENTED (local in-memory):
- Real `/nourish` route, shared Muse shell/header, six themes, Crystal/Frosted, restrained garden header motif, Monday–Sunday week navigation, This week/direct date selection and actual-today indication. Desktop aligns date rows and four meal slots; mobile focuses the selected day with stacked slots.
- Canonical `NourishProvider` above route content owns dated `DailyMealAssignment` records and a separate saved-meal library plus manual grocery items/shopping sections. Daily Edit Meals and Nourish read/write this same reducer. Existing meal IDs are retained. Multiple entries per slot, including Snacks, are supported; Daily Edit shows a bounded two-entry preview per slot with accurate overflow links.
- Quick free-text meal, optional note, edit/remove, saved/recent choices, optional save-to-library. Saved meals support name, multiple meal types, note, safe HTTP(S) link and optional nutrition defaults. A dedicated Saved Meals view offers All/Breakfast/Lunch/Dinner/Snacks filters, search and add/edit/remove sheets. Saving from a day exposes multi-type selection seeded with the current slot. Add-meal drawers default to relevant saved meals with an All option. Recent Meals remains separate and includes recent saved and unsaved occurrences. No ingredients or instructions editor.
- Desktop drag between dates/slots uses shared Drop Glow/Spark. Move and Copy sheets provide accessible alternatives. Move preserves assignment ID; copy creates fresh IDs for every selected date, including a weekday preset. Assigned title/note/nutrition snapshots survive saved-meal rename/removal; deleted library references are detached without losing the plan.
- Manage on Daily Edit Meals routes to the selected date in Nourish; inline edits immediately update the same assignment records. Both surfaces retain date-based selection and session state across client navigation.
- Plan / Saved Meals / Grocery List is first-class Nourish navigation, with Plan as default; view/date links retain the same shared provider and mobile layout. Grocery List supports manual add/edit/name/optional quantity/note/section, complete/uncomplete/remove and clear completed. Stable section IDs and nine starter sections leave room for future customization. Completion is a touch-friendly Muse control with a small Spark; checked items remain visible. No inference or automatic ingredient generation.
- Optional calories/protein/carbs/fat on saved templates and planned occurrences, finite nonnegative decimals, independent blank fields and explicit zero. Selecting saved/recent meals copies values; saving occurrence changes does not update template defaults. Move/copy retain those occurrence values. Daily totals disclose meal/per-field coverage; unknown fields use a dash, no-data days omit the summary. Daily Edit uses a compact shared known-total summary. Sample nutrition values are explicitly illustrative seed data, not estimated from names.

APPROVED/PLANNED: durable user-owned assignments/library, history-safe conflict handling, richer daily/monthly planning views. APPROVED/PLANNED: optional Saved Meal → Grocery List item connection and custom grocery-section management. FUTURE/EXPLORATORY: recipe/food ideas, pantry, recurring meals, automation, nutrition targets/analytics and external services. No backend, food database or recipe manager is implemented.

## Money

APPROVED/PLANNED, not implemented: manual initially; paycheck templates/allocation/planned versus actual; card nickname/balance/limit/utilization/APR/due date/minimum/planned/paid; transactions merchant/amount/date/custom category/subcategory/tags/payment method/splits. Avoid credit-card-payment double counting; never store account numbers.

## Notes

APPROVED/PLANNED, not implemented: Bear-inspired tags, nested/multi-classification, search, pins, checklists, task/money links. Not a recipe manager.

## Insights

APPROVED/PLANNED, not implemented: deterministic, statistically honest week/month/custom-range insight across movement, habits, Mood, Pulse, spending and planning. Separate missing data and subjective dimensions; never imply causation from correlation.

## Future / exploratory

Not v1: Aspirations/goals; Muse Circle; selective sharing between independent private accounts; Google Calendar read-only integration; Apple Health only with suitable native companion architecture; broader optional zodiac/constellation profile personalization.

Optional Daily Edit horoscope may include zodiac identity and a small card/expandable daily snippet, with entertainment/lifestyle framing, optional visibility, and theme-aware celestial presentation. Evaluate an appropriate API/provider separately when intentionally building it. No astrology API is implemented; horoscope must not become mandatory clutter.

## Architecture and environments

IMPLEMENTED: Next.js/React/TypeScript, Tailwind pipeline plus shared CSS semantic design system, React local stores, theme/material preference localStorage. APPROVED/PLANNED: Supabase PostgreSQL/Auth/RLS, Vercel production deployment/PWA, private GitHub repository, independent private accounts. Same repository/codebase; isolated preview/staging test data and production real data via separate variables/databases. No Supabase/auth/integration is introduced by this phase.

## Planner / Rituals refinement verification and follow-up

Afterglow is IMPLEMENTED as the sixth theme: graphite/charcoal with luminous mint/aqua, lilac/periwinkle and restrained peach/pink accents. Every theme provides the same full semantic contract, including three-level planning materials. Prism Noir atmosphere/global glass is retained. Theme and material preferences use localStorage; domain records remain in memory.

Current automated checks cover task identity/due/completion across placement/reorder and shared Daily Edit, all six token contracts and planning-text contrast/material separation, recurrence-aware day/week streaks, future/unscheduled logging rejection, retroactive edits, missing/zero, weekly aggregation, safe group changes, milestone replay, and reduced-motion structure. Browser visual/gesture/focus/touch review is still required; structural checks are not visual approval.

Before persistence: add user scoping/RLS, canonical order positions, dated recurrence/goal versions, database constraints/unique ritual-date keys, time-zone and week boundaries, optimistic write conflicts, historical log corrections and durable milestone eligibility. Full analytics and later major modules are outside this pass.

## Visual and state refinement — current implementation

IMPLEMENTED: Crystal/Frosted optical switch in the existing theme menu; stronger Crystal fill/edge presence and more opaque/diffused Frosted across shared surfaces. Six complete theme contracts include material variants, haze distribution and quiet constellation inks. Afterglow is corrected toward near-black neutral graphite with vivid mint/cyan/lilac/pink/peach LED light; Prism Noir's baseline atmosphere palette/distribution is preserved.

IMPLEMENTED: personalized Daily Edit constellation moved into open central header atmosphere, signature stars placed immediately left of the Theme Picker in a shared horizontal row above date/week controls, responsive hide/reflow; shared orbit/path/garden celestial module headers; gentle theme-aware haze/drift/shimmer and sparse header flecks; common timing/easing tokens and drop feedback. Reduced motion retains static state/color.

APPROVED/PLANNED: full Appearance page and user-configurable magic/atmospheric intensity/reduced-motion preference, arbitrary custom group gradients and pinning preferences, durable domain data/history. Horoscope content/API remains FUTURE/EXPLORATORY. Visual browser approval is separate from structural/SSR and numeric contrast verification.

## Daily Edit header and source actions — current implementation

IMPLEMENTED: corrected horizontal desktop composition: greeting left, enlarged visible profile constellation in central negative space, signature stars immediately left of Theme Picker, temporal controls below. Decorations hide/reflow before functional controls crowd; no extra hero-height requirement. Theme control is part of the hero on Daily Edit and remains in the shared global bar elsewhere.

IMPLEMENTED: reusable `CardHeading` Manage and informational `ModuleBadge`. Today's Plan uses Planner + Manage and no redundant header item count; Meals uses Nourish + Manage. Both links carry selectedDate. Movement keeps Manage only; Water separates preference management from editing the daily record. Mood and Day Pulse retain their established interaction without invented badges/actions.

The route and domain checks are automated/HTTP verified; desktop/mobile visual interaction review remains pending without a connected browser. Dedicated future-module pages do not represent implementation of Mood, Insights, Money, Notes, Appearance or Settings modules.

## Vivid color / Crystal / Nourish organization correction

IMPLEMENTED: distinct vivid action/navigation/focus/success/progress/star accents in all six themes, stronger active navigation edges/icons, module badge edges, blue/cyan Astral hero illumination, localized fuchsia Prism Noir hero light without replacing its established pools, and almost-black neutral Afterglow with electric aqua/mint/lilac/pink/peach accents. Nightbloom now explicitly balances peacock/teal left, wine/raspberry upper-right, subtle central berry and emerald lower-right; warm color participates in functional accents too. Light secondary text is strengthened for the richer atmosphere.

IMPLEMENTED: shared Crystal material layers now survive component background shorthands. Specular top/side light, faint internal theme reflections, inset edges and saturation/blur distinguish polished Crystal from the denser, diffused Frosted choice without reducing material opacity or changing layout. Nested entries receive painted reflection rather than another blur. No new material animation or backend is introduced.

Automated/domain/SSR checks and local route checks do not substitute for browser visual review. With no connected browser, six-theme/two-material desktop/mobile color balance and actual scrolling/filter performance remain review items.

## Header, Planner and Ritual/Mood refinement

IMPLEMENTED: sidebar's decorative connector removed; only tiny independent stars remain near the clean logo. Daily Edit explicitly keeps stars and Theme Picker on one horizontal row, date/week below, and a clearer profile-driven constellation in central desktop atmosphere. No palette, global navigation or Daily Edit card redesign.

IMPLEMENTED: shared celestial primitives composed as distinct broad module artwork: Planner pathways/map, Rituals intersecting orbits/return, Nourish cosmic botanical. Themes/reduced motion are inherited; illustrations reduce/hide when space is constrained. Functional hierarchy and date behavior are preserved. Nourish mantra updated to NOURISH WHAT CARRIES YOU; Planner/Rituals copy unchanged. Future module signatures/mantras are durable design direction, not additional implemented modules.

IMPLEMENTED: common native-dialog lifecycle for drawers and a large Mood picker; persistent controls/Done with one scrolling results region. Large desktop/touch-friendly mobile sizing and explicit selected states preserve emotion vocabulary/IDs/quadrants/multi-select. Browser visual/interaction checks remain necessary when a connected preview is available.
