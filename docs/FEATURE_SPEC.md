# Muse feature specification

Status vocabulary: **IMPLEMENTED** means working in this local-state prototype, not production/persisted. **APPROVED/PLANNED** is approved direction awaiting implementation. **FUTURE/EXPLORATORY** is an idea to evaluate separately. Domain data resets on refresh; theme, material and optional Cosmic Forecast preferences are stored when browser storage is available.

## Global shell and Appearance

IMPLEMENTED: grouped desktop rail, quiet top-edge collapse/expand toggle, expanded-only restrained celestial logo decoration, active MuseStar, mobile Today/Planner/Rituals/More, global nine-entry theme picker/localStorage (Glitter!, Midnight Ballerina!, Pretty Toxic!, Sunburnt & Sinful!, Curses!, Neon Hangover!, ISSYA BDAY!, ISSYA BDAY XXX!, Disco Damage XXXTRA!) in the sidebar near Appearance/Settings, compact when collapsed; mobile reaches the same choices through Appearance in More. Every route shares component structure/material. Navigation uses dedicated fixed pages; unfinished destinations share clearly labelled placeholders. The obsolete `[module]` route is removed, so fixed pages do not await runtime URL params and unknown destinations return 404.

IMPLEMENTED: Quiet/Magical/Extra Muse Magic is a browser-local preference with OS reduced-motion priority. APPROVED/PLANNED: further atmospheric intensity, accent/layout and in-app reduced-motion settings; these are separate from the existing functional themes/material/Magic controls.

## Daily Edit

IMPLEMENTED: first-name mock profile, abstract personal-sky atmosphere (literal profile constellation retired from the active hero), balanced editorial greeting input architecture, separate profile-local daily supporting mantra from the shared module library, date/week navigation, backdated local editing, personal intention, max three inline priorities, movement, quantity water, meals, Mood, Day Pulse, bounded Plan summary. Mood/Day Pulse share a roughly 60/40 desktop row and stack mobile. Records survive client route/day navigation in memory.

APPROVED/PLANNED: rotating library of approximately 100–200 warm/witty/magical greetings (currently one seeded greeting), authenticated/onboarded profile, reorderable snap-grid cards and reset layout, canonical ritual surfacing. Nourish assignments already share their canonical source with Daily Edit. Profile constellation utilities remain dormant. Optional Cosmic Forecast now has a compact card/manual settings and explicitly unavailable preview; broader personalization remains exploratory.

## Movement

IMPLEMENTED: multi-select, stable type IDs, defaults and custom types, rename/delete custom types, management, bounded quick options (max five), More overflow. Selecting overflow promotes that movement into the same number of shelf slots and evicts a least-recent unselected choice where possible. All selections remain intact; a single-line named summary preserves visibility when more types are selected than fit. Recency and shelf preferences are session-local. Custom types survive route/day navigation only.

APPROVED/PLANNED: explicit preferred/pinned quick types, durable custom-type persistence and week/month/custom-period analytics by movement type.

## Water

IMPLEMENTED: quantities in oz, +12/+24/+32/+40 default quick amounts plus Custom arbitrary adds, editable current total and daily goal, luminous theme progress. Manage changes goal and four distinct positive quick-add amounts; Edit changes the selected day’s total. Goal/quick amounts are shared in session; totals are date-based. Not glasses. A reusable cross-theme golden AchievementStar appears at/above a positive target; actual amounts remain unclamped, bar caps at 100%, and first transition may glint without replaying initial history.

## Mood — The Emotional Observatory

IMPLEMENTED (session-local): dedicated Mood page with the fixed “FEEL IT. NAME IT. TRACK IT.” mantra beneath its title, without an eyebrow or extra subtitle. One date/period record shared by Daily Edit and Mood contains multiple feelings, up to three influences, independent optional Pulse values, reflection and update time. Morning/evening are optional, records are upserted by date/period, past dates editable; entirely empty records return to missing. No fabricated seed check-ins.

IMPLEMENTED: the same searchable 80-emotion vocabulary, stable IDs and Yale Mood Meter family metadata; individual chips/removal, Favorites filter and functional favorite actions, available definition notes, All/quadrant browsing, one scrollable results region and fixed Done. Favorites and custom influences survive client route/day navigation, not refresh. Searchable influences allow custom creation, selection/removal and a hard three-selection cap without causal wording.

IMPLEMENTED: optional reflection with one rotatable prompt, explicit draft/Save/Discard and shared-session committed records and accurate Updated in this session copy; small Muse Spark for selected feelings/reflection interaction. Recent/week/all history, previous/next history week, open/edit/backdate and confirmed deletion. Secondary family visualization shows selected emotions without inventing precise coordinates. Factual frequency/family counts and mean Overall Day use logged values only, disclose sample size and keep missing values out. Cross-module trends/comparisons now belong to Insights; these local Mood summaries do not imply backend persistence.

## Day Pulse

IMPLEMENTED: three optional independent Energy/Stress/Overall Day 1–10 signals in the SAME date/period Mood record. Existing native-radio luminous ten-step controls, endpoints, visible numeric values, glint, individual Clear and whole-card Reset. Higher stress is not positive success. No generic slider, aggregate score or automatic inference. Insights now provides descriptive comparisons over available local records; durable private history remains APPROVED/PLANNED.

## Planner — Phase 1

IMPLEMENTED (local in-memory):
- Canonical task/event source in `PlannerProvider`, mounted above route content in AppShell. Daily Edit and Planner read and dispatch to this same reducer; stable task IDs/completion survive client navigation.
- Secondary 280px planning rail with user-defined workspace switcher, unscheduled pool and quick creation beside a rolling three-day canvas. Selected workspace scopes both; group/tag/status live behind one Filters button. Bounded Search and the compact Filters/Today/arrows utility area live in a secondary toolbar below the shared header. The source rail is labelled Task List. Workspace popover choices include markers/selection and separated New workspace/organization management. The persistent rail contains only Task List, workspace switcher, internally scrolling source tasks and bottom-anchored quick creation: no Unscheduled/count/helper/New workspace rows. Today anchors at today; arrows shift one day without reloading or snapping to weeks. The desktop rail/canvas are two explicit side-by-side tracks, with three flexible day columns, then two when space narrows. Mobile shows one day with Task List in a sheet, date/week navigation and Move. The sheet reuses the same source/task creation model; its popovers remain within the native modal boundary.
- Title-first quick creation in rail or day columns. Workspace/group/tag context seeds rail or day creation. Rail tasks have no plannedDate; day tasks receive that date. Both use the same canonical task factory. New workspace and organization management are available from the rail. Group filter is single-choice, tag filters match all selected tags, search matches titles. Detail drawer uses a native modal dialog for focus containment, Escape, inert background, scroll isolation, and focus return.
- Workspaces: create, rename, semantic accent, safe delete only if empty and without groups; at least one remains. Groups are separate workspace collections: create/rename/move/delete (clears references, not tasks). Tags: reusable, multiple per task, create/rename/accent/delete (removes references, not tasks).
- Details: title, workspace/group/tags, planned date, due date, optional time slot, estimated minutes, notes, one-level editable/checkable/deletable subtasks. Completion uses Muse Spark.
- Move/date picker and return to Inbox change plannedDate without changing due/completion or duplicating records. Native desktop drag from rail/between days is retained; dropping above a task reorders, dropping on a day background appends. Move earlier/later controls supply keyboard reordering. Canonical local task-array order is shared with Daily Edit; durable position storage is planned.
- One running task timer across routes; compact elapsed control opens an inline Start/Pause/Resume/Stop panel on demand, with start/pause also in Details; accumulate fractional actual minutes independently of estimate, pause previous timer on switch, and stop on task completion/deletion. Running elapsed readouts refresh while mounted, without a second timer system. Timer/domain records reset on refresh and are not durable logs.
- Daily Edit preview: configurable three events/five tasks, counts include all records, overflow routes to `/planner?date=…`; events also use `#planner-events`. Direct Planner links synchronize selected date. Schedule stays distinct from Tasks.

Task contract: id, kind, title, workspaceId, optional groupId, tagIds[], optional plannedDate/dueDate/timeSlot/notes/estimatedMinutes, actualMinutes, **complete** (preserved existing boolean field), subtasks[], optional recurrence metadata, createdAt. Events keep their own date/dateTime model and collection. Task IDs `flowers` and `read` were retained during migration from the former Daily Edit sample.

APPROVED/PLANNED: actual recurrence generation and recurrence UX (only optional frequency/interval/until metadata exists), full calendar integration, durable database records/history, richer time reporting and planning/actual analytics. Drag/drop is implemented using the browser's native desktop API, not an external framework; touch Move is primary. Browser interaction/visual QA is still required before release.

Foundation choices within approved scope: use existing `complete` field rather than renaming identity-bearing records; semantic palette roles for workspace/tag colors rather than unrestricted literal hex; reject occupied workspace deletion instead of destructive cascade; one timer at a time; rolling three-day planning with Today and one-day previous/next/date/week controls; preserve separate lightweight event collection. No persistent task store was added.

Before Supabase: introduce user ownership and RLS, schema migrations/foreign keys and date/time-zone rules; enforce boundary validation independent of UI; replace in-memory reducer commands with a repository/server layer and explicit loading/error/optimistic conflict handling; store auditable time sessions (browser wall-clock timestamps are prototype-only); define recurrence instance identity and completion history before generating repeats. Revisit the experimental Next/Turbopack CSS-module mapping issue before adopting CSS modules. Complete browser keyboard/touch/drag/contrast QA. None of these are represented as implemented backend features.

## Rituals

IMPLEMENTED (sample/local session):
- Real /rituals route using the established shell, nine themes and both glass materials, shared celestial MusePageHeader/date/week controls and line icons. Fixed page mantra “ON REPEAT, BY DESIGN” beneath the title; no introductory eyebrow.
- Monday-first week, previous/next week and direct date selection; actual-today indication. Desktop aligned seven-day group rows. Mobile stacked groups with one focused-day control selected through the week strip.
- User-created groups: create/rename/accent/icon, theme-relative gradient banner presets clipped to the rounded group boundary, compact collapse/expand, safe empty-group deletion (keep at least one). Starter names are sample data only.
- Add/edit named rituals with group, checkbox/quantity/duration/weekly-target type, goal/unit, daily/once-weekly/specific-weekday recurrence and start date. Title/group remain editable with history; schedule/type/goal/start are locked after the first log until effective-dated changes exist.
- All scheduled cells open an entry sheet: checkbox Complete/Missed/Clear; numeric/duration progress, explicit Missed and Clear; weekly quantities/no-session/Clear. Past days remain editable and future logging is disabled. Saving zero is explicit not done and records an outcome marker; clearing removes the log. Partial numeric/duration values use the reusable group-colored ring. Complete quantities/durations use a centered achieved value in a luminous theme-gradient orb plus a small neutral/white-check badge; complete checkboxes use the same orb with a centered white check. Completed quantities do not render a ring. Unknown/open states use a neutral empty indicator; history semantics remain unchanged. Stable ritual/entry IDs are retained. Unscheduled days cannot receive logs and do not count against adherence/streaks.
- Recurrence-aware observed streaks: daily-type rituals count successive scheduled opportunities, weekly targets count qualifying weeks. An unlogged/partial today and current unfinished week remain open; an explicitly missed current daily goal closes its confirmed full-completion streak. Weekly-target eligible days are optional opportunities, not independent daily failures.
- Restrained real-record summaries: Complete, Partial, explicit Missed and Unknown counts remain separate; weekly goals met, group counts and per-ritual observed streak remain distinct. No generated insights, combined score or full analytics.
- Week-strip thin rings surrounding date numbers count full scheduled daily goals only; accessible percentages and a perfect-day golden AchievementStar. Future/no-daily-goal days have no false zero-percent ring. Partial retains its own meaning, with no newly invented fractional adherence model. Weekly targets stay separate and do not become daily obligations. A first new perfect day gets a restrained earned glint; initial sample-history loading does not celebrate.
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
- Plan / Saved Meals / Grocery List is first-class Nourish navigation, with Plan as default; view/date links retain the same shared provider and mobile layout. Grocery List supports manual add/edit/name/optional quantity/note/section, complete/uncomplete/remove and clear completed. Stable section IDs and thirteen starter sections (including Unsorted) leave room for future customization. Scoped inline name capture and a global aligned name/optional quantity/category/Add row preserve category across adds; notes stay in the item editor; sections are collapsible and responsive. Completion is a touch-friendly Muse control with a small Spark; checked items remain visible. No inference or automatic ingredient generation.
- Optional calories/protein/carbs/fat on saved templates and planned occurrences, finite nonnegative decimals, independent blank fields and explicit zero. Selecting saved/recent meals copies values; saving occurrence changes does not update template defaults. Move/copy retain those occurrence values. Daily totals disclose meal/per-field coverage; unknown fields use a dash, no-data days omit the summary. Daily Edit uses a compact shared known-total summary. Sample nutrition values are explicitly illustrative seed data, not estimated from names.

APPROVED/PLANNED: durable user-owned assignments/library, history-safe conflict handling, richer daily/monthly planning views. APPROVED/PLANNED: optional Saved Meal → Grocery List item connection and custom grocery-section management. FUTURE/EXPLORATORY: recipe/food ideas, pantry, recurring meals, automation, nutrition targets and external services. Descriptive planned-nutrition summaries now exist in Insights with explicit coverage. No backend, food database or recipe manager is implemented.

## Money

IMPLEMENTED (local Supabase persistence; see [MONEY_PERSISTENCE](MONEY_PERSISTENCE.md)):
- Real `/money` route; six compact Overview/Paychecks/Spending/Recurring/Cards/Categories sections, one root MoneyProvider/reducer, shared Muse header/section navigation, nine themes and Crystal/Frosted surfaces. Header uses the fixed “REASONS WHY I'M NOT A MILLIONAIRE” mantra and the established environmental refraction signature.
- Overview: selected/current paycheck, expected-versus-received distinction, vivid grouped allocation ribbon/remaining and overallocated state, compact upcoming bills/card payment reminders, recorded spending, recent transactions, category bars and plan/actual bars. Positive fully allocated plans receive the golden AchievementStar; transition feedback does not replay seed history.
- Paychecks: create/edit name, received/expected date, optional expected/actual amounts, custom start/end crossing months, note; reusable templates; independent allocation copies; deliberate Save changes to template. User-defined allocation groups; compact allocation editor with planned/manual actual, category/subcategory, due date, optional bill/card link and note. Linked transactions/payments supply actuals when no manual amount exists; missing actual remains a dash.
- Reporting: paycheck period/calendar month/custom start-end affects spending lists/totals/category charts. Plan/actual explicitly identifies selected-paycheck plan versus selected-period recorded expenses; card balances never change when switching reporting periods.
- Spending: dense searchable/date-filtered ledger, one Filters popover (category/tag/card), create/edit merchant/amount/date/category/subcategory/multiple tags/payment method/card/note/optional allocation. Splits preserve transaction total; visible underassigned remainder goes to Unassigned and overassignment is rejected.
- Cards: create/edit nickname/explicit dated opening balance/optional limit/APR/due/minimum/planned payment/note; utilization only when a positive limit is known. Separate payment records with card/date/amount/optional paycheck/allocation/note and payment-history undo. Balances derive from the opening basis plus purchases minus payments on/after that local date; earlier transactions remain history. Card payments never enter spending totals. No bank balance, credentials or account numbers.
- Bills integrate into Overview and Paychecks with name/amount/date/recurrence/category/card/paid/note and allocation-side bill links. Paid/unpaid is obligation state, not an automatically generated expense. Upcoming includes recorded dated obligations and a count before the next known paycheck.
- Categories/subcategories: create/rename/theme-relative color/optional icon/add and rename subcategories/archive and restore categories. Tags: create/rename/archive/restore, independent of categories. Allocation groups: create/rename/color. Archival preserves historical IDs.
- Muse drawers/choice popovers, responsive panels/ledger, local Spark feedback and system reduced motion. Numeric records use validated integer cents; blank optional fields remain unknown, explicit zero is retained. No bank connection or domain localStorage.

IMPLEMENTED: user-scoped normalized records/RLS, atomic revision-checked saves, idempotent retries, explicit dated-opening card reconciliation, retained conflict/error drafts, stable deletes, persisted manually entered bills and independent recurring definition snapshots. APPROVED/PLANNED: automatic durable bill occurrence materialization and matching expected recurring charges to actual transactions, richer filtering/reporting and durable Insights history. Recurring expected dates now advance from calendar anchors without creating actual charges; older dated bill recurrence metadata still does not generate bill occurrences. No bank import, financial forecasts, investment/net-worth system or financial advice. Insights reads the same recorded Money data without adding financial events. Currency handling beyond the initial USD scope needs an explicit future design.

## Notes — tag-first writing workspace

IMPLEMENTED (now Supabase-backed locally; see NOTES_PASS_A): dedicated Notes route, official three-star signature and fixed “GET IT OUT OF YOUR HEAD” page mantra; no introductory eyebrow or extra subtitle. Desktop tags → compact independently scrolling note list → largest writing editor. Tags collapse to two panes; Focus leaves the editor only. Pane preferences use the existing browser-storage convention; selected note/search/view remain session UI state; drafts survive client navigation in the authenticated Notes owner. At narrow widths, Tags → List → Editor progressively navigates with visible return controls. No folder dashboard or duplicate module.

IMPLEMENTED: stable Note/Tag/NoteTagLink/editor-document models; multi-tag membership, normalized case-insensitive paths, explicit ancestor tags, parent filtering including descendants without duplicate notes, expansion/collapse, tag pins and optional existing Muse line icons. Create/rename/move a tag branch preserves IDs; deleting a confirmed branch removes relationships but keeps all notes. The editor supports searchable tag assignment/removal and create-and-assign. Inline hashtag parsing is FUTURE/EXPLORATORY; typed hashtags remain untouched text.

IMPLEMENTED: one-action blank/untitled creation, current-tag inheritance (Pinned context creates a pinned note), display title derived from the first body line when explicit title is blank. Title/body/tag search within view or All, optional explicit Archive inclusion, last-edited/created/title sort, pinned-first rows, small match highlights and roving keyboard list navigation. Archive/Trash are system states, not tags; restore respects the source status, Trash soft-deletes, permanent delete requires confirmation. Duplicate copies current draft/document/tags into a new identity and opens the copy.

IMPLEMENTED: official Tiptap 3 editor/StarterKit/TaskList/TaskItem, structured ProseMirror JSON, headings 1–3, bold/italic/underline/strike, bullet/number/check lists, blockquote, safe links, horizontal rule, paste and native editor undo/redo. A compact toolbar reveals the link editor on demand. Paragraphs use a calm opaque theme canvas, without decorative particles behind writing. Tiptap's DOM/selection/per-instance IDs initialize behind a client-only Next dynamic boundary; the Notes header/list/tag rail still prerender. No hand-built contenteditable/HTML-string editor.

IMPLEMENTED: drafts enter the user-scoped Notes owner immediately; 500ms content saves use revision-checked atomic library commands and stable retry receipts. Switching notes, hiding panes, route navigation, metadata changes and delayed commits cannot redirect an older draft into the selected note. Status now distinguishes loading, pending, confirmed saved and failed/conflicting drafts; confirmed domain records survive refresh/restart. Keyboard: scoped Command/Control N (new), Shift F (search), Shift backslash (tag rail), Shift Enter (focus), Alt P (pin), Alt A (archive/restore); standard editor formatting/undo shortcuts remain native to Tiptap.

IMPLEMENTED LOCALLY: user-owned Supabase/RLS persistence and revision/idempotency-protected save/conflict recovery; see [NOTES_PASS_A](NOTES_PASS_A.md). Durable version-history UI remains planned. FUTURE/EXPLORATORY: inline hashtag association, task/Money links and advanced writing features. Authenticated libraries start empty; fictional starter notes remain isolated test fixtures. The existing editor and reducer are preserved, with confirmed Supabase save feedback and no fake integrations.

## Insights

IMPLEMENTED (explicit fictional/session-local prototype): dedicated `/insights` with Overview, Plans & Rituals, Mood & Energy, Money and Nourish; compact two-line header/three-star identity and the existing profile-local daily Insights supporting collection, without an introductory eyebrow. Global 7/30/90 days, year-to-selected-date and custom inclusive ranges (bounded to two years), with immediately preceding equal-length comparisons. This is not a year-over-year claim. Known zero and unavailable baseline are distinct; no divide-by-zero percentage.

IMPLEMENTED: pure normalization → metrics → deterministic Little Revelations, read through existing canonical providers and shared session records. Stable-ID deduplication, latest date/period check-ins and ritual/day entries, numeric/date validation and visible quality notice. Profile timezone converts actual timestamps; calendar logs remain local dates. Memoized analysis is independent of chart hover/dialog/view state. Empty inputs never receive sample fallback history. The persistent source notice identifies the existing fictional starter data plus session edits and refresh limitations.

IMPLEMENTED: editorial Your Life, Lately, separate-series Your Rhythm, ranked Little Revelations with date/sample/basis/owner link, and A Little Perspective. Revelations are computed, deterministic and traceable through underlying record IDs; insufficient evidence produces warm, honest empty states.

IMPLEMENTED metrics:
- Planner: current completed / tasks whose plannedDate is in range; created counts, timestamped completion trend and weekday pattern; workspace/group breakdown; cumulative saved actual versus estimated minutes for tasks planned in range. Unscheduled tasks are not missed. New completion actions capture completedAt; unchecking clears it and rescheduling preserves it. Legacy completed records without timestamps are disclosed, never assigned guessed completion dates. No per-day time-session history is invented.
- Rituals: elapsed scheduled daily opportunities by date/group/individual; Complete, Partial, explicit Missed and Unknown/Open counts, future and unscheduled excluded. Recurrence-aware confirmed streaks use the existing domain calculation as of selected end/today, whichever is earlier, and can begin before range start. Weekly targets use whole Monday–Sunday totals, explicitly label partial range overlap, and do not become daily obligations. Different units are not pooled.
- Mood: independent optional Overall Day/Energy/Stress means and trends, check-in/day counts, emotion selection frequency, Mood Meter family distribution and influence frequency. Weekday means require three distinct rated dates. Date inspection preserves morning/evening, multiple feelings and independent signals.
- Descriptive relationships: paired Energy/full daily ritual goals and Stress/current planned task load require ten dates and variance in both inputs. Energy on movement-intention dates versus explicitly stored no-selection dates requires five dates in each group. Missing movement is not no movement. Sample counts, absent-data reasons and noncausal caveats remain visible; no clinical claim or sleep integration.
- Money: recorded transaction spending trend/category splits and stable-category drilldown; actual recorded paycheck income; current plan/known actual allocation snapshots for paychecks received in range; explicit user-selected savings group; anchored active recurring expected dates/known coverage. Payments, bill status and expectations do not enter spending. Whole-paycheck plan snapshots are labelled separately from transaction-period totals. Unknown actuals do not become zero.
- Nourish: planned assignments over time/type, saved-meal frequency and week planning coverage. Nutrition summary uses only assignments with all four known fields, with per-field coverage for other assignments. Known zero is valid; no values are inferred and plans are never confirmed intake.
- Daily Edit: recorded movement intentions and water goal attainment only on dates with known per-day goal snapshots. One existing fictional sample day's values are registered once in the canonical session seed rather than injected by Insights. Water writes now preserve selected-day goal/unit snapshots; changing configuration on an unlogged day does not create an intake log or rewrite other dates.

IMPLEMENTED: theme-aware Recharts line/bar/stacked-bar/donut adapters, keyboard-accessible date consistency grid, axes/units/tooltips/legends, server-rendered captions/value tables, zero-versus-missing handling, empty states, responsive natural panel flow and shared accessible date-inspection drawer. Plot canvas alone lazy-loads on the client. All nine themes and Crystal/Frosted use the same markup/tokens; chart animations are disabled.

APPROVED/PLANNED: Supabase queries/aggregations and private durable history, effective-dated historical classification/configuration, durable timer sessions and richer validated analytics. FUTURE/EXPLORATORY: AI prose consuming validated metrics; imported Health/steps/sleep/workouts/meditation/heart-rate data and cross-source matching. Source-aware interfaces anticipate adapters, but no integration, backend, tracking service, AI endpoint or extra domain record store is implemented.

## Future / exploratory

Not v1: Aspirations/goals; Muse Circle; selective sharing between independent private accounts; Apple Health only with suitable native companion architecture; broader optional zodiac/constellation profile personalization.

Cosmic Forecast now provides the optional Daily Edit card, manual sign/visibility preferences and expandable explicitly illustrative preview. Evaluate a live provider separately; no astrology API is connected. Detailed Cosmic Forecast is APPROVED/PLANNED in WHIMSY_ROADMAP.md; provider selection and broader profile/zodiac personalization remain future decisions, never mandatory clutter.

## Architecture and environments

IMPLEMENTED: Next.js/React/TypeScript, Tailwind pipeline plus shared CSS semantic design system, React local stores, theme/material preference localStorage. APPROVED/PLANNED: Supabase PostgreSQL/Auth/RLS, Vercel production deployment/PWA, private GitHub repository, independent private accounts. Same repository/codebase; isolated preview/staging test data and production real data via separate variables/databases. No Supabase/auth/integration is introduced by this phase.

## Planner / Rituals refinement verification and follow-up

Neon Hangover! is IMPLEMENTED as the sixth theme: graphite/charcoal with luminous mint/aqua, lilac/periwinkle and restrained peach/pink accents. Every theme provides the same full semantic contract, including three-level planning materials. Curses! atmosphere/global glass is retained. Theme and material preferences use localStorage; domain records remain in memory.

Current automated checks cover task identity/due/completion across placement/reorder and shared Daily Edit, all eight token contracts and planning-text contrast/material separation, recurrence-aware day/week streaks, future/unscheduled logging rejection, retroactive edits, missing/zero, weekly aggregation, safe group changes, milestone replay, and reduced-motion structure. Browser visual/gesture/focus/touch review is still required; structural checks are not visual approval.

Before persistence: add user scoping/RLS, canonical order positions, dated recurrence/goal versions, database constraints/unique ritual-date keys, time-zone and week boundaries, optimistic write conflicts, historical log corrections and durable milestone eligibility. Full analytics remains outside the current prototype; later modules are implemented only when explicitly requested.

## Visual and state refinement — current implementation

IMPLEMENTED: Crystal/Frosted optical switch in the existing theme menu; stronger Crystal fill/edge presence and more opaque/diffused Frosted across shared surfaces. Nine complete theme contracts include material variants, haze distribution and quiet constellation inks. Neon Hangover! is corrected toward near-black neutral graphite with vivid mint/cyan/lilac/pink/peach LED light; Curses!'s baseline atmosphere palette/distribution is preserved.

IMPLEMENTED: abstract Daily Edit atmosphere, a safe three-star signature beside editorial copy, and a separate top-aligned date/week column; theme/material picker in the sidebar; mobile uses Appearance via More. Broad abstract module environments replace literal high-level diagrams. Slow star shimmer/static haze use existing timing; reduced motion is static.

APPROVED/PLANNED: full Appearance page and user-configurable magic/atmospheric intensity/reduced-motion preference, arbitrary custom group gradients and pinning preferences, durable domain data/history. Detailed Cosmic Forecast is APPROVED/PLANNED; no provider/API is selected or connected, and broader personalization remains exploratory. Visual browser approval is separate from structural/SSR and numeric contrast verification.

## Daily Edit header and source actions — current implementation

IMPLEMENTED: greeting left and functional date/week right on the same top edge; a separate normal-flow three-star signature sits beside the copy. Theme picker lives in the sidebar; mobile uses Appearance via More. Decorations reduce before controls crowd; no extra hero height or centered constellation track.

IMPLEMENTED: reusable `CardHeading` Manage and informational `ModuleBadge`. Today's Plan uses Planner + Manage and no redundant header item count; Meals uses Nourish + Manage. Both links carry selectedDate. Movement keeps Manage only; Water separates preference management from editing the daily record. Mood and Day Pulse retain their established interaction without invented badges/actions.

The route and domain checks are automated/HTTP verified; desktop/mobile visual interaction review remains pending without a connected browser. Insights now has its own implemented local analytics page; remaining placeholders still do not imply implemented features. Notes and theme/material Appearance settings are now implemented locally. Mood is now implemented locally; Settings currently implements only Cosmic Forecast preferences. Money now has its own implemented local page.

## Vivid color / Crystal / Nourish organization correction

IMPLEMENTED: distinct vivid action/navigation/focus/success/progress/star accents in all nine themes, stronger active navigation edges/icons, module badge edges, blue/cyan Midnight Ballerina! hero illumination, localized fuchsia Curses! hero light without replacing its established pools, and almost-black neutral Neon Hangover! with electric aqua/mint/lilac/pink/peach accents. Pretty Toxic! now explicitly balances peacock/teal left, wine/raspberry upper-right, subtle central berry and emerald lower-right; warm color participates in functional accents too. Light secondary text is strengthened for the richer atmosphere.

IMPLEMENTED: shared Crystal material layers now survive component background shorthands. Specular top/side light, faint internal theme reflections, inset edges and saturation/blur distinguish polished Crystal from the denser, diffused Frosted choice without reducing material opacity or changing layout. Nested entries receive painted reflection rather than another blur. No new material animation or backend is introduced.

Automated/domain/SSR checks and local route checks do not substitute for browser visual review. With no connected browser, eight-theme/two-material desktop/mobile color balance and actual scrolling/filter performance remain review items.

## Header, Planner and Ritual/Mood refinement

IMPLEMENTED: clean sidebar branding and independent small stars; no connector through logo/toggle. Daily Edit uses abstract sky, stars left of date, and global sidebar theme control. No Daily Edit card-grid redesign.

IMPLEMENTED: shared lightweight abstract layers vary by module (Daily sky, directional Planner, rhythmic Rituals, organic Nourish, emotional Mood, refracted Money, sparse Notes). Legacy high-level SVG line-art hero components are removed. Theme/reduced-motion behavior is shared. Notes now has a functional local writing workspace; Mood has a functional local Emotional Observatory.

IMPLEMENTED: common native-dialog lifecycle for drawers and a large Mood picker; persistent controls/Done with one scrolling results region. Large desktop/touch-friendly mobile sizing and explicit selected states preserve emotion vocabulary/IDs/quadrants/multi-select. Browser visual/interaction checks remain necessary when a connected preview is available.

## Current targeted density / library / Ritual refinement

IMPLEMENTED: stable desktop Task List/day-container heights with internal task scrolling; short source lists remain top-aligned. Compact shared task cards have two default rows: checkbox/title/stopwatch, then quick Workspace/Group classification and tags. Due/estimate/subtask facts remain in Details; an optional component due-preview flag supports a future preference without implementing settings now. No permanent six-dot handle or Move link. Non-interactive areas retain native drag/drop; Details keeps manual Move/date/return-to-Inbox/reorder and full fields. Details Workspace/Group use MuseChoiceMenu; no native selects remain in Planner. Mobile preserves large interaction targets, Task List sheet and focused day.

IMPLEMENTED: Saved Meals natural-height three/two/one grid, visible Edit, shared overflow for link/removal, combined search/type filters, optional known macro values and short notes. Assigned meal tiles prioritize name plus known Cal/P/C/F, omitting note/source copy while preserving those fields in details. Grocery category grid and focused Enter capture, Unsorted global capture, secondary details editor, thirteen default sections, checked rows retained below active until clear. Existing snapshots, nutrition, move/copy and Daily Edit ownership are preserved.

IMPLEMENTED: Ritual centered status geometry, theme-gradient completion orb with achieved numeric value/white-check badge or central binary white check, partial quantity/duration rings, non-interactive unscheduled dash, honest Unknown/Missed/Upcoming distinctions. Top week dates carry daily-completion rings, accurate scheduled-goal denominators, separate weekly targets and guarded perfect-day golden AchievementStar/Spark. Group banners stay clipped; mobile keeps focused-day rows and usable week strip.

IMPLEMENTED: semantic multicolor interaction roles restore cyan/blue/violet/fuchsia balance to Curses! and teal/emerald/rose/berry balance to Pretty Toxic! without changing atmospheric palettes. Other four themes supply the same complete roles. Browser visual/gesture/focus review remains separate from domain/SSR/token checks; no connected preview means no claim of visual approval.

## Abstract cosmos / global chrome / birthday / Recurring — current pass

IMPLEMENTED: one canonical four-point star path, distinct theme-aware MuseStar and gold AchievementStar. Water and perfect Ritual dates use the earned state, with numeric over-goal amount retained and no loading celebration; Money positive full allocation uses the same primitive. Eight local candy pieces are birthday-only first-earned feedback, not per-checkbox confetti. Existing Ritual logs/recurrence, partial rings, centered geometry and daily denominators remain unchanged; completed orbs now preserve achieved quantity and use a small contrast-safe white-check badge, or central binary check.

IMPLEMENTED: two birthday entries share the same deterministic eight-color candy identity and family metadata, with independently designed frosting-white and near-black Crystal/Frosted tokens, previews, completion/progress/chart/timer/selection roles and theme persistence. Other six atmospheric identities are unchanged. Abstract module heroes now use whole-field CSS nebula/aurora/refraction/haze/particles and sparse official stars, with varied compositions; no literal line-art object remains underneath. Theme picker is quick sidebar/app chrome, not hero content. Reduced motion is respected. Full Appearance intensity/magic/user-motion controls remain APPROVED/PLANNED.

IMPLEMENTED: Task List header contains only title, workspace switcher, capture; task cards begin immediately and scroll in the fixed shared desktop surface. New workspace is a separated action within the existing compact custom workspace menu, with markers, selection and arrow/Home/End navigation. No second workspace model/manager was created.

IMPLEMENTED: assigned Nourish tiles show compact known Cal/P/C/F values, preserving recorded zero and omitting unknowns. Saved/one-off assignments share the row; note/saved-source metadata remains stored/editable rather than taking default tile space. Daily known/incomplete totals and move/copy/desktop drag remain.

IMPLEMENTED (fictional/session-local): Money Recurring subview “KNOW WHAT’S COMING / Recurring / The things that come back around.” Add/edit name, optional integer-cent amount, fixed/estimated, existing category, calendar interval/unit, next-charge anchor, provider/custom source, existing card or safe shared payment-method label, active/paused/cancelled, notes/manage text/cancellation/end dates. Weekly/fortnightly/monthly/quarterly/six-month/yearly/custom positive intervals compute the next expected date from the original anchor, including short-month/leap-year handling. Edit the date to reanchor; no transaction or card-balance change is generated.

IMPLEMENTED: All/Monthly/Yearly, search, one compact category/method/provider/status filter popover; chronological next-seven-days/month/next-month/later/history groups; true annual billing amount remains primary. Known monthly-billed total, annualized estimate and monthly-equivalent are distinct, with variable/unknown coverage. Active expected category summaries are separate from actual spending. Paused/cancelled/ended records remain available but leave future totals. Bounded three-charge dashboard preview and links to full Recurring; card tiles link to the same records. Safe non-card method labels can also be used by actual transactions. Linked dated bills are deduplicated only when a matching active expected date exists; cancelling the expectation never erases a recorded unpaid bill. Bills remain inside Overview/Paychecks.

APPROVED/PLANNED: durable recurring occurrence/history, matching/confirming manual transactions, effective-dated price/schedule changes, automated paycheck funding and calendar/timeline. No bank integration, external cancellation action, cross-module analytics or card/account credentials. Current normalized analysis uses calendar month/year factors and 52 occurrences/year for weekly estimates (26 fortnightly) and a 365.2425-day year for daily estimates, rounded at the aggregate cent; it is clearly an estimate, not a promise of future charges.

Verification remains domain/SSR/token/build/HTTP only unless a browser is connected. No connected browser means no claim of visual, touch, gesture, focus or actual glass-compositing approval.

## Current focused layout and ledger polish

IMPLEMENTED: one full-content-height shell atmosphere with preserved theme bloom colors/upper identity and soft non-repeating lower aurora fields. All modules inherit it. Hero art has vertical/horizontal fade and actual measured date/week/toolbar safe space, with conservative pre-hydration CSS and responsive hiding. Normal-flow stars hide before the date container cramps. Daily Edit retains the large personalized greeting and section heading; a separate smaller supporting mantra now uses the shared profile-local daily module library.

IMPLEMENTED: shared tag geometry, search padding/inset focus, viewport/modal/keyboard-aware popover bounds. Choice menus support explicit search and semantic color markers, with one scrolling results area. Planner cards hide due/estimated/scheduling/subtask lines by default and place tags beside classification; native drag and all Details fields remain. Stopwatch opens an inline panel using the same canonical timer, preserving actual time across collapse/rerender. Structured searchable filter rows retain single Group/match-all Tags/status semantics, add Show completed and optional scheduled-time-only filtering, and expose clear/done/count. Timeboxing here means the existing timeSlot; no new calendar/timeboxing engine was built.

IMPLEMENTED: categorized grocery grid/Unsorted and scoped quick capture were already present and are retained; the later Grocery UX correction supersedes the name-only global capture with an aligned quick-add row. Row notes now stay in the existing edit sheet; name/quantity/check/edit/remove and recoverable completion remain. Stable section/item IDs and all previous data survive.

IMPLEMENTED: Money Overview independent authored desktop columns, natural card heights, token gutters, Recurring in the left stack, full-width Recent Spending after both. Narrow widths stack authored columns in DOM order; no artificial equalization or masonry. Paychecks uses Previous/Current/Next plus searchable older history and empty-history state. Two additional fictional older income records exercise history. Readable allocation ledger with inline category/marker, planned/known actual/variance and actions; same IDs/calculations/templates. Bills use explicit Paid/Upcoming/Overdue/Unpaid text states with due/cadence/amount/manual action/edit; no generated expense. All nine themes and both materials retain shared layout.

Data changes are limited to optional Planner filter configuration (`timeboxedOnly`) and additional clearly fictional paycheck fixtures. No canonical task, financial or grocery record schema was replaced; due-date visibility preference UI, persistence, durable ordering/time sessions and production history remain APPROVED/PLANNED. Full Appearance, future modules and backend integrations are unchanged. Browser visual/interaction QA remains pending unless a preview is connected; structural/geometry/SSR checks do not imply visual approval.


## Current Emotional Observatory, galaxy and ledger pass

IMPLEMENTED: full-document `MuseAtmosphere` with upper/middle/lower overlapping theme light, sparse deterministic dust/bokeh/four-point stars and distributed birthday-only candy accents. The circular birthday header cluster is removed; header decoration is sparse and control-safe. `MuseStarCluster` is reused in Daily Edit and compact module title signatures. Shared existing glass, all eight theme identities, global navigation and Planner dimensions remain.

IMPLEMENTED (superseding the original eight-hour collection): two remaining approved five-line editorial collections (Daily Edit/Insights) in `lib/mantras.ts`, plus seven fixed module mantras in `lib/page-header.ts`; deterministic profile-local daily rotation, module offset, live midnight/visibility refresh, DST-safe next boundary and approved hydration fallback. `MuseMantra` supports compact/standard and optional editorial serif. Titles and the Daily Edit greeting remain independent; standard header eyebrows are retired. Remote editorial content, seasonal/custom/favorited mantras are FUTURE/EXPLORATORY.

IMPLEMENTED: optional compact Daily Edit hero Cosmic Forecast card below the week strip, and Settings enable/sign controls. Default is visible with an invitation to manually choose a sign; no profile sign/birth data is inferred. Off removes the card without a gap. Browser preferences have an in-session fallback for unavailable storage. Provider contract supports loading/error/unavailable/ready, date/sign/attribution/retrieval time and successful daily cache. NO LIVE PROVIDER is connected. Preview copy is explicitly illustrative, with expandable explanation; live/full text is only rendered for an actual successful provider response. Whimsy now has a Coming Soon landing page; its feature engines and broader astrology remain deferred.

IMPLEMENTED: empty groceries show a curated six-section skeleton; populated lists show relevant sections with Show all for thirteen existing IDs. Desktop quick-add name/optional quantity/category/Add aligns on one row; mobile has explicit stacked tracks. Category is retained between adds. Per-section Add item remains. Right-edge pencil/trash actions replace the menu; reduced checkbox glyph preserves touch area, checked rows dim, and remove/clear-completed support Undo without losing identity or metadata.

IMPLEMENTED: Paychecks allocation name and compact color-coded dropdown chip now share ONE inline identity cell (no second-line duplicate category). Planned/Actual stay right-aligned; variance remains; optional due labels are readable. Bills have readable dates, explicit text status chips, compact payment action and overflow edit. No financial calculations changed.

Validation is automated domain/SSR/token/type/lint/build plus served-route HTML only until a browser is connected. No claim of desktop/mobile visual, glass compositing, pointer/keyboard interaction or theme optical approval is made without that browser. Review all nine themes, Crystal/Frosted, empty/populated groceries, inline ledgers, Mood picker/history and the full height of Planner/Mood before final visual approval.


## Coordinated header, atmosphere and theme collection correction

IMPLEMENTED: `MuseHeaderFrame` supplies common top padding, copy/title/signature structure, right date/context alignment and compact header/content rhythm. Daily Edit preserves the personalized serif greeting and one rotating mantra; greeting/date top edges align in a two-column grid, with a full-width date pill and seven-day strip aligned beneath. Responsive layouts stack, keeping touch targets. Its cards/widgets are untouched. Active headers no longer render PageCelestial or literal constellation strokes. Signature stars have their own pointer-transparent normal-flow safe zone beside copy in every primary module.

IMPLEMENTED: Money adds the shared selected-date pill without changing its independent reporting period/paycheck selection. Nourish date navigation preserves the current Plan/Saved Meals/Grocery List view and query date. Header/nav/toolbar/week/section/card gaps are semantic shared tokens; Rituals summary padding and Nourish stacked margins are tightened without removing functionality. Mobile top-bar picker is removed; the existing sidebar picker stays and mobile Appearance is available via More.

IMPLEMENTED: renamed display labels with stable old IDs; ninth `disco-damage` theme added. Existing eight palette blocks are unchanged. Functional Appearance shows nine previews and Crystal/Frosted selection; sidebar uses the same registry/preference key. Disco Damage XXXTRA! has near-black violet, liquid chrome, hot pink, ultraviolet, electric cyan, holographic ice and selective gold. It supplies the full semantic/material token contract, with chrome/pink/cyan signature stars and distinct prismatic states/progress. Crystal adds stronger specular/reflected light only for Disco; Frosted is softer. No layout change per theme.

IMPLEMENTED: deterministic clustered pinpricks/stardust, sparse micro-stars/bokeh/wisps and quiet areas cover the document-height atmosphere. Disco now adds a recognizable spherical mirrored chrome/holographic ball and richer reflected facets/beams across top/middle/lower regions, superseding the earlier no-literal-ball direction. No circular confetti graphic, header-only galaxy or expensive animated full-screen filter. Reduced motion stays static. Notes shields its prose from atmosphere.

Validation is lint/type/build, nine-theme semantic/material/contrast checks, domain/editor-schema/SSR and served-route HTML. Desktop/laptop/tablet/mobile optical screenshot, pointer and actual keyboard interaction review remain pending without a connected browser. A passing token/HTML check is not visual approval.


## Cosmic hero and Disco overhaul verification

IMPLEMENTED: Forecast appears exactly once in the right Daily Edit hero track after the week strip; a compact variant reuses the original provider/preferences/preview/settings/expand behavior. Date and greeting top-align, content determines height, and the shared section gutter separates the dashboard without a fixed empty spacer. Narrow layouts stack; no Daily Edit widget behavior is replaced. No live forecast provider has been connected.

IMPLEMENTED: Disco-only local transparent SVG mirrorball with 1,152 small projected neutral chrome facets, chrome highlights and controlled spectral color; partial editorial crop, measured header copy/control exclusion and full-document deterministic reflection fragments/glows. Cobalt/acid lime reflection roles and stronger readable translucent Disco glass are isolated to this theme. Other eight theme blocks are unchanged. Pointer-transparent art cannot alter layout; a slow clipped mirrorball highlight has a static reduced-motion fallback; full-document reflections remain static. No raster/generation API, animation library, canvas or full-screen animated filter is added.

Current acceptance uses automated domain/SSR/asset/token/type/lint/build and served-route checks. The user explicitly said a browser is not needed; no browser connection is required to complete this pass. These checks do not claim screenshot approval, actual pointer/touch operation or optical glass-compositing verification. See INSIGHTS_FORECAST_DISCO_PASS.md for file inventory and limitations.


## Prismatic icons, holographic Disco and Water finish line

IMPLEMENTED: reusable `PrismaticSvg` with instance-unique React useId paint servers, real SVG linear gradients, three coordinated tone orderings, semantic per-theme icon paint/highlight/edge roles for all nine stable IDs. Existing icon paths/viewBoxes/stroke/sizes remain. Main desktop/mobile navigation uses gradient strokes; featured Daily Edit headings and Ritual group icons opt in. Legacy `GlassIcon` now emits only the shared gradient SVG, without decorative enclosure or interaction. Four featured Daily Edit icons use compact jewels; utilities stay monochrome. Existing headers retain the official three-star arrangement with prismatic fill and a single arrival glint, not a loop. Hover/focus/selected light changes are restrained; reduced motion removes new transitions/arrival movement. No new dependency.

IMPLEMENTED: Water AchievementStar moved from numeric header to the reserved right progress endpoint. True over-goal quantity, capped fill and goal reached text remain. A genuine crossing sequences bar fill → endpoint glint/flash/scale/settle, about 870ms; additional above-goal changes do not replay. Going below goal hides/rearms Water; goal edits use the same threshold behavior. Already-completed mount/history is calm. Shared AchievementBadge adds opt-in reentry, retaining default once-per-scope behavior for other milestones. Reduced motion settles immediately; all quick amounts/edit/manage/shared records persist unchanged.

IMPLEMENTED: replaces Disco's oversized colored-square globe with a 94,912-byte local transparent SVG of 1,152 small neutral silver mirrored facets, coherent dimensional shading, white specular highlights and selective reflected cyan/pink/violet/lime light. Smaller editorial crop; hidden until actual header copy/context safe regions are measured; observes route/DOM/layout changes. Added static full-page caustic patches/streaks; existing clustered light/dust/reflections continue. Only a small clipped highlight moves slowly under normal motion. Other eight atmospheric palettes and all theme IDs/material preference behavior remain. No 3D engine, image API or heavy animation library.

IMPLEMENTED: Planner search and utility controls occupy explicit horizontal tracks, stacking deliberately on small screens without shrinking controls, board columns or touch targets. No task/timer/filter/drag semantics change.

Validation uses automated SVG/SSR/transition/token/contrast checks plus normal lint/type/test/build and served routes. The user does not require a browser. SVG asset inspection is separate from app optical approval: no claim of desktop/mobile screenshots, pointer/touch or actual backdrop-composited contrast without rendering in a browser. See PRISMATIC_ICON_WATER_PASS.md for the scoped file list and limits.


## Universal UX and Forecast placement — current implementation

IMPLEMENTED: explicit DailyEditHeader right-column DOM ownership for date/week. One Cosmic Forecast lives in the main grid immediately after The Daily Edit heading and before Priorities, with a full-width card span and no duplicate or positioning trick. Shared header width/minimum tokens and zero per-module date offset align Daily Edit/Planner/Rituals/Nourish/Mood/Money/Notes/Insights. Planner controls now occupy the secondary toolbar; summary/drag instructions are removed, task cards gain modest vertical padding while preserving the two-row hierarchy, timer, drag and manual Details workflows.

IMPLEMENTED: shared icon-action/glass X and ColorLabel components; compact/default/spacious chip hooks and coarse-pointer targets. Planner organization and Ritual groups edit in the selected row, with explicit Save/Cancel/Escape, separate creation and confirmed/protected deletion. Complex ritual definitions and daily progress remain their existing intentional drawers; logs, recurrence and orbs are unchanged.

IMPLEMENTED: actual validated custom hex accents across workspaces/groups/tags, Ritual groups and Money categories/groups, retaining legacy preset compatibility. Two/three-stop custom ritual banner gradients with live preview, theme mixes and directions. Optional Planner item icons, existing Ritual/Money icons and a reusable searchable/category picker. Forty-two extra curated SVG choices load in a separate geometry chunk with an explicit local loading boundary; no external icon-library dependency or whole-page suspense when opening it. Custom values remain in session records across theme changes, not across refresh.

IMPLEMENTED: popovers resolve their native dialog host from the anchor after mount; nested dismissal affects the topmost panel. The inline icon browser stays within its owning active form/dialog. All drawers/modals and dialog-style popovers expose the shared X while retaining Escape/focus/scroll lifecycle. Destructive overflow actions require local confirmation.

IMPLEMENTED: compact auto-filled Saved Meal tiles, pencil/overflow, known nutrition, A–Z/Z–A/newest/oldest sorting beside filters, stable fallback ordering for missing legacy timestamps. Add Meal exposes all meal-type suggestions while keeping the current destination slot and snapshot semantics. Groceries retain prior behavior.

IMPLEMENTED: Daily Edit/Mood continue sharing one date/period record. Day Pulse radio groups now have per-instance names so retained inactive route DOM cannot interfere with active input. Reflection typing changes only a labeled session draft; explicit Save changes history, Discard restores saved content, drafts survive client navigation, and confirmed record deletion also removes its draft. No automatic keystroke history records, duplicate check-ins or backend claim.

IMPLEMENTED: Spending category/subcategory/split quick editors preserve amounts/remainders/card accounting; custom category colors appear in selectors, category lists and Money/Insights chart marks. Recurring uses the polished ledger language, readable dates/status/actions and real next-7/next-30 expected-occurrence totals, plus active monthly equivalent/annualized context. Weekly normalization follows the newly approved 52/year (26 fortnightly); expected windows exclude paused/cancelled/ended and disclose unknown/estimated amounts. Card UI/accounting remains, with compact recurring rows and readable dates.

APPROVED/PLANNED: production persistence, durable draft recovery/conflict handling and effective-dated financial/configuration history. Existing Insights is retained; no new analytics or integration is added by this refinement. See UNIVERSAL_UX_FORECAST_PASS.md for validation, source inventory and limitations.

## V1 delight / Notes continuation — implemented

- **Notes:** removed external toolbar and sample disclaimer footer. Hide tags lives in tag header; list search stays in its pane; Focus/New note/pin/archive/overflow share editor header. Focus and restoration preserve the same Tiptap instance, text, caret and scroll; Search exits Focus. Roughly 15/22/63 default desktop tracks and measured remaining viewport height, independent list/tag/prose scrolling, progressive mobile list/editor/tag navigation and preserved pane preferences. Rich-text/search/tag/versioned draft model is unchanged. No drag-resizable divider existed; none was introduced.
- **Planner:** immediate Workspace/Group classification without Done or cancellation instructions; compact searchable, collision-aware options with X/Escape/outside dismissal. Full Details is denser, manual Move sits next to Planned Date; due/planned/order/timer/subtask/tag/notes semantics remain. Birthday primary actions now candy pink, with readable theme ink. Three-day architecture and fixed source rail are unchanged.
- **Motion:** existing Spark / Ritual Glint / Constellation feedback shares Quiet/Magical/Extra gating; global browser preference and OS reduced-motion override. Official shooting-star priority milestone and restrained Planner-day/Ritual-group glints observe completion transitions without initial-load or repeated mounted undo/recomplete playback. Everyday checks/popovers/timer disclosures and note action acknowledgments reuse short tokens; no animation inside note text. Water achievement is unchanged. No artificial meal-week or financial celebration.
- **Expression:** optional per-date intention emoji and zero–three ordered Day in Three emojis, shared native searchable/category picker with progressive results, draft selection/replacement/removal, preserved order and keyboard navigation. Metadata is a lazy data-only dependency; no emoji images or remote lookup. Canonical date-keyed session fields remain separate from period-based Yale check-ins and nullable Pulse signals. Dayprints group the same existing records with intention/emojis and separate Morning/Evening sections; edit/delete remain available.
- **Mood:** centralized profile-local 15:00 default, frozen date capture default/manual override, stable historical session/date/ID/createdAt/timezone plus updatedAt. Unknown legacy capture timestamps stay null. Feeling Families explicitly labels energy/pleasantness; counts are selections. Independent average Energy/Stress/Overall Day each has n; missing values excluded. Ten Pulse steps remain neutral, with Clear outside segment targets.
- **Copy/routes:** Daily Edit/Insights retain approved daily five-line collections; seven other module headers now use fixed approved mantras under the title (no eyebrow/extra subtitle). Personalized greeting and brand remain separate. Life → Whimsy is a real fixed route with approved Horoscopes/Dream Diary/Tarot Journal Coming Soon copy. Existing Forecast behavior is preserved in its full-width content position. /login-preview is an isolated email-format/design prototype with explicit no-email/no-account notice, labelled future loading/sent/error visuals, and return-to-app. Providers and existing app access remain intact.

**APPROVED/PLANNED:** authenticated user/local-date daily expression storage, explicit session check-in records (stable ID, user ownership, local date, timezone, session, original createdAt, updatedAt, emotions, influences, optional reflection/signals), private invite-only magic-link delivery, durable Notes/domain history and per-user settings. None is connected here.

**FUTURE/EXPLORATORY — Your Emoji Vocabulary:** frequencies of intention/Day in Three emojis, week/month use, recurring ordered triples and changes over time. Derive only from genuine stored per-user/date fields, separate from Yale emotion IDs and session ratings. No inferred psychological traits, diagnoses, fabricated sample timeline or new analytics backend. Optional Morning/Evening Insights filtering remains planned; current aggregate analytics preserves separate records and independent recorded-value denominators.

**Validation:** see V1_DELIGHT_NOTES_PASS.md for current automated and actual local headless-browser checks. Session-local domain changes still reset on refresh. Only documented browser preferences persist. No Supabase, auth, migrations, horoscope service, dream/tarot engine, commit, push or deployment.

## Compact header refinement — implemented

`MusePageHeader` resolves exact Planner/Rituals/Nourish/Mood/Money/Notes/Whimsy mantras from `lib/page-header.ts`. No header eyebrow, third copy line or rotation remains on those modules. Title typography, normal-flow three-star signature and top-aligned date/navigation track are unchanged. Standard header minimum height is removed, reclaiming space above Planner's existing toolbar/canvas and enlarging Notes through its existing viewport measurement. Daily Edit greeting, daily supporting rotation, date/week/Forecast and widgets are unchanged. Insights preserves its meaningful daily rotation; Settings/Appearance retain their existing supporting strings in the compact style. Theme definitions, date logic, domain interactions, auth/persistence and financial calculations are untouched.

## Approved Whimsy / connected-data roadmap — original planning checkpoint

**PLANNED / NOT YET IMPLEMENTED:** [WHIMSY_ROADMAP.md](WHIMSY_ROADMAP.md) is the canonical specification for Detailed Cosmic Forecast, Tarot Study & Journal, Dream Diary, Unhinged Fortune Cookie, Fun Fact of the Day and Personal Book Diary/Reading Tracker; optional Daily Edit widgets and weather; Evening at a Glance derived source relationships; and optional future cross-module Insights questions. It records personal versus reference/cache persistence rules and the upcoming repository/Supabase audit guardrails. No feature, table, migration, API/provider choice, dependency, widget system or new analytics is introduced by that documentation.

Current Whimsy remains only its existing Coming Soon landing page, now with “A LITTLE MAGIC NEVER HURT” beneath the title. Existing Daily Edit Cosmic Forecast remains an optional compact preview/provider boundary with no live service. Existing Mood Dayprints are implemented projections and must not be mistaken for the future cross-module Evening at a Glance. Existing functional modules still await durable private persistence; the roadmap does not claim it exists. Exact future UI/content selection, provider/licensing, schema design, permissions and sequencing remain later audit/product decisions.

## Final layout / modal / emoji / Dayprint corrections — implemented and deferred

**IMPLEMENTED:** viewport-remainder desktop Planner surfaces with shared stable height, bottom quick capture and internally scrolling source/dated content; short/mobile natural flow. Search/category spacing in classification; existing selection/portal bounds preserved. Sharp three-stop icon gradients without a washed-out reflective band; functional icon buttons use monochrome foreground. Feeling modal title and X share a normal horizontal header; persistent search/filter/footer and one results scroller remain.

**IMPLEMENTED:** Both Mood and Daily Edit use `MoodCheckInLayout`: Mood check-in then separate Day in Three card at left, Day Pulse stretching to their combined bottom edge at right; natural single-column stacking on smaller content widths. Day in Three retains its confirmed ordered0–3 draft/Done/Cancel behavior and shared dated values. Pulse says “The numbers behind your day.” and omits session-specific header labels; underlying legacy values are preserved pending migration.

**APPROVED/PLANNED, NOT MIGRATED:** one daily Pulse record per authenticated user/local date, distinct from Morning/Evening emotional check-ins. The current prototype stores nullable scores on each session, and current Insights uses that model. Conflicting values cannot safely become one score without an approved policy. This pass preserves all records/values/session metadata and labels their attribution; it does not introduce a parallel daily score, select latest, average or delete observations. Audit must coordinate lossless legacy treatment, user review/conflict policy, date/timezone identity, delete/clear behavior and analytics denominators before Supabase. See [LAYOUT_MODAL_EMOJI_DAYPRINT_PASS.md](LAYOUT_MODAL_EMOJI_DAYPRINT_PASS.md) for scope, changed files and the concrete audit checklist.

## Current audit correction checkpoint

Implemented presentation: one full-width Cosmic Forecast directly after The Daily Edit heading and before Priorities; shared natural left Mood/Day in Three stack and stretching right Pulse on both pages; no decorative identity-icon tiles; consistent field/section/filter-result spacing, especially Add Meal/Add Snack. Existing selected-date, forecast provider/settings, dashboard interactions and financial calculations are retained.

See [ARCHITECTURE_AUDIT](ARCHITECTURE_AUDIT.md) for actual CRUD/storage/analytics coverage and [DATABASE_BLUEPRINT](DATABASE_BLUEPRINT.md) for the **proposed, unimplemented** Supabase/auth/RLS/query-cache design. Day-level Pulse is approved but not migrated. Current session scores, independent day expressions, prototype sharing and all missing lifecycle operations are inventoried; no new backend or Whimsy feature is implemented.

## Approved daily records and historical presentation — architecture contract

**Approved/planned, not migrated:** one authenticated user/local date anchors daily intention text/emoji, independent nullable1–10 Pulse values, ordered0–3 Day in Three and related records. Morning/Evening retain feelings/influences/reflections/session identity, not independent Pulse sets. No merging/discarding prototype session values without an explicit lossless policy.

Priorities are up to three **dated Planner task designations**. New priorities create canonical tasks automatically; retained detached rows are inactive history. Keep stable ID, ownership/date, original text, display order, standalone completion or canonical task linkage, and creation/modification timestamps. Create a real Planner task atomically for each new priority; never auto-promote ordinary Planner tasks. While linked, task completion is the only authority; a priority completion action updates that task. Preserve historical commitments when a linked task moves/archives/deletes; the implemented Pass B lifecycle materializes the appropriate completion evidence when unlinking/deleting; see [PLANNER_PASS_B](PLANNER_PASS_B.md).

Dayprint is the unified historical presentation of a day, derived from its actual sources, not duplicated snapshots. It must eventually include intention, priority text/status/count, Day in Three, daily Pulse and separate Morning/Evening emotional sessions, including days with no Mood entry. Current intention/emoji/Day in Three sharing already works; priority history and optional links are now implemented locally in Pass B. Intention must persist independently of priorities, ratings or evening participation.

Nourish Water is an approved **future focused UI task** reusing the existing experience and one hydration owner. Adding/editing/removing quantities or changing a dated goal must update both Nourish and Daily Edit; never manufacture drink events from an aggregate. No Water widget is added to Nourish in this architecture cleanup. Rituals/Money Daily widgets are intentionally optional and are not needed for completeness.

Future Insights may query actual intention/Day in Three emoji usage, priority completion and daily Pulse/hydration relationships with honest sample sizes, original local dates and null handling. Emojis are descriptive expression, not validated psychological outcomes. Shared records must work across web/PWA/future native clients without relying on a page being mounted. See updated audit/blueprint matrices for actual versus target connections.

## Money and picker cleanup checkpoint

Implemented: Coming up now uses compact name/date/amount ledger rows while preserving existing bill/card-payment editor navigation, preview bounds and + Bill. Previous/Current/Next paycheck controls are centered, width-bounded and compact, with Past Paychecks/New/Template behaviors intact. The existing independent overview stacks are retained; no financial calculations or records changed. Residual space beneath the shorter stack is reported as a composition imbalance, not masked.

Implemented: shared icon picker containment/search sizing, wrapped category chips and adaptive vertically scrollable results; native emoji grids adapt to available width with matching arrow-key column movement. Full emoji vocabulary, Day in Three confirmation and intention selection remain separate from the curated icon library. All changes are presentation/interaction only; no Supabase, account wiring or model conversion.

## Approved Phase 1 and local foundation checkpoint

**Approved:** discard existing memory-only prototype scores, not real persisted records. One daily nullable Energy/Stress/Overall Day set; separate Morning/Evening emotional sessions; no fictional personal-record imports. Standalone priorities remain daily commitments. Later Planner-linked live completion synchronizes with the task, but historical Dayprints preserve the end-of-associated-day state; late completion never silently rewrites history. Archive retains the link; unlink/delete preserves original text/date/order and completion facts. Targeted history and edge cases are specified in the blueprint before later integration.

**Approved:** private admin-managed invitations and magic links, no unrestricted registration; USD-only initial Money scope with integer cents and explicit user-established opening balance/effective date; records retained until explicit deletion; working export and confirmed account deletion/cache clearing before real-data use. Stable intentional profile timezone, no automatic device-zone travel changes or historical date shifts.

**Implemented locally:** project-local Supabase CLI/SDKs, development stack with loopback-only ports, private Auth configuration/local email inbox, Phase 1 relational schema/RLS/commands, canonical emotion vocabulary, generated types and typed client/data boundaries. Synthetic database/API tests verify the foundation. No hosted project was created/linked. **Application authentication is now implemented locally:** live login reusing the approved standalone design, verified callback, Proxy refresh/private route protection, invite-only issuance and logout/session cleanup. See [AUTH_LOCAL](AUTH_LOCAL.md). **Not yet implemented:** provider/UI persistence cutover, cross-module browser save feedback, user-facing export/account deletion or production deployment. Existing app views remain explicitly prototype state until the next stage. See [PHASE1_LOCAL_SETUP](PHASE1_LOCAL_SETUP.md).


## Persistent daily experience — current Phase 1 checkpoint

**Implemented locally:** authenticated Daily Edit intention text/emoji, up to three standalone priorities with stable identity/order/completion, ordered Day in Three and independent nullable daily Energy/Stress/Overall Day. Mood persists separate Morning/Evening feelings, custom influences and reflections; sessions never own Pulse ratings. Dayprint derives daily values/priorities plus optional emotional sessions and includes no-Mood days. Existing Insights numeric reads consume canonical daily observations once/date. No fictional personal records are imported.

One user-scoped typed cache and revision-checked commands own editing. Pending/error/conflict states preserve drafts; conflicts require explicit resolution rather than silent overwrite. Ordered priorities save atomically. Cross-module navigation shares the cache; refresh/browser restart reads Supabase; other tabs/focus/reconnect refetch. The authenticated profile determines default local date/timezone; intentional dates remain URL-addressable and historical capture dates/zones never shift with travel. Earlier history loads in explicit bounded batches.

**Still prototype/planned:** other module domains and hydration; user-facing profile/export/account deletion controls and hosted production readiness. Appearance, themes and established UI are preserved. [PHASE1_DAILY_PERSISTENCE](PHASE1_DAILY_PERSISTENCE.md) gives actual ownership, validation and remaining limits; this checkpoint supersedes earlier statements that application daily integration was pending.


## Planner Pass A — current persistence checkpoint

**Implemented locally:** one authenticated task source across Planner and its existing Daily Edit preview; CRUD, standalone task completion/reopening, planned/due dates, rescheduling/order, organization, subtasks, existing event/timer behavior and retained completion history. No fictional task/workspace seeds. Database timestamps and capture-time IANA timezone/local date preserve actual completion facts through reopen, move, delete and travel. Delete hides the task from active views while retaining history; unused organization archives. RLS and a validated owner-scoped transactional command protect writes; stale/failed/uncertain edits retain drafts and require explicit recovery. The saved timezone is displayed, with an explicit UTC-default reminder and no mock-zone fallback.

**Subsequent Pass B implemented locally:** optional priority links, canonical task completion synchronization and original-day historical completion/materialization; see [PLANNER_PASS_B](PLANNER_PASS_B.md). Other module migrations, production/privacy rollout and calendar-time ambiguity integration remain deferred. [PLANNER_PASS_A](PLANNER_PASS_A.md) records the actual schema, timer/history semantics, conservative aggregate revision scope, validation and scale limits. The established Planner UI is preserved.


## Planner Pass B — priority authority and history

**Implemented locally:** optional links preserve each daily commitment's ID/text/date/order; max three, no task auto-creation. Planner alone owns linked live completion. Historical Dayprint reads the latest task state strictly before next midnight in the original daily timezone, with creation as known-open baseline and pre-creation history unknown. Late completion and later reopening do not falsify earlier days. Past linked checkbox displays day-end history; its link menu provides explicitly current-task actions. Unlink/task soft deletion materializes the appropriate true/false/unknown result and actual evidence timestamp, preserving the commitment. Rescheduling and organization archives retain links. Owner-safe atomic commands, revision conflicts, idempotent retries and shared daily-cache invalidation are implemented. Future priority Insights must use historical results and honest unknown handling; no new metric exists in this pass. Details and validation: [PLANNER_PASS_B](PLANNER_PASS_B.md).


## Settings persistence and refinement — implemented locally

Read-only verified email; explicit searchable IANA timezone selection/UTC confirmation; profile-backed forecast visibility/zodiac; revision/idempotency-protected saves and retained conflict/error drafts. Confirmed timezone changes update daily/Planner and existing date-sensitive displays in place, preserving original records and pending drafts. Four responsive sections, footer save status, spaced forecast controls, no legacy import UI, exact approved About statement and secondary version. Appearance is consolidated in the sidebar dropdown. Authenticated scoped JSON export includes persisted daily/Mood, Planner/history and Notes/tag/archive data with explicit exclusions; account deletion is truthfully unavailable and remains deferred. Validation and remaining limits: [SETTINGS_PERSISTENCE](SETTINGS_PERSISTENCE.md).


## Automatic task-backed priorities — current checkpoint

The approved post-Settings brief supersedes optional standalone creation/independent live priority titles from Pass B. A new Daily Edit priority atomically creates a task planned for its selected date. Planner owns current title/completion; either surface edits that task, preserving richer details and historical completion evidence. Removal only drops the dated top-three designation; task deletion retains an inactive recoverable historical priority and never silently recreates it. Existing standalone commitments backfill once by stable source ID, preserving original date/order/text/state without fabricated completion events. The limit remains three designations/date, never a limit or automatic promotion of Planner tasks. Details, workspace policy, backfill evidence and read-only Movement findings: [PRIORITY_TASK_CURATIONS](PRIORITY_TASK_CURATIONS.md).


## Nourish / Wellness MVP — current persistence checkpoint

**Implemented locally:** owner-protected saved meals and dated assignments, optional existing nutrition snapshots, hydration totals/goal/unit snapshots and preferences, movement types/shelf preferences and dated **intentions**, plus explicit recorded completions. Movement's existing Mark Done popover records one actual activity per owner/type/local date; Undo removes completion while preserving intention. Merely selecting movement never completes it. Users can correct a wrong completion by Undo and marking the intended type/date. No workout tracker, new activity editor, Wellness navigation rename or Planner activity link was added.

The existing single Grocery List is now persistent in owner-scoped categories/items, retaining item IDs, name, optional quantity/units text, notes, category, insertion order and checked state. It is not date-scoped, and checking an item is not evidence of purchase or consumption. No separate unit field, multiple-list feature or meal-to-grocery connection existed; none is invented. Removal/Clear completed retain the current Undo, implemented as a revision-checked restore with the original ID and metadata. Old receipts cannot replay a stale list over newer edits; conflicts require explicit recovery. No fictional or unattributable session history is imported.

Daily Edit/Nourish use one typed confirmed Wellness owner with atomic revision-checked saves, retry receipts, draft/conflict recovery, RLS, stable local dates and captured IANA timezone. Settings export includes groceries and all other saved Wellness records. Dayprint has no existing Wellness section and no new widgets were added. Existing Insights reads keep their established semantics without new derivations. This checkpoint supersedes earlier prototype-only/deferred-grocery statements for these sources. See [WELLNESS_PERSISTENCE](WELLNESS_PERSISTENCE.md) for migrations, validation and remaining scope limits.


## Rituals MVP — current local persistence checkpoint

**Implemented locally:** authenticated groups/customization/order/collapse, habit definitions and scheduled dated outcomes now persist without sample imports. Checkbox cells directly cycle Not Logged → Completed → Explicitly Missed → Not Logged; numeric quantities, minutes and weekly session quantities retain their existing progress/correction/clear sheets. Actual values stay uncapped by goal; weekly 6 / 4 explicitly shows Goal reached and 2 above goal. Missing, partial, missed, future and unscheduled remain distinct; streaks and Monday-first weekly totals derive from canonical observations.

The shared typed Rituals owner uses RLS, owner-safe revision/receipt commands, stale-response protection, preserved drafts and explicit retry/conflict recovery. The server enforces local dates/schedules using the saved profile IANA timezone, retaining original capture context through travel. Existing logged history locks type/goal/unit/schedule/start date; editable names/groups remain live. Effective-dated schedule editing and new tracking modes remain deferred; pause/archive/delete are now implemented by the lifecycle addendum below. Empty-group deletion remains supported and history-safe. Settings export includes saved Rituals.

Daily Edit currently has no Little Rituals surface. Shared authoritative access is ready, but no widget/redesign or automatic Planner/Wellness completion was added. See [RITUALS_PERSISTENCE](RITUALS_PERSISTENCE.md) for the additive migration, existing capabilities, scale limits, validation and readiness. This checkpoint supersedes earlier session-only Rituals statements; the future blueprint's effective-dated version model remains planned rather than falsely claimed as implemented.


## Ritual lifecycle — implemented MVP completion

Pause/resume and archive/restore are explicit actions from the compact ritual overflow menu. Changes start on **today in the saved IANA timezone**, not a selected historical date. Dated inactive intervals preserve original earlier schedules and observations. Paused/archived unrecorded dates are not due, missed or streak opportunities; resume/restore never backfill outcomes. Existing recorded measurements, including the transition day, remain meaningful and correctable. Entire inactive weeks have no weekly goal obligation and do not break a confirmed streak; partial active weeks retain the original whole goal without invented prorating. Historical summaries continue to include real archived observations. Active tracking hides archived rituals, while View archived offers historical review and Restore.

Permanent deletion requires a dedicated confirmation that explains dependent-history loss and prioritizes Archive instead. It removes the ritual, its observations and inactivity periods; only an owner-protected minimal ID/timestamp tombstone remains to prevent stale/retried snapshots recreating it. Lifecycle commands share the established owner revision, idempotency receipts, RLS, draft/retry and conflict recovery. Measurement/schedule history locks are unchanged. No new dashboard, tracking mode or gamification is added. See [RITUALS_PERSISTENCE](RITUALS_PERSISTENCE.md#lifecycle-mvp-completion) for rules, migration and validation.


## Money MVP persistence checkpoint — implemented locally

The six existing sections now share authenticated authoritative Money records through `lib/data/money.ts`, `MoneyStore`, `read_money` and `save_money`. Migration `20261101001300_money_mvp.sql` normalizes classifications, paychecks/templates/defaults, allocations, transactions/splits/tags, cards/payments, bills and recurring definitions/versions. Owner-safe foreign keys, owner-read RLS, RPC-only writes, an owner-level compare-and-swap revision, command receipts and deleted-ID tombstones protect atomic changes and retries. Account export includes Money; administrator auth-user deletion cascades through its dependent records. The existing self-service account deletion UI remains unavailable. No sample data is copied into accounts.

Approved card basis: explicit user-entered signed opening cents at the **start** of a local date; only purchases/payments on or after it affect the derived current balance. Reporting periods never change that balance. Integer cents remain exact within validated client-safe bounds, with USD modeled explicitly. Dates remain `date`, capture timezone comes from the saved IANA profile, and server metadata uses UTC timestamps. Templates contain intent, not actuals; recurring projections never manufacture charges or rewrite recorded bills/transactions.

This checkpoint supersedes older session-only Money statements. It does not claim the full future blueprint is implemented: immutable transaction audit trails, per-record collaboration/merge, normalized-name uniqueness, generated paycheck schedules/bill occurrences, refund/currency semantics and historical balance series remain outside existing UI/MVP scope. Current definition-version snapshots are not a future effective-dated recurrence editor. See [MONEY_PERSISTENCE](MONEY_PERSISTENCE.md) for verification, bounded snapshot transport and local readiness.

## Daily experience UI Session 1 — implemented

Daily Edit now includes the approved asymmetric Forecast/Priorities + internally scrolling Little Rituals composition. Little Rituals uses the existing authoritative provider, opportunity calculation, three-state binary cycle and quantity/duration/weekly editor; date-specific changes are shared with Rituals. Vertical priority rows and standard capture retain the existing Planner integration. Today's Plan has secondary actions, no redundant Planner badge and footer recovery/status.

Mood has matched reflection/Emotional Landscape surfaces, compact history controls, one selected seven-day Dayprint and four editorial areas (The Day/Morning/Evening/Day Summary). Actual Wellness activities and saved hydration snapshots appear when recorded; priorities no longer display but their records are untouched. Long reflections remain fully accessible. Summary calculations are unchanged with compact presentation and human observation counts. Ritual accent/banner editing remains independent. Implementation, dependency audit, boundaries and validation: [UI_SESSION_1](UI_SESSION_1.md). UI Sessions 2–3 remain deferred for review.

## UI Session 2 — implemented

Shared scoped footer save indicators preserve existing recovery, standalone actions use secondary/ghost hierarchy, and shared header top air increases without moving sidebar tracks. Money has aligned Spending/Plan / Actual, full-width Recurring, column-aligned metrics, readable financial typography and right-aligned Past Paychecks. Approved Wellness name/heart-pulse/mantra reuse the existing `/nourish` route and data. Login uses exact approved editorial copy and removes its development-preview link without auth changes. Disco replaces its literal mirrorball with maximalist holographic foil/refraction/glitter, preserving material/Magic/reduced-motion controls and other palettes. Audit evidence, files and validation: [UI_SESSION_2](UI_SESSION_2.md). Session 3 remains unimplemented in this pass.

## Final Daily Edit layout refinement — implemented

Existing components are recomposed at the parent level: top Forecast/Priorities +24px-shorter desktop Little Rituals; middle Movement → Water → Meals left, natural-height Plan right; bottom Mood/Pulse then Day in Three. An explicit shared-layout presentation variant scopes the reflection order to Daily Edit and preserves the Mood page's default layout. Existing880px stacking, card surfaces, Session 2 header spacing, capture/loading/recovery and all Planner/Wellness/Ritual relationships remain. No duplicate card instances, new records, data integration or schema changes.

Final layout verification:268 tests, TypeScript, ESLint and production build passed. After Docker/Supabase recovered, authenticated local-browser checks passed for the24px Rituals reduction/internal scrolling, care-stack/Plan alignment, reflection ordering, unique card instances, three linked priorities/limit, shared Ritual completion/missed/clear and failed-save retry, responsive containment, nine themes and both materials. Disposable test records were removed; no persistence or domain logic changed.

## Insights engineering — implemented authoritative integration

All five existing views now consume the completed authenticated owners with source-specific readiness/retry, typed read-only adaptation and memoized calculations. Historical date inspection fetches its own daily record; intention/Day in Three/Pulse/M/E and actual Wellness data remain with their owners. Recorded movement supplements the existing intention series. Daily Pulse normalization, Money missing-date/comparison handling and canonical unassigned-split drilldown are corrected; revelation evidence thresholds are tightened. A minimal shared daily read-order regression fix preserves newer overlapping reads without changing write/conflict semantics. No schema/migration or analytics tables. Metric contracts, unavailable capabilities and278-test/API/browser validation: [INSIGHTS_PERSISTENCE](INSIGHTS_PERSISTENCE.md). This supersedes older prototype-source statements; UI Session 3 presentation remains deferred.


## UI Session 3 — implemented

Insights Inspect a Date now shares the Previous Period row. The existing accessible drawer uses a reusable themed calendar with month/year navigation, Today, historical selection, roving keyboard focus and Escape/focus return; data retrieval is unchanged. Shared revelations use ghost navigation and accessible evidence disclosures. Money-only observations and totals are excluded from personal Overview and surfaced in Insights → Money, using existing calculations. Daily Edit uses independent authored column stacks and one shared card-gap token; Little Rituals and Plan no longer stretch, and Day in Three occupies the left reflection track. This supersedes the earlier24px reduction/full-width Day in Three presentation, without changing owners or workflows. Details and actual validation: [UI_SESSION_3](UI_SESSION_3.md).

## Disco blacklight identity — implemented

Only `disco-damage` receives the near-black foundation, neutral Crystal/Frosted surfaces, concentrated cyan/lime/pink/UV/orange reflections, vivid icon/progress/selected-state roles and restrained neon glow. Passive rainbow card fills and the looping prism sweep are removed. Registry ID and all layout/data behavior remain; other eight theme blocks and shared material rules are unchanged. Sixteen relevant theme/layout/UI tests, TypeScript, lint and production build passed; local authenticated browser checks passed on Daily Edit, Planner, Insights, Money and Wellness in Crystal/Frosted, with1440/1100/768/390px containment, selected Movement, calendar keyboard focus/Escape and reduced motion. Disposable QA accounts were removed. No manual screen-reader or exhaustive contrast audit is claimed.


## Final Daily Edit / ISSYA BDAY! light repair — implemented

This supersedes Session 3's separate reflection region: Mood/Pulse/Day in Three are consecutive existing cards in Daily Edit's right stack after Rituals/Plan. Desktop remains8:5 independent tracks; existing880px content breakpoint gives the approved mobile order with Plan before Wellness. Card gaps remain `--grid-gap`; owner captures, read/write behavior and all widgets remain intact.

`issya-bday` alone receives opaque pearl/frosting surfaces, stronger dimensional outline/shadow roles and vivid neon semantic accents, preserving its background. All eight other theme blocks and shared material rules are unchanged. TypeScript/lint/build pass; full suite278/281 with three reproduced pre-existing protected Disco assertions. Exact evidence/remaining issues: [DAILY_EDIT_BIRTHDAY_REPAIR](DAILY_EDIT_BIRTHDAY_REPAIR.md).


## Final subtitle copy and broad Daily Edit reflection — implemented

All nine approved subtitles render in ThemeSwitcher and the mobile Appearance chooser, replacing short birthday captions without changing IDs/names/order/previews or paint. Daily Edit's upper cards remain in place; existing reflection cards return to a full-width side-by-side Mood/Pulse layout with proportional Day in Three directly beneath Mood. Natural heights, shared gap and existing responsive stacking/captures remain. Thirty-five focused tests, TypeScript, ESLint and production build pass; actual switching/persistence/wrapping/responsive browser checks pass. No reference screenshot was attached, so exact approved-image comparison is pending. See [THEME_PICKER_LAYOUT_RESTORATION](THEME_PICKER_LAYOUT_RESTORATION.md).


## Daily Edit explicit reference stacks — implemented

Parent placement follows the clarified reference, with the approved Reflection addition: Forecast/Priorities/Movement/Water/Mood/Reflection/Day in Three left, Rituals/Plan/Meals/Pulse right. Reflection has the Morning/Evening segmented toggle and uses the existing date/period Mood record, separate drafts and explicit Save/Discard behavior. The existing MoodCard, DayPulseCard and DayInThreeCard are rendered directly with the same DailyCapture owner boundary, not inside MoodCheckInLayout. Existing Wellness captures remain around their same cards. Ritual sizing/scrolling, persistence, theme values and card padding are unchanged. Responsive mobile progression uses the existing breakpoint and one gutter token. Earlier layout verification: [DAILY_EDIT_STACKS](DAILY_EDIT_STACKS.md).

## Production readiness Phase 1 — authentication and self-deletion

**Implemented and verified locally:** explicit canonical HTTPS application/Supabase origins for staging/production; paired loopback development endpoints; no request-derived or localhost fallback for missing configuration. Magic links remain invite-only (`shouldCreateUser:false` plus Supabase signup prohibition). No hosted environment was created or changed.

Settings now supports authenticated, same-origin, explicitly typed DELETE confirmation for the current account only. A server-only Auth admin hard delete invokes existing owner/dependency cascades in one Auth database transaction; no piecemeal domain cleanup or new migration. Success requires an acknowledged matching user or a verified missing-user response after uncertainty. Failed/unconfirmed operations do not claim success. Confirmed deletion clears project auth/PKCE/return cookies and HTTP cache, broadcasts a transient logout signal and fully navigates away to dispose private providers/drafts/router memory. Appearance preferences remain. Outstanding JWTs may remain cryptographically valid until expiry; server identity checks deny the removed account and owned records are gone.

These decisions supersede earlier phase statements that self-service deletion was unavailable. Export is offered before permanent deletion; backups follow the eventual deployment retention policy and are not promised immediate erasure. Storage/attachments are currently disabled; introducing them requires revisiting deletion orchestration. Hosted email, invitation administration, TLS/proxy behavior and actual deployment retention still require staging verification. See [PRODUCTION_READINESS_PHASE1](PRODUCTION_READINESS_PHASE1.md).

## Mindspace / Constellations — corrected independent collections

IMPLEMENTED LOCALLY: independent cards and hashtags with text/checklists/images, thumbnail preparation, private uploads/paste/drop, caption editing, pinning, optional in-app reminders, tag-owned color and confirmed deletion. Slim search, scrollable hashtag boards, anchored Add Tag/Edit Tags popovers, Lists/Reminders and combined tag/type/pin/search filters precede a compact count/View/Sort toolbar and cards. The single quick-capture composer is absent by default, opens between search and hashtags, and preserves drafts when closed. Card-level Accent and composer Theme Default controls are removed; legacy accent values remain stored. Left-packed, natural-height masonry cards with hashtags beneath card content and compact draft-based editing, plus Compact/List/Date/Hashtag grouping and sort preferences are browser-persisted. Mindspace omits the global date navigator in Notes and Constellations while keeping card/reminder dates. No OS or background reminder notifications are claimed. Notes retains its existing notebook/editor and its own records. No content is migrated or synchronized between them.

The hierarchy is header → tabs → search/plus → optional quick-capture composer → hashtag controls → board toolbar → cards → single bottom sync footer. Compact empty/no-results text replaces the old introductory panel. Migration 20261101001500_constellations_independent.sql and the private constellation-images bucket are local-only in this pass; hosted application requires separate approval. Whimsy routes and contracts are described in WHIMSY_FOUNDATION.md; Weekly Side Quests and Tarot are implemented locally; the other three experiences remain planned.

## Whimsy foundation — current local implementation

The original roadmap sections above record planning history. The current local implementation now has five protected foundation routes, separate persistent user records for each experience, an immutable content-version catalog, authenticated read/revision-checked write adapters, real Insights source projections, optional source-only widget projections, and a reading-habit contribution contract. Weekly Side Quests is implemented locally with its 200-entry published library, six-card draw with three reveal positions, selection/reroll, keyboard-accessible three-second hold, committed weekly dashboard, completion/undo, swaps, history, and saved draw preferences. Tarot now has a full local Reading Table, 78-card Grimoire and private Reading Journal. The Dreamscapes full screen and its opt-in Daily Edit preview are now implemented locally in the later Phase 3 section below. Fortunes is implemented locally in the later Phase 4 section below. Bookshelf, other Daily Edit widgets, and automatic Ritual writes remain deferred. The local-only migration and validation scope are documented in [WHIMSY_FOUNDATION](WHIMSY_FOUNDATION.md).

## Weekly Side Quests — local Phase 1

IMPLEMENTED LOCALLY: 200 distinct versioned quest entries, Surprise Me/A Little Balance/Choose Your Vibe draws, six unique face-down cards, individual reveal/reroll, exactly-three selection, hold-to-seal plus accessible alternative, persistent weekly dashboard, completion/undo, explicit swaps and past-week history. Preferred experience and vibe use a private owner-scoped revision-checked record. A Monday week is based on the saved IANA timezone; a new week offers a new draw without replacing history. Local migrations 20261102001800 through 20261102002000 add reference content, legacy week compatibility and preferences. The catalog and migrations are not applied to hosted environments in this task. The later Phase 3 section below supersedes Dreamscapes foundation status; the later Phase 4 section below supersedes Fortunes foundation status; Bookshelf remains a foundation surface.

## Tarot — local Phase 2

Implemented locally: a 78-card Rider–Waite–Smith 1909 reference deck with sourced public-domain artwork and unique educational meanings; one-card daily, three named three-card, five-card and free one-to-five-card readings; opt-in reversal preference; explicit journal saves; separate persisted daily draw; private personal interpretations and append-only follow-ups; study/reveal mode; journal search, date/card/spread/tag filters, timeline/calendar choice, and measured saved-reading insights. User data is owner-scoped through existing Whimsy records plus three new private Tarot tables. The local migrations 20261102002100–20261102002300 and generated types are not hosted yet. Additional decks, AI interpretation, and automatic Daily Edit widgets remain future work.

## Tarot Sanctuary table refinement — implemented locally (November 2026)

The Reading Table now uses a compact spread selector with a one-line purpose for each spread, a separate Reading Options popover for reversal preference, and a full-width atmospheric table. The eight face-down choices form a fan; chosen cards dock without changing their established save IDs. Revealed art is larger, with interpretation beside a single-card reading or below multi-card readings. Reflection is disclosed after reveal and expands on request. Skip Animation appears only during an active reveal/shuffle animation. Quiet and reduced-motion states keep the same card and save semantics without decorative motion. The 78-card source library, private daily draw, Grimoire, Journal, and persistence remain authoritative. This is a UI refinement; no new hosted migration or deck is implied.

## Dreamscapes Phase 3 — implemented locally (November 2026)

Dreamscapes has four internal sections: Dream Diary, Dream Decoder, Symbol Encyclopedia, and Dream Atlas. The Diary captures a short fragment with an editable dream date and optional title, classifications, shared Mood-vocabulary emotions, intensity, symbols, people, places, themes, tags, interpretation, and notes. Its timeline supports search, filters, sort, calendar navigation, editing, and confirmed deletion. The Decoder displays only associations, context, questions, personal meanings, and emotional details actually recorded with the selected dream; it does not claim AI interpretation. The Encyclopedia contains 36 original, versioned Muse symbol entries in 12 categories plus owner-created symbols and private personal meanings. The Atlas derives its calendar, month/week frequency, symbol, emotion, classification, lucid, and manually linked series summaries from saved dreams. Recurring series never infer membership from similarity alone.

The core dream entry uses the existing owner-scoped Whimsy save RPC, stable command IDs, expected revisions, saved IANA timezone, and separate dream date/capture timestamp. Migrations `20261102002400`–`20261102002600` add the original content library, owner-only personal symbols/meanings/series/links, and a corrected revision trigger. These migrations have been applied to **local development only**; hosted staging/production require a separately approved migration plan. Account export includes private Dreamscapes extras; account deletion cascades them. Existing source-backed Insights already reads dream frequency, symbol, emotion, and lucid counts without merging dream feelings into waking Mood.

**Not implemented in this phase:** external dream-symbol imports; automated whole-dream analysis; Dream Constellation graph; image/audio capture. Do not represent any of these as delivered UI. No external dataset interpretation text was copied because its reuse terms require further review.

The optional Dreamscapes Daily Edit card is off by default and appears only after the user enables it in the experience header’s Display popover. It shows a count for the selected date or a capture shortcut, never private dream excerpts. It occupies a normal card position after Day Pulse without changing the approved dashboard when off.

### Fortunes & Nonsense — implemented locally, hosted rollout pending

The four interactive experiences and shared saved collection are implemented with original versioned content, user-triggered opens, stable daily fortune assignment, additional independent draws, explicit saves with historical snapshots, private notes, source links, search/filter/sort, optional Daily Edit widget, and source-backed Whimsy Insights counts. The current library is intentionally smaller than the aspirational editorial target: 24 cookies, 20 Oracle responses, 24 prophecies, 13 verified curiosities. See [WHIMSY_FOUNDATION](WHIMSY_FOUNDATION.md) for the local-only migration and deployment boundary. Further content expansion and browser visual verification remain planned.

Targeted Fortunes polish is implemented locally: dark secondary action labels on cream cookie results, a gradient primary save, one shared eight-category curiosity accent map, twelve-item filtered Cabinet batches with keyboard focus on newly revealed entries, and a responsive three/two/one-column keepsake collection. Native card disclosures retain full saved snapshots, questions, notes, safe original source links, and reopen/remove actions; note editing has explicit Save/Cancel and retains its draft after failed saves. Existing collection search, type/category filters, ordering, catalog records, persistence commands, and schema are preserved. Saved dates now reflect `savedAt` in the record's timezone rather than the original draw date. Hosted verification/deployment remains pending. The isolated `test:fortunes-ui` Chrome fixture checks responsive theme/material layouts, cookie contrast and interaction states, category outlines, and native disclosure keyboard navigation without accessing private records; use `--production` to verify emitted CSS after a build.

### Bookshelf — implemented locally, hosted rollout pending

The protected Whimsy Bookshelf route now provides Reading Desk, My Shelf, and Reading Atlas, backed by existing owner-owned books, sessions, goals, and a new one-timer-per-owner persistence record. Book CRUD/status/reviews, manual session CRUD, timer start/pause/resume/finish/cancel, derived reading metrics, period series, calendar, goals, opt-in Daily Edit projection, and source-only Insights reading totals are implemented locally. Pauses do not count; reading position and logged pages are distinct; historical records remain dated in the saved IANA zone. Manual entry rejects ambiguous or nonexistent DST local times. Book metadata lookup, automatic Ritual completion, and hosted rollout remain planned. The Grand Collection editorial files now complete the four fictional target counts (500 quests and 365 each of Cookies, Oracle answers and Tiny Prophecies), plus 100 source-linked Curiosities. Another 150 Curiosities remain research work. All 1,414 new entries remain drafts; none is published or selectable. Exact counts, Creative subquota exceptions, legacy metadata enrichment and review/import boundaries are documented in `content/whimsy/CONTENT_PROGRESS.json` and `content/whimsy/EDITORIAL_REVIEW.md`.

### Bookshelf / Fortunes polish and widget controls — local implementation

Bookshelf preserves manual book entry, current cover URLs/fallbacks, all book/session/goal relationships, and timer recovery. The grouped editor scrolls within its existing modal. Reading Desk distinguishes Want to Read from active reading, My Shelf retains search/filter/sort, and Reading Atlas presents the existing source-derived measurements with responsive progress charts and a weekday-aligned calendar. Added timestamps display in the saved timezone; start dates and actual reading days are separate. Existing reading and Insights calculations remain unchanged.

Bookshelf, Fortunes and Dreamscapes expose their existing saved Daily Edit preferences through one header Display popover and Show on Daily Edit switch. Old bottom checkbox controls are removed. Defaults and database contracts are unchanged; failed saves remain handled by each existing owner/retry path. There is no new dashboard customization store.

Fortunes replaces duplicate experience selectors with one navigation system and ties original SVG objects to the existing draw actions and persisted reveals. Cookie halves separate around a paper slip, Oracle light reacts, the sealed letter opens, and the cabinet drawer reveals a glint. Results retain daily assignments, saved snapshots, sources, notes, copy/share and collection controls. Animations respect reduced motion and Muse Quiet. No bulk content is published by this UI pass. Hosted changes remain separately authorized.

### Whimsy consistency and Tarot artwork / Study polish — local only

The five experiences share header spacing and context placement. Tarot preserves the default `rws1909` deck and all 78 definitions, draw/save/history behavior, and detail editing. The redundant visible deck-name metadata is removed from the experience header. Reading Table controls align in a responsive toolbar; Grimoire search, filters and Study Mode are grouped; Journal filters and view selection align together. Study is a local learning view with one orientation-selectable meaning panel, image-readiness-aware observation/symbolism, reveal/hide, previous/next and another-card actions. Study retains random selection from the complete deck and does not create saved readings. Library search/suit filters are preserved when entering and exiting the focused study view.

The shared Whimsy page grid now explicitly uses one column and full-width direct sections. This prevents the Weekly Side Quests first-draw card's dashboard span from creating implicit columns and placing the parent heading, navigation, and experience heading side by side. The correction is implemented locally; signed-in staging verification remains pending. See [WHIMSY_HEADER_LAYOUT_FIX](WHIMSY_HEADER_LAYOUT_FIX.md) for the reproduction and build comparison.

The missing-artwork defect was reproduced locally: the protected image source redirected unauthenticated optimizer requests, which returned an invalid internal image response. Session-aware direct browser loading resolves that request-path mismatch without changing auth protection, source assets, deck IDs or metadata. Image failure still has an honest fallback; Study offers retry and withholds image-specific prompts until loading succeeds.

The previous Fortunes SVG illustrations remain part of the uncommitted local UI pass, while committed source still uses placeholder glyphs. This pass retains the actual illustrations across sealed/revealed states and adds visible Oracle hold progress; it does not deploy them. Display preferences and existing database writes remain unchanged. No hosted migration or content publication is included.

## Cosmic Observatory horoscopes — required / provider review reopened

**APPROVED/PLANNED:** real daily, weekly and monthly forecasts for all twelve signs, shared by the Observatory and the existing Daily Edit forecast where applicable. No recurring provider subscription. Prioritize FreeHoroscopeAPI for written content while retaining approved no-cost local natal calculations. Unsupported life-area forecasts must remain unavailable rather than fabricated. Authenticated web/PWA use, actual freshness, attribution, cache policy and private saved-forecast rights are activation gates. Earlier exploratory/deferred provider language does not remove this requirement. **NOT ACTIVATED:** no live provider integration or deployment is approved by the investigation. Current findings and public sign-only checks: [ASTROLOGY_PROVIDER_RESEARCH](ASTROLOGY_PROVIDER_RESEARCH.md).

### Cosmic Observatory — implemented locally, provider pending

The protected sixth Whimsy destination has five connected content sections: Horoscopes, Birth Chart, Astrology Library, Cosmic Calendar and Cosmic Journal. My Cosmic Profile opens from the Observatory header as a settings modal with progressively disclosed preferences, birth details and privacy controls. Horoscopes is the default content view. The `view` query preserves direct links, refresh and Back/Forward navigation. The four independent sections beyond Horoscopes are backed by local calculations, full original reference entries and private owner records. Forecast sign/period selection and explicit saved-default controls use the normalized service shared with the existing Daily Edit card, but no provider-generated reading is displayed or stored until approval. The three periods remain a product requirement; unsupported life-area categories are unavailable. Temporarily browsing another sign does not alter the account default.

Birth-chart computation reuses the pinned local Astronomy Engine and existing account/persistence architecture. Tropical zodiac and Whole Sign houses are explicit. Missing or uncertain birth time/place yields labeled possible or unavailable placements; no invented ascendant/houses. Chart, library and calendar details open complete interpretations directly and can seed private journal reflections. The library contains 58 substantive **editorial drafts**, not approved published copy. The calendar currently includes verified phases and seasons only. Insights/recap use owner-derived activity, without birth data or causal mood claims. Exact local verification and provider blockers are in [COSMIC_OBSERVATORY_IMPLEMENTATION](COSMIC_OBSERVATORY_IMPLEMENTATION.md).

### Whimsy visual and interaction polish — implemented locally

Whimsy destinations live directly in the sidebar's Whimsy group: Astrology (Cosmic Observatory, opening on Horoscopes), Tarot, Dreams (Dreamscapes) and Fortune & Fun. Fortune & Fun opens Weekly Side Quests and uses one tab row: Weekly Side Quests, Fortune Cookie, The Oracle, Tiny Prophecies, Curiosities and Your Collection (approved November 2026, replacing the Side Quests / Fortunes & Nonsense switcher with a second fortune tab row); `/whimsy/fortunes` still opens Fortune Cookie and `?view=` opens a specific tab; existing routes and deep links are unchanged. The base `/whimsy` overview route still resolves but is no longer linked from navigation. Bookshelf is now presented under Collections locally; the old route redirects and its underlying records remain intact. Tarot has a compact reading setup, six spread diagrams, actual card images in its saved-reading gallery, and revision-safe editing of reflection and tags without changing drawn cards. Dream Diary uses compact reading cards and a full-detail view that opens the Decoder directly. The Decoder uses a bounded, searchable and filterable picker, recorded-only symbol and emotion connections, optional prompts, and revision-safe direct reflection saving. The Atlas links returning symbols to the existing encyclopedia. Fortunes collection keeps its saved snapshots, notes and source links while gaining category-aware artifact decoration. Bookshelf offers direct status movement on desk, shelf and detail, plus a Want to Read picker when the Reading Desk is empty; reading sessions and identity remain with the canonical book.

The Observatory retains the unselected forecast provider and shared Daily Edit service. Its Horoscopes sign picker is compact, temporary browsing is distinct from the saved default, and reference details display complete content with a direct Cosmic Journal action. The calculated wheel opens linked sign, house, planet and aspect details by pointer or keyboard, with full text alternatives and uncertainty labels. Selecting a sign in the wheel also identifies the same sign in the placement list; calculated planets and aspects retain their existing data.

The Library opens on an Explore view with seven entry collections, curated links to existing complete entries, and recently viewed entries derived from actual activity. All Entries retains search, category filtering, sorting and density. The Calendar uses the existing calculated phase and season events in both a local-date month grid and a timeline, with a current featured event, factual and interpretive detail, related Library links, and direct journal reflection. It does not add unverified event types. The revised free-forecast candidate ranking and unresolved rights questions are in [ASTROLOGY_FREE_FORECAST_EVALUATION](ASTROLOGY_FREE_FORECAST_EVALUATION.md). No hosted migration, deployment, external birth-data transfer, or provider activation is part of this polish.

**CosmyDay MVP implemented on feature branch:** authenticated daily, weekly and monthly overview readings for each sign, shared across Daily Edit and Observatory. The reader's local date is checked against provider period metadata on the server. Current text has visible CosmyDay attribution and a short in-memory cache only. Missing or mismatched provider periods show unavailable. No migration, saved text or Production deployment accompanies this branch.

**Structured horoscope reading, implemented locally:** CosmyDay’s period-specific labelled content blocks appear as separate editorial sections. Unlabelled introductions, datelines, closing copy, and structured key dates remain visible with original wording; unfamiliar formatting stays as prose. The first overview or introduction has stronger hierarchy, and supporting sections use a responsive two-column grid. Daily Edit keeps a compact excerpt and expands to the same complete reading. Sections are parsed from the actual response rather than a fixed category list. Source attribution and current-period validation remain unchanged.

## Sidebar navigation and Collections placement — local refinement

Implemented locally: the desktop sidebar uses a single full-height scroll region for brand, grouped navigation, theme picker, and compact Settings/Sign Out controls. The utility controls retain their routes/actions, labels, tooltips and touch targets; active and hover treatments remain distinct. Existing mobile navigation and the portaled theme menu remain the functional paths. Collections is approved for a future top-level Life position between Mindspace and Whimsy, with Overview, Books, Movies, TV Shows, Games and My Collections planned. It is not linked until functional. Bookshelf remains in Whimsy, with its records and deep links unchanged.

## Tarot Grimoire editorial integration and Dream Encyclopedia pages — local draft (November 2026)

The seven owner-supplied Tarot JSON batches are retained verbatim in `content/whimsy/grimoire/source`. A read-only adapter maps all 78 entries to canonical card IDs and the six chapters: The Story, Symbolism, Meanings, In Your Life, Hidden Knowledge, and Reflection. The provisional Swords court IDs map to existing numeric IDs without changing saved readings or artwork. Full-page, bookmarkable Grimoire entries support chapter navigation, upright/reversed reading, Read Full Entry, sources, personal meanings, breadcrumbs, and return links from the reading table, Study Mode, Grimoire, and saved Reading Journal. The current manuscripts remain marked **draft** and require editorial approval before publication or deployment. See `TAROT_GRIMOIRE_EDITORIAL_AUDIT.md` for coverage and gaps.

Dreamscapes has full-page symbol entries linked from the existing Encyclopedia, Decoder, Diary, and Atlas. The existing 36 reference symbols, owner-created symbols, private meanings, and saved dream links are reused. Six chapter slots expose only source-backed content; missing variations, origins, and related links are identified as unavailable. No dream-symbol content is generated. (Superseded November 2026: the HeartYearning Dream Symbols Dataset is imported with attribution; see “Dream symbol library and credits”.) The existing Dream Diary and decoder records remain separate and unchanged. No schema change accompanies either page experience.

Swords draft display keywords and related-card suggestions live in a separate `swords-editorial-v1.json` overlay, linked by existing canonical IDs. The seven owner-supplied JSON batches remain untouched. These editorial additions are visible in the local Grimoire for review and remain `draft-awaiting-creative-review` until approved; they do not establish new historical correspondences or overwrite chapter text.

## UI Polish Batch 2 — implemented locally

Daily Edit linked priority completion uses the canonical Planner task action, so completing it in either surface updates the checkbox and count. The Daily Edit plan preview excludes priority-designated tasks while the full Planner retains them. Weekly Side Quests computes days remaining from the selected week start and current local date, with final-day and expired states. Cosmic Forecast, Wellness week controls, Planner toolbar/height, primary and secondary navigation, and status-footer visibility receive layout-only refinements. Planner Board Settings manages Workspace and Tag names/colors through existing records; older workspace-scoped Groups remain visible and editable as legacy tags rather than being deleted. New Tags remain independent of Workspaces. No schema migration or new persistence owner is introduced.

## UI Polish Batch 3 — implemented locally

Books opens with Reading Desk followed by My Library; Reading Atlas remains available separately. The desk selects all Currently Reading books from the same saved records shown in the library, while preserving timer, manual sessions, details, progress and status changes. Movies, TV Shows and Games feature their existing Watching or Playing items above the full catalog. Book editing uses compact sections, a larger cover preview and an explicit deletion confirmation that names the book and its sessions. Collections Add actions share the theme-aware primary button. Dream Diary places compact Timeline and Calendar controls alongside search and filters. Observatory keeps its saved-sign card and stacks Explore Sign above Change Sign beside it; the header profile button opens the existing settings modal. No data model or migration changes accompany this batch.

## UI Polish Batch 4 — implemented locally

Daily Edit places its optional Bookshelf widget above Little Rituals and projects one selected current book, with cover, author, progress, timer start and a link to the canonical Collections record. The selection is stored in the existing Whimsy widget preference payload; no migration is required. The Daily Edit Cosmic Forecast removes repeated display dates, shows the sign glyph, and keeps visible CosmyDay attribution. Weekly Side Quest cards retain reveal motion with stronger surfaces and an explicit Chosen marker. The Tarot Reading Table groups intention, spread and icon-only options controls. Cosmic Calendar and Journal use compact controls; Wellness week navigation aligns its day selector right. Day in Three detects unsupported emoji before rendering their glyph and uses the same fallback for saved choices. The Collections active shelf displays all active records through a three/two/one-card responsive carousel with arrows and touch scrolling; full libraries remain below.

## UI Polish Batch 5 — implemented locally

Collections Overview gives Search the flexible space and uses compact Muse choice menus for status, sorting, genre, rating and series. Added and completed date filters use the Muse calendar with a clear action. Reading Desk keeps its active-book carousel while arranging cover, progress, existing metadata and actions in compact cards. Planner task cards place the saved-color workspace icon next to independently editable tags. Workspace and tag selection and management have separate controls; no task data or tag relationship is migrated or deleted.

## Collections issue #9 — implemented on feature branch

The existing Collections Overview is the default single library surface. Board/Library, search, media chips, status/sort, and advanced filters share one compact toolbar. A collapsed advanced panel retains applied values and can clear filters. Per-user defaults for opening mode, media filter, and optional In Progress shelf live in Supabase Auth user metadata; browsing choices remain session-local. The shelf reuses canonical book/media records and the shared active-media carousel, linking into existing detail and tracking views. The previous `?view=` links continue to resolve, and Books has a contextual Reading Atlas action. Series and My Collections remain available as contextual destinations. Media editors share Book-like sections and sticky actions; Games moves less frequent fields under Additional Details. Books and media use curated searchable genre choices while retaining unfamiliar stored genre values. The Book editor adds five-star selection and the existing up-to-three emoji picker, and suggests local dates on first Reading/Finished status selection. No schema migration, record conversion, or new tracking system is introduced.

## Collections Book and TV series — implemented and migrated locally

Existing series memberships now provide Book detail links into a dedicated series detail within the contextual Series route. The detail shows ordered canonical books, covers, author, status, rating, progress and direct links back to each book. An explicit conclusion state separates Caught Up from Completed. TV shows keep their existing media and episode records and gain optional season summaries with manual released/watched counts, a one-episode increment for manual seasons, and a whole-season action. Released season and episode progress excludes announced content. Episode tracking remains optional; existing activity is preserved. The migration adds conclusion state to series and media plus owner-scoped season summaries; it was applied and checked in local Supabase only. It has not been applied to hosted environments or deployed.

## Installed app and Disco Damage branding — implemented on feature branch

Muse ships a web app manifest (`app/manifest.ts`) so it can be installed and opens standalone, including iPhone Add to Home Screen. The approved Disco Damage Muse artwork supplies the 192/512 app icons, a maskable 512 icon with the wordmark inside the safe zone, and the 180 Apple touch icon, all on the near-black `#050507`. The separate neon-star artwork supplies `favicon.ico` (16/32/48) and the 16/32 PNG favicons. The manifest launch and theme colors use `#050507`; the browser/status-bar `theme-color` then follows the active Muse theme background. The iOS status bar uses the default style, so content stays below it and the existing viewport is unchanged. Icons and the manifest are public assets outside the sign-in proxy. No service worker or offline caching is registered.

## Smart book search and metadata — implemented on feature branch

Add a book (new books only) can search by title, author, ISBN-10 or ISBN-13 through authenticated Muse routes (`/api/books/search`, `/api/books/editions`). Google Books is primary when the server-only `GOOGLE_BOOKS_API_KEY` is set; Open Library runs in parallel as the keyless fallback and edition source. Results are deduplicated by ISBN-13 and by title plus first author, debounced (350 ms), time-limited (6 s per provider), cached briefly in memory and rate-limited per reader. Choosing a book fills title, author, mapped genres, cover, page count, format, ISBN, publisher, publication date and description; choosing an edition updates its cover, pages, ISBN, publisher, date and format. The chosen cover URL is saved like any manual cover and appears everywhere books show covers. Optional book fields `isbn`, `publisher`, `publishedDate`, `description` and `metadataSource` live in the existing book payload; no migration is required. Uploading cover image files is deferred.


## Reading tracker essentials — implemented on feature branch

Phase A (integrity) and Phase B (core statistics) of the reading tracker audit. Forgotten-timer recovery (`TimerRecovery`), device-held unsynced timer commands (`lib/whimsy/timer-pending.ts`), reread sessions (`reread`), completion history (`completions`) and archiving (`archivedAt`) are optional fields in the existing book, session and timer payloads; no table changes. The one migration, `20261105000100_whimsy_paged_reads.sql`, adds `read_whimsy_page` and `read_whimsy_record` plus owner/created indexes; `read_whimsy` is unchanged for already-deployed clients, and the client falls back to it until the migration is applied. Statistics live in `lib/whimsy/reading-stats.ts`. Reading Atlas adds a Today/This week/This month/This year/All time selector, reading time, pages, books finished (titles and rereads), reading days, sessions and longest session, average session, pace, streaks, reading days per week/month/year, weekly time and monthly pages charts, per-book percent/pages left/pace/time-left, inclusive calendar days, and filterable session history with edit and delete. Local database checks: `npm run test:bookshelf:db`, `npm run test:reading:db`; hosted read-only check: `scripts/verify-hosted-reading.sql`.

## Reading cycles and Finish Book — implemented on feature branch

P0 of the Reading Atlas fun-analytics plan. `lib/whimsy/reading-cycles.ts` holds read ids, session attribution, per-read statistics, opinion preservation, `shelfMove` and `editorReadFields`. Moving a book to Finished (shelf menu or book details), or reaching the last page in a timed or manual session, opens **Finish Book** (`FinishBook.tsx`): cover, title, editable finish date, optional rating, Book in Three Emojis (0–3, shared picker via `BookEmojiPicker.tsx`), final thoughts for this read, Save / Skip details / Cancel. Edit book lists every finished read under **Earlier reads** (`EarlierReads.tsx`) with dates, rating, review and that read's sessions, time, pages, pace and inclusive days, plus any preserved older rating to assign. Book details show **Your reads** (`ReadHistory.tsx`) and sessions not linked to a read. Session forms offer **Which read?** for books with several reads. Tests: `tests/reading-cycles.test.mjs`; local two-device database check: `npm run test:cycles:db`.

## Reading DNA, milestones and Year in Review — implemented on feature branch

P1 and P2 of the Reading Atlas fun-analytics plan, together. `lib/whimsy/reading-dna.ts` holds genre breakdown and favorites, emoji ranking and Year in Three Emojis, habits (weekday, month, local reading hour, consistency), superlatives, genre personality and behavior traits, milestones with celebration rules, and the year review. Reading Atlas sections: `components/whimsy/atlas/ReadingDNA.tsx`, `BooksMilestones.tsx`, `YearInReview.tsx`, shared `parts.tsx`; the section selector, period selector and milestone celebration live in `ReadingAtlas.tsx`. Milestone celebration state is saved on the Bookshelf widget preference (`bookshelfWidgetExtras` keeps it, and the featured book, on every write). Tests: `tests/reading-dna.test.mjs`; local two-device database check: `npm run test:milestones:db`. Shareable images, genre aliases, per-read emojis and emoji trends by genre and year were added in #50 (below).


## Bookshelf & Reading Atlas final polish (#50) — implemented on feature branch

One PR, four phases, no migration. **A:** `canonicalGenre` aliases for statistics (`lib/collections/genres.ts`, `bookGenres`/`genreKey` in `lib/whimsy/books.ts`); per-read emojis on `BookCompletion.emojis` with `readEmojis`/`withReadEmojis` in `reading-cycles.ts`, editable per read in Book details (`ReadHistory.tsx`), Finish Book starting rereads empty, and unassigned legacy emojis kept in `unassignedEmojis`. **B:** Reading Challenge (`lib/whimsy/reading-challenge.ts`, `components/whimsy/atlas/ReadingChallenge.tsx`) on the existing goals store, compact on Bookshelf and full in Atlas Overview, with a once-per-target celebration. **C:** Patterns section (`lib/whimsy/atlas-insights.ts`, `components/whimsy/atlas/Patterns.tsx`): ratings, weekday × hour heatmap with table alternative, formats, finish speed, authors, series (Collections' `seriesProgress`), emojis by genre and year, and tap-through book lists that open Book details. Year in Review shows per-read emojis. **D:** keepsake export (`lib/whimsy/keepsake.ts`, `components/whimsy/atlas/KeepsakeExport.tsx`): live preview on a canvas, year or all time, post or story shape, selectable sections with reviews off by default, saved locally as PNG. Tests: `tests/atlas-insights.test.mjs` (genre aliases, per-read emojis, challenge rules, every Patterns figure, keepsake privacy; sparse, multi-year, reread and time-zone cases) and the five-section render check in `tests/reading-dna.test.mjs`.

## Books, Wellness and Atlas polish — implemented on feature branch

Genre (and every choice menu) works on phones: full-width, scrollable, no keyboard pop-up. Book details: inline **Add to a series** (`components/whimsy/AddToSeries.tsx`) using the Collections series records — choose an existing book or mixed series with number and role, or create a series with the book as #1; an existing entry is updated rather than duplicated. Wellness opens on Mood and lists it first; meal links name `view=plan`. Atlas Overview layout rebalanced; monthly Reading rhythm rows show month and year. Dayprint Day Summary padding fixed. Tests: `tests/books-wellness-polish.test.mjs`.

## Dream symbol library and credits — implemented on feature branch

Issue #31. The Dream Encyclopedia combines Muse’s 36 original entries (unchanged) with the HeartYearning Dream Symbols Dataset (`content/whimsy/dream-symbols-heartyearning.json`, vendored verbatim from github.com/ljt-one/dream-symbols-dataset). `lib/whimsy/dreams.ts` maps its categories onto Muse’s twelve, leaves out zodiac/angel-number/crystal entries, keeps the first of any repeated name or slug, and attaches an entry whose name matches a Muse symbol or alias to that Muse entry instead of duplicating it (Falling, Flying, Snake). Imported ids are `hy-<slug>`, so saved dreams and private meanings keep working across dataset updates; no migration (dream `symbolIds` and personal meanings are keyed by text). Entry pages show sourced interpretations with their link, and Variations lists entries that contain the symbol’s name. The Encyclopedia list pages 60 at a time; the Diary symbol picker shows Muse and personal symbols until you search. Settings → **Open Source & Credits** (`lib/credits.ts`) lists every outside content source and library with its license and links.

## Dreamscapes refinement — implemented on feature branch

Issue #52 (sections 11–17). Dreamscapes is split into section components under `components/whimsy/dreams/` (Diary, Decoder, Library, Atlas, shared parts) with deterministic helpers in `lib/whimsy/dreams.ts` (pagination, display titles, month groups, symbol constellation, emotion pairs, monthly/weekday rhythm). **Diary:** search with live count, type chips, Filters (symbol, feeling), removable active-filter chips, month-grouped journal cards (type tints, intensity dots, symbol pills, series tag; the whole card opens the entry), 12 per page, calendar with nightly glows and that night's dreams. **Decoder:** manuscript header, atmosphere, symbol tray (selecting a symbol illuminates it and opens its lens with Muse associations, attributed HeartYearning interpretation, your meaning and other dreams), sticky reflection side panel. **Library:** field-guide hero search (press /), category chips with counts, A–Z bar, source filter (Muse/HeartYearning/Yours), “From your dreams” shelf, compact results 24 per page. **Symbol pages:** one continuous full entry with numbered chapters; empty chapters are left out (no chapter navigation). **Atlas:** stat pills, symbol constellation (stars = symbols in 2+ dreams, lines = pairs sharing 2+ dreams), emotional traces and pairs, 12-month and weekday rhythm, kinds of dreams, series ribbons; selecting any pattern reveals its dreams, paged. The Atlas calendar moved to the Diary’s Calendar view. No data, content or schema changes. Tests: `tests/dreamscapes-refinement.test.mjs`.


## Wellness Tracking 1.0: goals and Connected Rituals (#30) — implemented on feature branch

**Phase A audit (November 2026).**
- **Owners.** Wellness owns hydration days (one total per date, with that day's goal and unit), movement intentions (`movement_days`), completed movement records (`movement_records`, unique per type and date), movement types and meal assignments with optional nutrition. Rituals owns definitions and dated entries. Collections/Whimsy owns reading sessions and book completions. Planner owns tasks and completion events.
- **Daily Edit.** It edits these same records; it has no separate copy.
- **Not tracked.** Steps and sleep have no tracker and are listed as unsupported rather than invented. External health connections need separate approval.
- **Weeks.** Muse has no configurable week start; weeks are Monday-first everywhere.

**Implemented.**
- **Shared progress engine.** `lib/progress/engine.ts` turns authoritative records into dated measurements, with record ids, recorded/complete flags and day/week/month/year periods. Wellness goals, Connected Rituals and Insights all use it. A future Goals module can reuse it with its own targets.
- **Workout classification.**
  - Movement types are Strength, Cardio, Mobility or Other.
  - Starter types have code-level defaults (Upper/Lower Strength, Cardio/Walk Cardio, Yoga Mobility); custom types are Other until classified.
  - Categories are set under Movement → Manage.
- **Durations.** A completed activity may carry whole minutes (1–1440). A blank duration is unknown, never zero, and is reported as "untimed".
- **Wellness Goals** (Wellness → Goals):
  - Optional goals for workouts (day/week), strength or cardio workouts per week, workout minutes (day/week), and protein/calories/carbs/fat per day (at least or at most).
  - Each goal is versioned. A change applies from the current period and earlier periods keep their target.
  - Pause and Retire are versions too, so they are never failures. Goals are retired, not deleted.
  - Each period is Met, Below target, No complete record, In progress, Paused or Not tracking. Adherence counts decided periods only.
  - A meal missing the measured nutrient makes that day unknown.
- **Hydration.** It keeps its existing tracker goal (saved per day), so it is reported, not duplicated as a second goal.
- **Reporting.** The Goals view shows this week's tiles, goal cards with a 12-period strip, and a by-month table per year.
- **Connected Rituals:**
  - **Sources:** a Ritual can be manual or connected to water, workouts (any, a category or one type), workout minutes, reading minutes, pages read, books finished or tasks completed.
  - **Type compatibility:** check-offs accept any source with a threshold, durations accept minutes, and weekly targets accept counts.
  - **Derived values:** they are computed from source records and never stored. Edits and deletions recalculate them. Days without a record stay unknown, and connected cells are read-only and explain their source.
  - **Starting a connection:** a new connected Ritual reflects records from its start date; an existing Ritual connects from today.
  - **Changing or ending a connection:** the values that were shown are stored as ordinary entries, so history survives.
- **Shared aggregates.** `lib/wellness-aggregates.ts` provides period summaries, series and hydration history for Insights and Recaps.

**Data and migration.** `20261106000100_wellness_goals_connected_rituals.sql` is additive. It has been applied and tested locally only; staging and production need approval.
- **Schema:** adds `movement_types.category`, `movement_records.duration_minutes`, the `wellness_goals` and `wellness_goal_versions` tables, and `rituals.connection`.
- **Server rules:**
  - Past goal versions cannot be rewritten, backdated or deleted.
  - Clients that omit the new keys leave them untouched.
  - Connections are validated against the Ritual type.
- **Before the migration:** the app hides goals, durations, categories and connections and explains that a database update is needed.

**Not in this issue.** Steps, sleep, Apple Health and other providers; monthly Rituals; mood and money connections; a global Goals module.

## Insights 2.0 — Life at a Glance (#97) — implemented on feature branch (no migration)

Approved 2026-11-07 as one pass, reviewed at the end. A presentation-layer simplification: no data, table, calculation or module connection was removed.

**What shows now.** `/insights` renders `InsightsGlance` (`components/insights/glance/`, pure logic in `lib/insights/glance.ts`): one Day / Week / Month / Year selector (`.muse-segmented`), previous / Today / next, and the shared `PeriodTitle` day picker (styles moved to `components/planner/PeriodTitle.css` so Planner and Insights share them). The period is remembered per device (`muse.insights.period`); `?period=` and `?date=` links work.
- **Day:** the Dayprint (moved from Mood; read-only here, "Edit in Mood" links to `/mood?date=…`), the day's priorities with their recorded outcome, planned meals, and Bookshelf.
- **Week:** seven mini Dayprints (Day in Three, Overall Day bar, feeling-family dots; empty days dashed, future days faded, today ringed); tiles for Overall Day (with Energy/Stress), Priorities and Water; How it felt, Day in Three favorites, Bright days, Movement, Intentions; Bookshelf.
- **Month:** a calendar glowing by Overall Day (unrated days outlined, never shaded as zero) with each day's first Day in Three emoji, then the same cards.
- **Year:** month-by-month bars of the average Overall Day with the month's most-chosen Day in Three, then the same cards (no intentions list).
- **Bookshelf:** "Now reading" is the current nightstand (status reading, not archived), clearly labeled as current; "Reading this period" uses sessions dated in the period (time split at local midnight, pages on the session date), finished books by finish date. Progress shows as Percent, Pages or Time, saved on the account (`readingProgress` in the Insights preferences metadata, no migration). Time mode says "reading time, not progress"; a book without total pages never gets an invented percent.

**Data rules.** Every number comes from existing records: Daily Edit (`daily_records`, `daily_priorities`, check-ins via `emotionalRecords`), Wellness (water, recorded movement, planned meals) and Bookshelf. Averages count only recorded days and say how many. A recorded value is real even when low; a missing day is never zero. Priorities use the canonical `priorityCompletion` and keep done / open / not recorded apart. Water in different units is never totalled. A feeling counts once per check-in. Insights 2.0 writes nothing.

**What was hidden, where it lives, how to restore.** The detailed Insights (Overview, Plans & Rituals, Mood & Energy, Money, Wellness, Astrology, Collections, plus Customize, Inspect a date and period comparison) are unchanged in `components/insights/Insights.tsx` and its siblings, with their tests. They are hidden by `CLASSIC_INSIGHTS=false` in `lib/insights/flags.ts`; set it to true to make them the Insights page again (their `?view=` links then work). Mood still logs, edits, deletes and shares check-ins; its week history is now a compact check-in list with "Open Dayprint" links into Insights → Day.

**Polish pass (approved 2026-11-07).**
- **Layout:** one three-column grid with consistent gutters. Week rows stretch to equal height; Month and Year use three independent stacked columns so no card stretches into empty space; Day puts Priorities, Meals and Bookshelf in one row.
- **Today ring:** the rainbow ring stays on its own card. A reset had let it attach to the whole page as a permanent frame; that's fixed and tested.
- **Cards and controls:** bold headings with gradient icon badges, and pills instead of bare text links.
- **Explaining the visuals:** every visual mark (mini Dayprints, calendar days, month bars, yearly columns, Day Pulse capsules) has a hover/focus tip and an accessible label, plus a visible key so touch devices get the same explanation.
- **Day:** a new Dayprint portrait (`DayPortrait`) with Day in Three bubbles, an Overall Day ring, Energy/Stress capsules, an intention quote, water and movement, and morning/evening mood cards. "Daily Edit" and "Edit in Mood" pills lead to editing. The original `Dayprint` component is kept unchanged.
- **Month:** a compact calendar (about a third of the width). Movement shows workouts, active days, per week (workouts ÷ weeks elapsed so far) and counts by each type's saved category. Intentions appear as a dated list.
- **Year:** a five-number stat strip; month-by-month Overall Day; a year of feelings (stacked family columns); the year in emoji; monthly bars for movement, water (one unit, never mixed) and priorities done. Each has a compact empty state.
- **Bright days:** highlight cards with the rating, date and Day in Three. The optional "why it was bright" is the day's own Mood reflection (evening first, else morning). Without one there's an "Add why it was bright" pill to Mood. Nothing is generated and nothing new is stored.
- **Bookshelf:** compact in every period; book cards no wider than about 420px that wrap into rows.

**Out of scope:** Rituals analytics, Reflections, money/task/astrology/tarot analytics, rebuilding the old dashboards.

## Unified Insights, cross-module analytics and recap foundations (#32) — implemented on feature branch

**Phase A audit (November 2026).**
- **Existing Insights.** It already reported each module with distinct planned/actual/unknown states, revelations, descriptive Pearson relationships (minimum ten pairs) and Collections/Astrology sections.
- **Movement source.** The one movement relationship used intentions rather than completed records.
- **Gaps.** There was no macro view across modules, no Wellness goal reporting, no section personalization and no recap-ready aggregate.
- **Dependency on #30.** It is met by the shared progress engine and Wellness aggregates; nothing is recalculated in Insights.

**Implemented.**
- **Across Muse (Overview).**
  - One tile per module total for the selected range: tasks completed, full ritual goals and their share of logged opportunities, workouts by category, workout minutes with untimed count, reading time and books, mood check-ins, and recorded spending.
  - Each tile has a "How each is counted" definition, an optional previous-period difference and a link to its owner.
  - No combined score. Modules without records are omitted.
- **Wellness section.** Adds "Movement you recorded" (completed records by category, minutes, untimed sessions) and "Goals in this range". Goal results reuse #30's evaluation and count finished periods only. Hydration days met their own saved daily goal.
- **Plans & Rituals.** Shows how many full goals came from connected trackers versus manual check-offs.
- **Connections across Muse (Mood section).** Descriptive, side-by-side means on shared local dates:
  - Energy on days with recorded movement;
  - Overall Day on reading days;
  - Stress on days with 3+ completed tasks.
  
  Each needs five days on each side, shows sample sizes, and states that it is not cause and effect.
- **Customize Insights.** Hide sections (Overview always shows), choose the opening section and default period, and turn the Daily Edit goals glance on or off. Preferences are saved to the account (no migration), and hiding never removes records.
- **Daily Edit Goals glance.** A compact card with active Wellness goals for the selected date's period.
  - It appears only when a goal is active and the preference is on.
  - On mobile it sits right after Movement.
  - It logs nothing and reads the same records.
- **Recap-ready aggregates.** `recapFacts()` returns factual week/month/year summaries for tasks, ritual consistency (with connected count), Wellness (workouts, categories, minutes, hydration, goal adherence), reading, mood and spending. A source that did not load is `null`, not zero. Presentation is a separate, future approval.

**Not in this issue.** Animated or editorial Recaps, new trackers, Apple Health or bank connections, arbitrary scores, and a sidebar or Daily Edit redesign.

## Wellness goals follow-ups — implemented on feature branch

- **Planned nutrition labels.** Nutrition goals carry a `planned` basis. Their labels read "Protein (planned)" and so on. Their statuses are "Plan meets target", "Plan below target", "Plan incomplete" and "Planned so far". Cards note "From meals in your plan, not confirmed intake", and Insights and the Daily Edit glance use the same wording. Recorded goals keep "Met" and "Below target".
- **Documented limitation:** one completed workout per movement type per day (see PRODUCT_RULES).
- **Recaps:** engine only; the UI is deferred to Living Universe.
- **Scope note:** Wellness → Goals holds measurable wellness targets only and does not overlap the future Aspirations feature under Rituals.

## Invited-user onboarding (#29) — implemented on feature branch

- **When it appears.** A brand-new invited account opens **Welcome to Muse** before Daily Edit, based on `profiles.onboarded_at`.
  - The migration marks every existing account as onboarded, so no current user is sent through it.
  - Before the migration runs, Muse behaves exactly as before.
- **Steps.** Welcome, then Personalize (name; timezone detected from the device and changeable; theme and glass using the existing pickers, synced to the account once signed in), then a confirmation.
  - Nothing is saved until **Finish setup**, which is one idempotent save of name, timezone and completion.
  - A failed save keeps every choice and explains how to retry.
- **After setup.** Daily Edit shows a one-time, dismissible orientation (Planner, Rituals, Whimsy, Settings).
  - `/welcome` redirects finished accounts home.
  - Onboarding state is on the account, so it follows the person across devices.
- **Settings.** The display name can be edited in Settings (it was not editable before). Timezone stays in Settings and theme in Appearance.
- **Expired or used invitations** get their own guidance on the sign-in page.
- **Not changed.** The authentication model (invite-only, passwordless: Google, passkeys, email codes and links), row-level security and data ownership.
- **Tests.**
  - `tests/onboarding.test.mjs` covers the routing and save rules.
  - `scripts/test-local-onboarding.mjs` covers provisioning, persistence and isolation.
  - `scripts/test-onboarding-ui.mjs` runs the real-browser flow on mobile and desktop.
  - `scripts/test-local-auth.mjs` follows the real-inbox invitation through to onboarding.

- **Take Muse with you** (final step, optional): the real app icon, “A little magic, one tap away.”, and a collapsed “How to add Muse” guide chosen for the device (iPhone/iPad Safari, other iOS browsers with a Safari fallback, Android Chrome/Samsung/Firefox, desktop Chrome/Edge and Safari 17+; other desktop browsers see the phone steps). Uses the browser’s own install prompt when offered; hidden once Muse runs installed. The manifest uses relative `start_url`/`scope`, so the installed app opens at the address it was added from (hellomuse.life in production); no offline claims (no service worker).

## Muse Social (#16) and Personal Profiles & Showcase Studio (#26) — released November 2026

IMPLEMENTED (merged to main; migrations applied to staging and production):
- **Social foundation (#16)**: `social_identities` (username, display name, `avatar_id`, discoverable, participation), friend requests with one pending per pair, mutual friendships, blocking; security-definer commands for every lifecycle step; `can_view_as_friend()` shared authorization; `social_search` (opt-in, username only), `social_overview`. Friends page: friends, requests (incoming/outgoing), find people, blocked, discoverability and pause settings.
- **Profiles (#26)**: first-visit setup (avatar from 117 bundled illustrated characters in four groups, display name, username with live availability, profile theme), My Profile with Customize, New Showcase, Friends and Preview as a friend; customisation of portrait, name, username, tagline, about, profile theme, gradient banner, decorative badges, section order/visibility and sharing, with a live preview in the profile theme; friend profile at `/people/<username>`.
- **Polish pass (#64)**: 59 personality badges in six colour-coded categories, shown beside the name (outline in the category colour, icon kept); banner/border presets rebuilt as 22 vivid mesh blends with stars in two moods (Dreamy & luminous, Bold & electric; retired presets still render for existing choices); Showcase borders chosen from one swatch grid with a live preview; Gallery and Mixed show image-led tiles first and text-led items (Little Victories, rituals, side quests) as roomy cards; the sidebar's My Profile shows the chosen avatar in a sparkling gold ring; theme persistence fixed (pre-paint theme, no hydration flash, own pages keep their theme) with `npm run test:theme:ui`.
- **Showcase Studio**: starter ideas, title and line, icon picker (extended Muse icon set), 20 named gradient borders (dropdown and swatch gallery), five layouts (Gallery, Shelf, Spotlight, Collection cards, Mixed), item picker across eight modules with per-field approval and preview, captions, drag-and-drop and Alt+↑/↓ reordering, Update from source with before/after confirmation, drafts, Just me, Friends, delete.
- **Database**: migrations `20261109000100_social_foundation.sql` and `20261109000200_profiles_showcases.sql`; owner-only RLS on profile tables; `profile_view()` returns only the friend-facing view; `profile_lookup()` never reveals unavailable profiles.
- **Tests**: `scripts/test-local-social.mjs` (38 multi-account checks), `scripts/test-local-profiles.mjs` (22), `tests/social-profiles.test.mjs`, plus a two-account browser run.

FUTURE/EXPLORATORY: Stream (#27) reusing the identity, authorization and adapters; custom avatar uploads; selected tarot readings, dream moments and note excerpts as Showcase sources; notifications for friend requests.

## Theme Atelier — released November 2026 (work in progress; known issues being fixed in production)

IMPLEMENTED (merged to main; migration applied to staging and production):
- **Entry**: Settings → Appearance → Theme Atelier card; the quick theme picker stays in the rail and on Appearance.
- **Library** (`/appearance/atelier`): official themes (Remix / Apply), My themes and Drafts (Edit, Apply, Duplicate, Rename, Export, Delete with confirmation), Import a theme file. Cards are miniature pages drawn with each theme's own tokens.
- **Studio** (`/atelier?base=<theme>` or `?theme=<id>`): live preview of real Muse components in an isolated frame (sidebar with prismatic icons and states, atmosphere and stars, Daily Edit priorities, rituals with progress, Dreamscapes editorial panel, Tarot card, Bookshelf covers, buttons/segmented/chips/search/inputs, stats and charts, popover, dialog, empty states, type specimen); Desktop/Mobile (true breakpoints) and Crystal/Frosted preview; comparison with the original, last save or another theme; undo/redo (⌘Z/⇧⌘Z); reset to last save or original; save draft, save, save as new, export; Save & apply.
- **Sections**: Atmosphere (base colour, bloom/haze colours, layer stack with built-in and own layers, position pad, size/position/angle/opacity, gradient stop bar, tone brightness/saturation, vignette, Disco restore), Light & stars (density, brightness, glow, colours), Colours (accent roles, palette, text, interaction, charts), Glass (Crystal and Frosted surfaces), Icons & gradients (icon gradient colours, angle, middle stop, glow; hover, selected, navigation and completion gradients; progress), Readability (13 live WCAG checks with Adjust), Advanced (every token, validated).
- **Glows**: + Add Glow, on-canvas move/resize handles (hidden in normal preview), keyboard nudging, shape, reach, softness, blend.
- **Overall glow**: glow strength (to 400%), glow size, vividness and brightness act on every built-in light layer at once; handles appear on every built-in bloom, haze pool and Disco spill as well as on added glows, and clicking one opens it for editing. The preview scrolls to what is being edited (icon strip for Icons).
- **Drafts survive reloads**: unsaved work is kept in this browser and restored as one undoable step.
- **Export with intent and freezing**: exports carry the editable remix, a complete resolved snapshot (every token, every plane, glows, effects, compiled CSS) and a base fingerprint. The exporter asks what the file is for: a remix, a new official theme (name, description, light/dark, and explicit opt-in to Disco light, Disco glitter, Disco foil/chrome glass or birthday confetti), or an update to the base official theme (lists the saved remixes that would change, freezes them and keeps today's version as a frozen theme, both on by default). Library cards show Frozen, offer Freeze appearance and Keep a frozen copy, and warn when an unfrozen remix's base has changed. `node scripts/atelier-integrate.mjs <file>` turns a handed-over file into the theme block or the exact update diff (read-only).
- **Persistence**: `atelier_themes` and `appearance_preferences` (migration `20261108000100_theme_atelier.sql`), owner-only RLS.

FUTURE/EXPLORATORY: sharing themes between accounts; animated atmosphere controls (Muse Magic stays separate); rotated radial glows (not possible with CSS gradients); including themes in the personal data export.

## Stream of Consciousness (#27) — implemented on feature branch (`feature/stream-27`, awaiting review)

IMPLEMENTED (local; migration `20261110000100_stream.sql` applied to the local database only). Full consolidated
specification, architecture and known conflicts: [STREAM](STREAM.md).
- `/stream`: "[Name] is…" composer with optional flourishes and shortcuts (Reading, Watching, Feeling, Dreaming,
  Celebrating; More: Tarot, Side Quests, Rituals, Fortunes, Astrology, Money milestone); granular field consent with
  sensitive records unticked; Only me by default, Friends or Selected friends; preview before publishing; duplicate-safe.
- Chronological feed with the original filters (All, Reading & Watching, Life Updates, Whimsy, Celebrations), keyset
  "Show earlier moments", the "Quiet in the universe today" empty state, and a single-post view for notifications.
- Cards: literary, mystical, celebratory, feeling and classic status presentations; one contextual primary reaction plus
  Comment; spoilers; post options (edit, audience, comments on/off, unpublish to Only me, delete; report for others).
- Reactions with one-shot gestures per kind (React, Send Love, Share Joy, Cheer, Celebrate), gated by Muse Magic and
  reduced motion. Chronological comments with author moderation and reporting.
- In-app notifications (reactions, comments, friend requests, accepted requests) with per-category preferences; a
  Show Stream in navigation preference (Settings and Stream) that never changes posts or friendships.
- Share to Stream dialogs in Bookshelf, Dreamscapes and Tarot; friend profiles show recent Stream posts the viewer may see.
- Tests: `npm run test:stream:db` (79 multi-account checks), `npm run test:stream:ui` (18 browser checks), `tests/stream.test.mjs`.

## More Muse Magic (#34) — implemented on feature branch (`feature/more-muse-magic-animations-etc`, awaiting review)

IMPLEMENTED: motion tokens; Sound effects preference (Off by default) and a synthesized sound palette; the celebration orchestrator and layer (constellation, starburst, book ritual) with rotating copy; book completion ritual after a saved finish; three-star priority alignment; ritual chimes and streak tiers (3/7/14/30/100/365); water ripple and goal moment (existing gold finish kept); Side Quest seal and all-three moment; Tarot reveal and saved chimes; dream saved chime; Stream reaction chimes; press feedback, page arrival, modal lift, header twinkle and eased progress bars. Tests: `tests/muse-magic.test.mjs`.

NOT YET: reading-goal and other personal-goal constellations (no single goal-completion event yet); card-to-detail transitions; drag-and-drop lift/settle polish beyond existing behaviour; Dream Spotlight transitions.

## The Muse Almanac, part 1 (#53) — implemented on feature branch

Voice and content foundations only; nothing is shown in the app yet and no migration is needed. `docs/ALMANAC_VOICE.md` is the writers' guide. `lib/almanac/` holds the types (`types.ts`), the signal catalog naming every fact and the existing function that computes it (`signal-catalog.ts`), the enforceable voice rules shared with celebration copy (`voice-rules.ts`), a pure renderer with plurals, hours, durations, money and sections that drop out when a fact is missing or zero (`render.ts`), and the validator (`validate.ts`: schema, catalog fit, voice, sensitivity, length, exclamations, required evidence, near-duplicates). `content/almanac/` has seven approved families, 39 entries and 114 variants: reading traits, reading moments, rituals, the existing Little Revelations rewritten with their caveats, dreams and tarot, constellations, and weekly/monthly field notes. `npm run almanac` validates and `npm run almanac -- --review <file.html>` writes a review sheet. Tests: `tests/almanac.test.mjs`. 
**Runtime (P1–P5, same branch).** `lib/almanac/signals.ts` adapts existing functions into signals: reading (traits and persona now return their numbers as `facts`; milestones in the last week; streaks; challenge quarter crossings in the last two weeks; yearly records; authors; swift finishes; reading hour), rituals (scheduled streaks and returns after 7+ unmet opportunities), the seven Insights revelations (each now carries `signal`), cross-module comparisons, recaps, dream symbols and pairs, and recurring tarot cards. `lib/almanac/select.ts` is the pure selector (settings, dismissals, muted families, cooldowns, a stable day, seeded variants that never repeat back to back, one voice per signal, per-surface budgets by quietness). `lib/almanac/store.ts` keeps settings in auth user metadata (`muse_almanac_preferences`) and impressions in `almanac_impressions` (migration `20261113000100`, owner-only RLS, ids and dates only), falling back to device storage when the table is unavailable. UI: `components/almanac/` (`AlmanacWhisper`, `InsightsAlmanac` with `useVoicedRevelations`, `FieldNotes`, `Constellations`, and `AlmanacSettings` as Settings → Muse's observations). All 39 entries are published. Tests: `tests/almanac-runtime.test.mjs` (selector rules and a 365-day simulation, adapters, settings parsing, wiring and storage shape).

## Aspirations (#54) — implemented on feature branch

Migration `20261114000100_aspirations.sql`: owner-only `aspirations` (milestones as JSON, habit/task ids, connection, celebrated thresholds, revision via the Collections touch trigger) and append-only `aspiration_updates` (a trigger checks the aspiration belongs to the same person). Pure logic in `lib/aspirations/` (`models.ts`, `progress.ts`: progress for each kind, timeframe filters and default dates, attention lists, sorting, habit consistency, stats, history, thresholds; `persistence.ts` with revision-checked writes). UI in `components/rituals/aspirations/` (`Aspirations` home with stats, coming up and recently done, timeframe filter, grouping, sorting, a connected Reading Challenge card, a monthly "step by step" chart, completed and archived sections; `AspirationEditor` with progressive disclosure; `AspirationDetail` with progress, record progress, milestones with reorder, supporting habits, Planner task links, journal, complete/pause/archive/delete). Rituals gains Habits/Aspirations tabs. Almanac: four aspiration signals and the `aspirations` family; celebration copy gains aspiration lines. Tests: `tests/aspirations.test.mjs`.

**Wrap-up (same issue).** Milestone detail editing (`MilestoneForm` in `AspirationDetail`), renewal (`nextPeriod`, `renewedAspiration`, `renewalChain`, migration `20261115000100_aspiration_renewals.sql` adding `renewed_from` with a one-renewal unique index, `on delete set null` and an ownership trigger), manual ordering (`reorder`, drag and drop plus Earlier/Later), and Insights → Plans & Rituals (`components/insights/AspirationInsights.tsx`, `aspirationTrends`). Theme QA covered all nine themes on desktop, the detail dialog and mobile.

## Planner 2.0 — Agenda (#79) — implemented on feature branch (staging migrations only)

Information architecture (reconciled across #79, #81, #83, #84, #85): Planner → **Tasks | Agenda | Reflections** (`?view=`), Rituals → Habits | Aspirations | Bucket List. No other Planner destinations. Tasks is the existing board (#81 adds Running List). Reflections is a placeholder until #83.

**Agenda toolbar.** One view menu (Day, Week, Month, Future Log), previous/Today/next, the period title, + Event, Customize layout (Week and Day), and a settings popover (show completed tasks, canceled events, Muse Marks; plus a key to every symbol). Hiding is display-only and shows a "Hiding …" note with Show everything. View choices persist per device (`muse.planner.agenda`).

**Week.** Two horizontally navigable spreads of four equal, full-height columns (Mon–Thu; Fri–Sun + the planning column: notes or a checklist, title/type on the account, content per week in `planner_week_sections`). Narrower screens show 3, 2 or 1 columns. No task-list sidebar in Agenda.

**Shared section template** (`lib/agenda-layout.ts`, table `planner_agenda_layouts`, versioned). One ordered list of sections for all seven days: same order, same height preset (Collapsed, Compact, Standard, Tall), so bands line up. Content scrolls inside a band and its header shows the count, so nothing is silently hidden.
- Events and the first Tasks section are permanent.
- Optional sections: Movement, Reading (minutes or pages that day, or the page reached that day), Meals, Water, Custom notes (`planner_day_notes`), and additional Tasks sections.
- Customize layout reorders by dragging or with ↑/↓ buttons, renames, resizes, configures, adds and removes, and resets with confirmation.
- Removing a section never touches the records it showed.
- **Resizing, icons, styling and custom sections:** see Planner Customization (#87) below.

**Workspace-aware Tasks sections.**
- Each Tasks section shows all workspaces or the ones chosen. Unchecking the last choice is blocked, so a section never silently becomes "all".
- A removed workspace shows a recoverable warning instead of widening to all.
- Overlapping sections get a gentle note; a task in both is still one record.
- Per-section completed visibility (follow the Agenda setting, always show, always hide) overrides the Agenda setting.
- **Filter precedence:** the Tasks tab's workspace, group and tag filters do not filter the Agenda (they aren't visible there); each section's own scope decides.

**Native events** (migration `20261118000100`).
- All-day events (no time stored), multi-day events (one record with `end_date`), end time, location, notes, and a status (confirmed, tentative, canceled) that is never task completion.
- Edit, reschedule and delete (with confirmation), all through `planner_event_command` on the Planner revision, so Agenda, Dayview and Insights stay in sync.
- Dayview shows multi-day and all-day events, labels canceled and tentative ones, and its event entry is the same native event.

**Task states** come only from existing fields: open, completed, overdue (planned earlier, still open; flagged in place and never moved for you, with "Migrate to today"), unscheduled, and ★ for a task that is one of the day's three priorities. "Move to a date…" is the keyboard alternative to dragging.

**Muse Marks** (`lib/muse-marks.ts`, table `planner_marks`).
- A curated icon, color and optional label on a date or date range, or on a task or event.
- Visual-only by default. A Mark may optionally point at an existing event, task, movement type, book or Aspiration; linked event and task Marks follow the record's current date.
- A Mark whose source was deleted stays, shown as unlinked.
- Marks never log activity, complete anything or count toward progress.
- #87 adds gradients, meanings, My Marks and themed collections (see Planner Customization below).

**Movement.** Planning uses Dayview's existing movement selection, which Dayview already treats as an intention. "Done" comes only from logged activity, and moving a plan never touches logged activity. No new tracker. Reading reads Bookshelf sessions only, and no Ritual or Aspiration progress is ever written from the Agenda.

**Day, Month and Future Log.**
- **Day** (Daily Planner): a focus panel (intention, three priorities read from Dayview, Marks, Open in Dayview) plus the same sections in a flowing layout.
- **Month:** cells show Marks, the first events, open and overdue task counts and a priority star. Selecting a date shows its details beside the grid, with Open day, Open week, + Event and + Mark.
- **Future Log:** twelve month sections with chronological entries: event ranges like "7–9", Marks, tentative and canceled states, and tasks. Each month has + plan and + Mark, and its heading jumps to that month.

**Persistence and export.** The template is on the account (all devices). Marks and notes are per record. All four new tables are owner-only (RLS, four policies each) and included in the personal data export.

**Scheduled Board Task List (§12, approved 2026-11-06).** Planner → Tasks keeps its board; its Task List (`PlannerRail`, `TaskListRow`, `ScheduleMenu`, pure `lib/task-list.ts`) is now a distinct pinned source: own header (title, count, workspace, search, Filters incl. ★ Priorities only), scopes To plan (overdue then unscheduled) / Overdue / Scheduled / All (remembered per device), grouped dense rows with priority, overdue, date, due, workspace, group, tags, subtasks, repeat and estimate facts, and a Schedule menu (no Details needed). Drag list → day, day → day and day → list still work; while dragging, every day is labeled as a destination. Day cards show the same ★/› markers. No database change; every action is the same `task/place` on the one task record, so Agenda and Dayview update. This is separate from #81's Running List, which will add a Tasks view selector without replacing this board.

**Not built here:** Google Calendar (later, #35 — see `docs/GOOGLE_CALENDAR_PLAN.md`), recurring events, a task sidebar inside Agenda (intentionally none), and Ritual auto-completion from reading (left to Rituals' own rules).

## Planner Customization (#87) — implemented on feature branch (staging migration only)

Approved 2026-11-07 as one implementation pass, with polish to follow after Stephanie's visual review. Full Saved Planner Layout Presets, Planning Modes and recurrence (#89) are out of scope.

**Migration** `20261123000100_planner_customization.sql` (additive): `planner_marks.gradient` (jsonb) and `.meaning` (≤200); `planner_day_notes.items` (jsonb array ≤60) and body up to 5000 characters; the layout allows up to 24 sections; new owner-only `planner_customizations` (one versioned library document per person; RLS, four owner policies, no anon; in the personal export). Applied to local and staging (verified 2026-11-07); production only with approval.

**Resizing.** Every band except the last has its own drag handle (or arrow keys), Events included; the last band fills the column, so it has none. The old Events handle sat at the bottom of the day card because sections weren't positioned.

**Custom Muse Marks** (`lib/muse-marks.ts`, `lib/planner-customization.ts`, `MarkEditor`).
- Symbol from the curated library, a solid color or a gradient (`MusePaintPicker`), a name (label) and an optional meaning.
- `color` always stores a solid fallback (the gradient's first stop), so older clients still draw the Mark.
- "Start from": My Marks (saved favorites) and themed collections (Vacation, Work, Wellness, Cozy, Personal). Picking one copies its style into the new Mark; nothing stays linked.
- "Save this style to My Marks". The settings key lists My Marks with their meanings, so color is never the only signal. Removing a saved style never removes placed Marks.
- Gradient Marks are a filled chip with a light symbol. They show wherever `MarkGlyph` is used: Week, Day, Month and Future Log, plus task and event rows.
- Marks remain metadata: they never change a task's status, schedule or completion.

**Section styling** (`style` on each layout section; no extra table).
- Background: theme default, solid or gradient. Strength (opacity) runs from 5–60% on its own layer, so text keeps full contrast.
- Accent for header, icon and divider (mixed toward the text color for readability). Header style: Classic small caps, Editorial serif, Tinted label or Underlined.
- Divider: Fine line, Dotted, Dashed, Double, Flourish or None. Optional sticker.
- A live preview, and "Reset to theme default". Theme defaults apply whenever nothing is set.

**Decoration vs. Marks.** Stickers are typographic ornaments (✦ ✿ ☾ ♡ …), tucked in a section's lower corner, `aria-hidden` and non-interactive. They never use Mark icons and never attach to dates or records.

**Custom Planner sections.** Three new section types: Checklist, Simple List and Freeform Notes (the former Custom notes).
- Content is per section per day in `planner_day_notes`. It belongs only to the Planner: checking an item never creates, completes or touches a task, habit or anything else.
- Checklist and List sections can have starter items. A day with nothing saved shows the starter items; the first edit saves that day's own copy, so other days and the template never change. Checklist has "Uncheck all".
- A Notes section can have a starter prompt, shown as a placeholder and never saved as the person's writing.
- In Customize layout every section can be renamed, restyled, reordered, resized and given an icon. Optional sections can also be hidden or shown (content kept) and duplicated (the copy has the same setup and starts empty).
- Removing a content section asks "Remove, keep what I wrote" or "Delete section and its content" (permanent). Connected sections (Movement, Reading, …) still just remove from the layout. Events and the first Tasks section can't be hidden or removed.

**Saved Sections** (in the library).
- "Save as section…" on a Checklist, List or Notes section stores its type, title, size, icon, style and, optionally, its starter content. A section remembers its template (`savedFrom`), so it can "Update" that template or "Save as a new copy".
- My Saved Sections in Customize layout shows a preview card for each template (title, style, icon, first items), with search once there are more than four.
- Insert (optionally blank, skipping starter content), Edit (name, title, starter content), Duplicate, and Delete (confirmed).
- Inserting creates an independent section; editing or deleting a template never changes sections already in the Planner.

**Palette.** The paint picker offers the theme accents (they follow the theme), curated solids and gradients, the person's saved colors and gradients ("Save to my colors/gradients"), and a custom gradient (2–3 stops, four directions) through the existing `MuseGradientBuilder`.

**Decisions made in the implementation pass:** section content is per day, because the Agenda template is per day; the Week planning column stays the per-week space. Starter items are copied per day, never live-linked. Opacity is capped at 60%. Only content sections can be saved as templates.

## Planner 2.0 — Running List (#81) — implemented on feature branch (staging migrations only)

Planner → Tasks has two views of the same task records, chosen in the toolbar's view menu and remembered per device: **Scheduled Board** (#79) and **Running List** (`components/planner/RunningList.tsx`, pure logic in `lib/running-list.ts`).

- **Bullet-journal layout (approved redesign, 2026-11-06).**
  - Seven weekday columns (M–S with dates) on the left, one row per task, and the task on the right, under a TO DO heading.
  - A gentle rainbow wave links each task's marks to its neon checkbox; a faint dotted line appears when the week has no mark.
  - Today's column is a soft band.
  - Clear **Active** and **Completed this week** headers with counts. When Active is empty, it shows an "All clear" note.
  - Full width like other screens. Toolbar: search, Add task and workspace on the left; Filters, Show (All, Unscheduled, Scheduled) and Order on the right.
- **Marks.** **×** (neon, `--success-primary`) is the day a task was actually completed, from the shared completion history in the person's timezone, so completing in any Muse view places it. **○** is the planned day. A planned day that is also the completion day shows the × inside a ring.
- **Completing on a day.** Any day from today back (within a year) can be clicked. A blank day marks the task done on that day (`planner_complete_on`, migration `20261119000200`, with that local date recorded); its × reopens the task. Future days only show the plan. Completing never changes the planned date and records one event.
- **Manual order.** Drag the handle, or use ↑/↓ on it, or Move up/down in the row's menu. The order is stored separately in `planner_running_orders` (migration `20261119000100`), so reordering never changes a planned date, completion history or the board's day order.
- **Quick add** never assigns a date, and asks which workspace to use when All workspaces is selected. The workspace label on a row is a chip that moves the task to another workspace.
- **Not supported:** a canceled status (future enhancement; deleting is not canceling); recurring occurrences (a repeating task is one record with its latest completion, marked ↻; a recurring-task engine is separate future work); multi-workspace selection.

**Agenda polish (same release).**
- Agenda Tasks sections render the exact Task List row, so both tabs behave the same.
- Sections size by dragging their bottom edge (or arrow keys); the height is shared by all seven days and saved with the layout. Sections shrink to fit the column and scroll inside, the last section fills the remainder, and the page never grows.
- Movement "+" opens a popover of Dayview's movement types, plus creating a new type that joins the shared Wellness list.
- Water "+" adds water with Daily's quick amounts and progress bar.
- Agenda day cards use the planner card material (Frosted and Crystal).
- One rainbow today ring, shared by Tasks and Agenda.

## Rituals — Bucket List (#84) — implemented on feature branch (staging migration only)

Rituals → **Habits | Aspirations | Bucket List** (`?view=bucket`). One long-running list per person, modeled on Stephanie's handwritten bullet-journal list: a key of colored year circles on top, a dense numbered list, and each dream highlighted in the color of the year it came true.

- **Data** (migration `20261120000100_bucket_list.sql`, owner-only, RLS with four policies per table, revision trigger shared with Collections/Aspirations):
  - `bucket_lists`: one row per person: title, time horizon (start/end year, up to 100 years), `year_colors` (year → stored hex), completion treatment (highlight, cross off, stamp) and show numbers. The row is created on the first real save, not on a visit.
  - `bucket_entries`: permanent optional number (unique per person, never reused or renumbered), fractional manual position, title, notes, category, tags, emoji, status (Dreaming, Planned, In progress, Completed), optional target year (empty = Someday), URL links, cover photo, optional `aspiration_id` (on delete set null, ownership trigger), `completed_on`, the completion story (story, place, favorite memory, photos) and `history` of earlier completions. Archive is a timestamp and keeps everything.
  - Photos reuse the private `constellation-images` storage under the person's folder (no new bucket). They're removed when the entry or photo is removed, and account deletion already clears that folder.
  - `links` accepts `{kind:'constellation',id}` for the future Pinboard/Constellations connection (ids only, never copies). No UI for it yet.
- **Year colors.** A year's default color depends only on the year. Each year also has a pattern (solid, stripes, dots, grid, waves, cross) and is always shown in text (’26), so color is never the only cue. Defaults are saved into the list the first time a year is used, so later palette changes can't recolor history. Changing a year's color recolors everything completed that year, like redrawing the key; changing a completion date's year moves the dream to that year's color. The key shows the horizon plus any year with a completion; choosing a year filters to it, and the selected year wears the shared rainbow ring.
- **Completing.** The heart beside the number opens a short sheet: the date (defaults to today, never future) picks the color, and the story, place, memory and photos are optional. Once done, the heart fills with the year's color, the whole line is highlighted like a marker stroke, and the ’26 year chip appears. It celebrates with the shared celebration (respects reduced motion and Quiet Muse Magic). Tapping a filled heart reopens: the completion moves into `history` and the story is kept. A dream returns to Planned if it has a target year, otherwise Dreaming.
- **Views** (view menu, remembered per device with the sort in `muse.bucket.view`):
  - **Classic list**: three notebook columns spanning the toolbar (two, then one, on narrower widths). It fills like a notebook page, down column 1 and then the next, with at least 12 lines per column. Each line is number, heart, title. Completed dreams use the chosen treatment in their year's color (highlight by default). The next numbered line is always an add field.
  - **Collectible cards**: cover photo or emoji, number, category and status, plus a keepsake line (date, place, memory) and a year ribbon.
  - **Timeline**: ten-year pages, each year showing what came true and what's hoped for, then Someday. Nothing is forced into a year. This year wears the rainbow ring.
- **Organizing.** Search covers title, notes, #tags, number, place and story. Filters: status, category, tags, completed year, and archived instead. Sorts: Your order, Number, Target year, Recently completed, Recently added, A–Z. Reordering (drag the handle, ↑/↓ on it, or Move up/down in the menu) is only offered in Your order with no search or filters, and writes one position.
- **Aspirations.** A dream may link an existing Aspiration or "Turn into an aspiration" (creates a milestones aspiration with the title, category, emoji, notes and target year, then links it). They keep separate progress and neither completes the other. When a linked aspiration is completed, the list offers to cross off the dream.
- **Insights → Plans & Rituals:** "Dreams that came true" in the selected range, by year and category. Deliberately no percent-of-list metric. `completedBetween` / `bucketTrends` are ready for monthly and yearly Reflections (#83).
- **Export** includes the list and entries; photo files download separately, like Constellations.
- **Not built:** Constellations/Pinboard linking UI, mood boards per dream, Stream/Almanac signals, linking Planner events from a completion.

**Shared surface (same branch).** `.muse-planner-surface`'s base now lives in `app/design-language.css` (it was only in `Planner.css`, so the Bucket List looked translucent on Frosted). Bucket List and Planner cards now compute identically on Frosted and Crystal.

**Agenda fix (same branch).** The Week track's single grid row was auto-sized, so tall section layouts grew the row past the measured window height and the page scrolled. The row is now `minmax(0,1fr)`, so days shrink their sections and scroll inside them.

## Rituals — Habit trackers (#85) — implemented on feature branch (local + staging migration)

**Audit (2026-11-06).** Existing: weekly grid, checkbox/quantity/duration/weekly-target tracking, groups, recurrence, streaks, lifecycle, connected rituals, Insights. Partial: Grid (week only). Missing: Month and Year periods, Focus and Heatmap layouts, a ritual selector, categorical tracking. This issue adds only the missing pieces.

- **Controls.** Habits has a ‹ This week/month/year › stepper on the left (with the period title), and on the right **Period** (Week, Month, Year), **Layout** (Grid, Focus, Heatmap) and, for Focus and Heatmap, a **Ritual** menu. All are shared `MuseChoiceMenu` dropdowns, remembered per device (`muse.rituals.tracker`). **Week + Grid is the original screen, unchanged** (week strip, summary, groups, legend). A one-week heatmap isn't offered; Heatmap shows the month instead.
- **One data source.** Every view is `lib/ritual-tracker.ts` over the same `RitualState`, read through `useRitualView` (so connected rituals show their source values and stay read-only). Each square is `ritualCell`, the week grid's own rule, so complete, partial, explicitly missed, unknown, upcoming and not scheduled stay distinct in every view. No view stores anything.
- **Grid.** Month: rituals × days, editable compact squares (checkbox cycles; others open the usual entry sheet) and a "met/decided" count. Year: rituals × months shaded by the share of decided goals met; a month opens that month.
- **Focus** (one ritual). Week: seven large real week cells. Month: a Monday-first calendar of real week cells. Year: twelve mini months. The header shows met/decided and the streak.
- **Heatmap.** Month: a calendar of squares. Year: Year in Pixels (12 month rows × 31 days). Either one ritual or "All rituals" (each day's share of decided rituals met). Squares use the ritual group's accent at four levels; missed shows ×, not scheduled is hatched, not logged is an outline.
- **Shares are honest.** Only decided days count: unknown, open and future days are never failures. Weekly targets count finished weeks.
- **Categorical tracking** (migration `20261121000100_ritual_categories.sql`).
  - New type **Category** with a legend of up to 12 named, colored categories (default Strength / Cardio / Rest). Each day you pick one in the entry sheet; Missed and Clear keep their meanings. Stored as the category id with value 1. Nothing is inferred or converted to pass/fail.
  - Used categories can be renamed or recolored, never removed. Categorical rituals can't be connected.
  - Views color squares with the category and show its legend. Shares report coverage ("days logged") instead of "met".
  - Server: the public `save_rituals` wrapper validates the legend and entries and writes `rituals.categories` / `ritual_entries.category` after the unchanged core save (the Connected Rituals pattern); `read_rituals` returns them (`categoriesEnabled`), so the export includes them. Before the migration, the Category type is hidden.
- **Not in this issue:** reusing these visualizations inside Insights, vertical tracker layouts, Daily Edit surfacing.

**Bucket List follow-ups (same branch as #85).**
- **Safari photos:** Safari can't encode WebP (the canvas quietly returns PNG), so storage refused the upload. Bucket List photos now fall back to JPEG there. Migration `20261121000200_private_images_jpeg.sql` lets the private bucket and its owner-only upload policy accept `.jpg` in the same folder layout.
- **Constellations in Safari:** cards still validate `.webp` paths on save, so Safari shows a clear "try Chrome or Firefox" message instead of a failed retry. Supporting JPEG on cards needs their save function updated (follow-up).
- **Dates:** "Completed on" uses the Muse date picker instead of the browser's.

**Habit trackers revision (2026-11-07, approved by Stephanie).**
- **Layouts:** Heatmap is removed ("not helpful"); Layout is now **Grid | Focus**, and a saved Heatmap choice opens Focus.
- **Focus · Year** is the paper year tracker from her reference: the ritual's name, months across (J–D), days 1–31 down in ruled touching cells, non-days hatched, the key beside it, and a **Month / Review** column. For categorical rituals the review is the month's most common category; for the others it's the month's share of goals met. A month letter opens that month.
- **Today** wears the shared rainbow `.muse-today-ring` in every tracker view.
- **Year Grid removed** (2026-11-07, "what is that"): Year always opens the year sheet; Layout offers Grid only for Week and Month.
- **Year sheet fits the window** using the Planner's height measurement (31 rows share the height; minimum 400px). Polish: a rounded ruled frame, a soft sheen on filled cells, today's row and column faintly lit, a month-by-month fill-in (off with reduced motion or Quiet Muse Magic), stat chips by the title, and day counts in the key.
- **Year sheet side panels** (2026-11-07): the side is two soft cards. The **Key** has category rows with day counts, or a compact two-column key for the other types. The **Month review** gives each month a glowing bar: its share of goals met with a met/decided count, or for categorical rituals its most common category (named on the bar) with logged days. Rows share the sheet's height. **Missed** is a diagonal strike through the cell, the same in the key, the sheet and the month grid. Days before a ritual's start date are blank, not hatched.

## Planner Foundation — Recurrence 2.0 (#89) — phase 1 on feature branch (no database change)

**Audit (2026-11-07).** Tasks store recurrence as three columns on the task row (`recurrence_frequency` daily/weekly/monthly, `recurrence_interval`, `recurrence_until`), written through the Planner command; a repeating task is one record marked ↻, and completing it doesn't produce the next occurrence. `task_completion_events` holds real completion history. Native events (`planner_events`) have no recurrence. Money has its own small interval engine (`lib/recurring.ts`), which stays separate.

**Phase 1 (implemented):**
- **`lib/recurrence.ts`:** one pure rule engine for tasks and events.
  - Rules: daily, weekly on chosen weekdays, monthly on a day (clamped to month end, so Jan 31 → Feb 28 → Mar 31) or the nth/last weekday, and yearly. Intervals, and an end by date or count.
  - It works on civil dates in the saved timezone, so DST can't move an occurrence. Each schedule is computed from the series anchor, so occurrence identity is (series id, scheduled date).
  - Helpers: windows with skipped dates, next/upcoming, membership, last date, "this and future" splitting, plain-language labels and presets, and `fromLegacy`, which reads today's task columns without rewriting them.
- **`components/planner/RecurrenceEditor.tsx`:** the shared repeat editor (presets for the start date, a Custom panel, Ends: never / on a date / after N times, a live summary with the next dates) and `RecurrenceScopeChoice` (This one / This and future / Entire series).
- Tests: `tests/recurrence.test.mjs` (month ends, leap years, nth/last weekday, DST weekends, until/count, skipped dates, labels, legacy conversion).

**Phases 2–3 (implemented, local + staging migration `20261122000100_recurrence.sql`):**
- **Data:**
  - A recurring task stays one task record (the series) with `recurrence_rule` anchored on its planned date. The older recurrence columns are read through `fromLegacy` and cleared when a rule is saved.
  - `task_occurrences` (owner-read RLS) stores only what happened to a date: completed (real `completed_at` plus the local `completed_on`), skipped, or moved (`moved_to`). Nothing is generated ahead and no history is fabricated.
  - `task_completion_events.occurrence_date` names the occurrence completed.
  - Events: `planner_events.recurrence_rule`, plus `planner_event_exceptions` for a canceled, moved, edited or deleted single date (overrides: title, time/clock, end time, location, notes, status, all-day).
  - All writes go through the revision-checked, idempotent `planner_recurrence_command`: task/rule, task/split, occurrence complete/skip/move, event/rule, event/occurrence and event/split. Future occurrences can't be completed. `read_planner_recurrence` returns rules, occurrences and exceptions. The export includes `recurringTaskHistory` and `recurringEventExceptions`.
- **Projection** (`lib/planner-occurrences.ts`):
  - Every view swaps a series for its dated occurrences, with stable ids `series::YYYY-MM-DD` (the scheduled date, even when moved), so each occurrence appears once per date and is counted once.
  - `translateAction` turns ordinary actions on an occurrence into recurrence changes: toggle → complete or reopen that date, drag to a day → move, drag to the list or delete → skip, edits → the series. Existing controls work unchanged.
- **Views:**
  - The Scheduled Board days, Agenda (Day, Week, Month, Future Log), Dayview and Running List all read the projection.
  - In the Running List, a series is one row: ○ on its due days, × on the day each occurrence was done, and each mark acts on its own occurrence.
  - The Task List shows a series as Scheduled, never overdue (its occurrences carry their own state).
  - A shared ↻ mark appears on occurrences in every view.
- **Editing:**
  - Task Details has a Repeat section: the shared editor with an explicit Apply. From a later occurrence it offers This and future (split) or Entire series, plus Skip this date.
  - The event editor has Repeat and, on an occurrence, This one (an exception: moved, edited or canceled), This and future (split) or Entire series. Delete removes this date or the whole series.
- **Counts:** Insights' plans count completion events (one per occurrence). The progress engine (Connected Rituals' "tasks completed", Across Muse) keys series completions by task and occurrence date.
- **Not done:** times other than all-day/start for events beyond the existing fields, and per-occurrence subtasks (subtasks belong to the series).
## Daily Edit priorities — close out past days (approved 2026-11-07)
- Whether a day is over now uses the person's current profile time zone, not the zone captured on that day's record. Before, a record with another zone (e.g. from travel) made same-day linked priorities read-only hours early.
- A linked priority on a past day can be checked off: it completes the task on that day (Running List's `planner_complete_on`, which records the local day) and shows as done for that day. Unchecking reopens the task, unless the day-end record already says it was done (that history isn't rewritten). Standalone priorities were already editable.

**Habits Month · Grid redesign (2026-11-07, from Stephanie's paper habit tracker).**
- **Layout:** habits run down the left, days 1–31 across with weekday letters, in ruled touching cells with shaded weekends.
- **Marks:** each done day is a glossy dot in that day's ink (a seven-color cycle like gel pens); categorical rituals keep their category colors. Partial is a smaller dot, missed is a diagonal slash, and not-scheduled days are hatched.
- **Today:** the header wears the rainbow ring and the column is softly lit.
- **Totals:** a Done row of badges that glow with how full each day was, plus each ritual's met/decided count for the month.
- **Polish:** an editorial title with stat chips (done this month, today, best day), dots that pop in day by day (off with reduced motion or Quiet Muse Magic), and a key in one row.
- **Behavior:** same records and tap-to-log as every view. The whole cell is the tap target. On phones, the habit names stay pinned while the days scroll.


## UI Cleanup 1 — Desktop/Web (#98) — implemented on feature branch (staging migration only)

One sweep for desktop consistency. Migration `20261124000100_ui_cleanup_1.sql` (additive): album kind + `favorite_tracks` on `collection_media_items`; a `listening` Stream category (media source); `stream_tags` (owner-only) and a `stream_posts.tag` snapshot set only by the author through `stream_set_tag`; `notes_board` (owner-only Mindspace arrangement). Post JSON now includes `tag`.

- **Search (global):** `MuseSearch` carries the Muse prismatic edge on hover and focus. A stronger reset stops module input rules from drawing a second box inside it. The Grimoire search drops its inner "78 cards" count; the count above the grid stays.
- **Settings:** two independent columns (Account, Cosmic Forecast, Observations, About · Sign-in, Stream, Privacy, Credits). Stream and Observations toggles use the shared `.muse-check-row`. Sign-in loads Google and passkeys independently; a server with passkeys switched off (`passkey_disabled`, e.g. local development) says "Passkeys aren’t turned on for this Muse server" instead of an error.
- **Open Source & Credits:** only sources whose terms require user-facing attribution are listed openly (HeartYearning, CosmyDay, Google Books, Emojibase). Open-source license notices (Next.js, React, Supabase, Tiptap, Astronomy Engine, Recharts, Lucide, Tailwind) are in a collapsed list. Courtesy-only mentions (public-domain Rider–Waite–Smith art, Open Library data) were removed. CosmyDay’s terms require "a visible link to cosmyday.com wherever it appears", so the small "Forecast by CosmyDay" line stays with every forecast; HeartYearning’s per-entry source links stay too.
- **Dreamscapes:** the encyclopedia shows HeartYearning symbols plus your own, with no source picker; the alphabet is centered. Other symbols are not deleted, and their pages and dream entries still resolve.
- **Meals (Wellness → Plan):** compact day rows; meals as tinted chips with Move/Copy pills (shown on hover or focus on desktop); empty slots as quiet dashed "+ Breakfast" buttons. The week strip lines up with the plan’s right edge. Saved Meals is a collapsed "Saved meals" drawer under the week (the old `?view=saved-meals` link opens it); saved meals are still offered when adding a meal.
- **Tarot:** reading choices grow with their text (no overlap) in a wider menu with clear selected states.
- **Side Quests:** the sealed Daily Draw has a larger title and roomier spacing between subtitle, progress and tiles.
- **Daily Edit → Cosmic Forecast:** heading matches other Daily Edit titles; body uses the UI font; Preferences is a quiet link in the heading corner; Cosmic Observatory stays as the main control.
- **Aspirations:** the description fits on one line; Group, Sort, Count from (From Muse), Category and Status use `MuseChoiceMenu`; the add/edit form scrolls inside the modal with its actions pinned and reachable.
- **Stream:** standard page width; "Share a moment" (composer, sticky) beside "The stream" (filters and feed), stacking under 1060px. "Thriving Suspiciously" is now "Thriving". Custom tags: create, pick, rename, restyle (emoji icon; solid or gradient border from the shared paint picker) and delete beside the five classics. A post carries one tag; a custom tag is snapshotted onto the post right after publishing, so later edits or deletes never change earlier posts. Changing the tag of an already-published post is not built yet.
- **Collections → Music:** albums (title, artist, cover, release date, rating, favorite, notes, up to three favorite tracks; statuses Want to Listen / On Repeat / Listened) in their own Music view and in the overview. Share from an album’s details as "is listening to …" (explicit, never automatic). The Stream composer has a Listening shortcut (albums only; Watching now excludes albums). Featuring an album on a profile uses the existing Showcase picker ("Movies, TV, games & music").
- **Mindspace board:** bold card titles; drag cards to arrange ("Your arrangement" sort, chosen automatically on first drag, and exact order kept). Drag a card’s corner to resize, or use Size: Standard/Wide/Tall/Large in its menu, where Move earlier/later is the keyboard alternative. Duplicate makes an independent card (new ids; images stay with the original). Tags keep the five theme colors plus an optional custom solid or gradient. A Board settings button holds Show dates, Compact text and Reset arrangement (confirmed; cards stay). The arrangement lives in `notes_board`; cards are unchanged.
- **Bucket List:** a dream’s number can be changed to one already used. The two dreams swap numbers (the other is cleared first, so numbers stay unique), where it used to fail with "Another dream already has that number."


## Planner → Reflections — Modular Memory Book MVP (#99, closes the #83 placeholder) — implemented on feature branch (staging migration only)

**Where:** Planner → Tasks | Agenda | **Reflections** (the third tab). One Week / Month / Year selector with previous / Today / next and the shared `PeriodTitle` picker. Weeks run Monday–Sunday (the same period math as Insights). The period is remembered per device (`muse.reflections.period`). Past and future periods can be opened and edited.

**Layouts (two per period, six personalities):**
- **Week:** Little Moments (cozy lined paper and washi tape) and Weekly Favorites (playful tilted stickers, colorful edges).
- **Month:** Monthly Highlights (editorial rules and big serif heads, no boxes) and The Monthly Edit (magazine masthead).
- **Year:** My Year in Moments (sentimental, centered, polaroids) and The Yearbook (confetti and badges).

A new period opens a picker with a mini preview of each layout. Every layout includes an optional Level 10 Life section.

**Modules (`lib/reflections/model.ts`):**
- Memories (title, date, story, up to 8 photos, caption).
- Photo moments (single / pair / gallery, with captions).
- On repeat (song, artist, note, https link, artwork; a decorative equalizer line, never fake playback controls).
- Books & stories, and Watching (movie or show), each with cover or poster, 1–5 stars and a note.
- Favorites (name, category, image, why).
- Highlights (win, achievement, experience, moment, milestone).
- Guided reflection (gratitude, lessons, challenges, growth, what made me happy, intentions, or your own question; multiple answers).
- Freeform writing.
- Level 10 Life.

In edit mode every section can be renamed, resized (full / wide / half / third on a 6-column grid), moved up or down, hidden (content kept) or removed. Removing a section with content asks first and offers Hide instead. "Add a section" opens the library; Level 10 Life is limited to one per review.

**Finished view vs. editing:** the finished page shows only sections with content (plus Level 10 Life) and packs them densely, with no editing controls. "✎ Edit" opens editing. "Mark complete" / "Reopen as draft" sets the status. Changes autosave about 0.7s after typing, in order, revision-checked.

**Changing layouts never deletes content.** `switchLayout` seeds the new layout. Each old section with content fills an empty new section of the same type (and same guided prompt) or is carried over after the new sections. A preview says what moves before you confirm. Level 10 ratings are separate rows and are always kept.

**Level 10 Life:** ten default areas (Health & fitness, Career, Finances, Family, Friends, Romance, Personal growth, Fun & recreation, Home & environment, Spirituality), each with its own color. Areas can be renamed and recolored, and archived rather than deleted (stable ids keep history meaningful). Ratings are 1–10 bars with an optional note, saved per area and period. Weekly, monthly and yearly ratings are independent and never computed from one another. Seeding the defaults is idempotent (unique user + position).

**Media and Collections:** songs, books, shows and favorites are the review's own content. Nothing is added to or changed in Collections or Bookshelf (the UI says so).

**Images:** reuse the private `constellation-images` bucket and `uploadBoardImage` (owner folder, signed URLs, a JPEG fallback for Safari) under the review's id, or an https image link. Removed uploads are cleaned up best-effort; a missing image shows "Image unavailable".

**Data:** migration `20261125000100_reflections.sql` adds owner-only `reflection_reviews` (one per user, period and start; layout and modules as a bounded, validated document; draft or complete), `life_areas` (stable ids, unique slot, archived not deleted) and `life_ratings` (1–10, note, unique per area and period; a composite foreign key keeps areas yours and blocks deleting rated areas). Included in the personal export.

**Not built (per MVP):** Insights dashboards, automatic summaries, streaming or playback, Collections sync, freeform canvas, global layout presets, PDF export, AI writing, Level 10 Life trend views (the data is structured for them). Adding new life areas beyond the ten isn't built yet; archiving and renaming are.

## Daily Memories — Little Moments (#105) — implemented on feature branch (staging migration only)
- One memory per person per local date (`daily_memories`, unique `user_id + local_date`, owner-only RLS). Text up to 500 characters plus an optional emoji. Saving again edits that one record; delete asks for confirmation.
- Entered as **Little Moment** inside Day Pulse on Daily Edit, but saved independently: Day Pulse Reset never touches it, and Day in Three is unchanged.
- Wellness → Mood shows and edits the same record, separate from Mood notes. History includes memory-only days.
- Insights: Dayprint shows the day's memory; Week/Month/Year show a **Little Moments** carousel. **Bright Days** and month **Intentions** use the same shared `EntryCarousel` (arrows, swipe, trackpad, ←/→/Home/End, position text, one page mounted at a time, no horizontal page scroll). The Bright Days criteria are unchanged.
- Memories are read by date range (`readMemories`) so Reflections can use them later. They are included in the account data export.

## UI Fixes 2.0 — Schnazzification & Consistency (#104) — implemented on feature branch (staging migrations only)
- **Shared design system:** page-level panels (empty states, toolbars, heroes, stages) use the card glass in Frosted and Crystal instead of the nested subtle surface. Single-choice `MuseChoiceMenu` lists open bare (no repeated heading). Native `<select>` lists use Muse styling where the browser supports `appearance: base-select`. Touch screens get a 16px field minimum (no iOS focus zoom); pinch zoom is untouched. Dock theme icon is centered.
- **Future Log:** its own lightweight entries (`future_log_entries`: month, optional day, title, note, optional Mark icon/color, done). Entries never create events or tasks; "Make it an event" opens the event editor explicitly. Tasks and Daily Edit priorities no longer appear in the Future Log (they stay in Day/Week/Month). 12 colored month cards, 4 entries shown with "+N more".
- **Daily Edit:** colored title ink and icon tiles per card; Little Rituals uses saved category colors, compact rows and a pill "View Rituals"; connection metadata hidden (tracking unchanged).
- **Tasks:** one Compact/Spacious preference (`muse.planner.taskDensity`, Compact default) for every planner task card; same component and behavior.
- **Agenda:** "+ Event" only in Month (other views add in place); section titles carry a Mark picker (shared weekly template); week scrollbar hidden, scrolling kept.
- **Water:** one default (`defaultWaterSettings`, 100 oz) everywhere. A logged day keeps the goal it was logged with; other days use the current goal. A Water-connected ritual may follow that shared goal per date (`connection.followGoal`).
- **Rituals:** "Times per week" (1–7, `rituals.times_per_week`): available daily, met by distinct completed days. Optional habit emoji (`rituals.emoji`). "+" on each category header preselects it. Redundant summary text removed.
- **Collections → Series:** hero header, Next up (first released unfinished installment only), gap reporting, compact rows with icon actions and confirm-before-detach. "+ Add Book" → Create new book (existing Add Book flow, joins the series as the next installment) or Connect existing.
- **Bucket List:** every card photo sits in a fixed 16:10 frame; drag/zoom positioning saved as `frame {x,y,zoom}` on the image JSON (upload untouched).
- **Money:** stat tiles; Recurring split into accented windows (Next 7 days … Paused, Ended); compact rows with method chip; footnotes moved under content; Spending summary (income · planned · spent · left to assign). No calculation changed.
- **Onboarding:** personalize step widens on desktop (name/timezone/glass in one row, 3-column atmospheres).
- **Insights:** gapless Month grid; month Intentions as a chronological 1→last-day list; Dayprint Little Moment tile; readable date cells; carousels keep their height while paging.
- **Mindspace:** tag creation field with # prefix and preview; Enter on an empty search drafts a thought (or a tag for `#query`) without saving; corner resize no longer starts a card drag.
- **Stream:** composer and feed are equal columns; composer grouped into Mood · Share about · Who sees it.
- **Reflections:** fixed concise layouts (one full story, two pairs, Level 10 Life); wins and memories hold three each; theme-colored frosted sections; no add/move/resize chrome. Existing pages keep all sections.
- **Whimsy:** Weekly Draw week/countdown sits with the quests. Cosmic Forecast Preferences sit bottom-right.

## Google Calendar — read-only (#35, phase 1) — implemented on feature branch (no hosted migration yet)

- **Settings → Google Calendar** (right column, under Sign-in): Connect, per-calendar "Show in Planner" checkboxes with calendar colors, sync status and time, Refresh now, Reconnect when access expired, and Disconnect with confirmation.
- **Routes:** `GET /api/google/connect` (per-user state cookie, 10 min) → Google consent → `GET /api/google/callback` → Settings with an outcome. `POST /api/google/sync` (origin-checked; skips if synced in the last 10 minutes unless forced) and `POST /api/google/disconnect`.
- **Sync:** incremental per calendar with Google sync tokens; first sync reads 60 days back and a year ahead with recurring events expanded; a 410 restarts that calendar cleanly. Opening Settings or the Planner Agenda syncs once per page load. Times use the Muse profile time zone.
- **Agenda:** Day, Week and Month list Google events beside Muse events, with a color dot; selecting one opens read-only details with "Open in Google Calendar". The Future Log, Daily Edit and Muse Marks are unchanged.
- See `docs/GOOGLE_CALENDAR_PLAN.md` for setup and later phases.
