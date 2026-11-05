# Muse product rules

Approved product direction. Implementation status lives in FEATURE_SPEC.md.

“Be the muse of your own life.”

“Your plans, your rituals, your feelings, your future.”

“A little space to keep growing, exploring, and becoming.”

“Elegance in the structure. Magic in the details. Joy in the experience.”

## Philosophy

**Structure first, whimsy second.** Muse is structured like a premium productivity application, personal like a paper journal, and magical through atmosphere and interaction details. It is sophisticated, feminine, colorful, expressive, editorial, and delightful to use without sacrificing hierarchy. Whimsy decorates information architecture; it never replaces it.

Avoid generic AI dashboards, arbitrary floating cards, random gradients on generic controls, muted-purple-everything, purposeless decoration, and disconnected mini-apps. Deliberate grids, alignment, hierarchy, spacing, responsive behavior, and reusable components are required.

## Ownership

Daily Edit is an orchestration/surfacing layer, not the canonical owner of everything it shows.

| Owner | Canonical concepts | Daily Edit relationship |
| --- | --- | --- |
| Planner | Tasks, planning dates, due dates, scheduling, organization | Bounded preview for selectedDate |
| Nourish | Meal planning/assignments, saved meals, groceries, optional nutrition | Assigned meals and known totals for selectedDate |
| Rituals | Habit definitions, recurrence, history, streaks | Relevant daily rituals (planned) |
| Mood | Emotional check-ins, vocabulary, influences, emotional history | Daily check-in and independent Day Pulse |
| Money | Paychecks, allocation intent, spending, bills, card snapshots/payments | Future relevant summaries |

Never create disconnected duplicates because information appears on multiple pages. Planner owns plannedDate; plannedDate and dueDate are separate. Rescheduling is not failure, does not change dueDate, and does not duplicate a task. Events remain distinct from tasks.

## Planner context

Planner is a planning environment: **global Muse navigation → Planner planning rail → rolling three-day planning canvas**. The secondary rail is a staging/source area, not “Day 0” or a second app navigation. Desktop uses a bounded 260–320px rail beside a flexible day canvas. The rail is visibly named **Task List** and contains only a user-defined workspace switcher, top-aligned source tasks, and bottom-anchored quick task creation. New workspace/organization management lives inside the workspace popover; no persistent Unscheduled label/count, helper copy or standalone New workspace action. Compact Search and one Filters/Today/previous/next utility row live in a secondary toolbar below the shared header, not in the date track or source rail. The workspace menu includes existing contexts, counts, selection and New workspace/organization management. Workspace answers “Which world am I planning from?” Groups/tags classify/filter within that context. Selected workspace scopes the source pool and canvas. Secondary group/tag/status filters live behind one compact Filters control in the secondary planning toolbar; compact search and filters refine the relevant task set. Workspace selection lives with the task pool, never as a permanent board-toolbar filter. The canvas divides available width between three useful columns, reducing to two when needed. Mobile focuses one day and opens Task List in a sheet with the same source semantics; never stack an oversized desktop rail above microscopic day columns.

Tasks can be captured unscheduled from the rail or planned directly in a day; both workflows create the same canonical task type. Today returns the rolling window to today; previous/next shift by one day, independent of calendar weeks. Moving or reordering a task preserves its ID, due date, and completion. Daily Edit continues to surface a bounded subset of the same Planner-owned records. Planner now uses the approved fixed page mantra “THE ART OF GETTING SH!T DONE” below its title; the old eyebrow/support pair is retired.

## Ritual semantics

Rituals owns user-created groups, definitions, recurrence, dated logs and streak/adherence semantics. Checkbox, numeric, duration and weekly-target rituals are distinct measurement types. Recurrence supports daily, one weekly weekday, or selected weekdays. A Monday/Wednesday/Friday schedule ignores Tuesday/Thursday for adherence and streaks. Dates before a ritual starts are not applicable.

Ritual daily states are durably distinct:
- **Complete:** target met, including a checked checkbox or a numeric/duration value at or above goal.
- **Partial:** positive recorded progress below the target; meaningful progress, not failure.
- **Missed:** explicitly recorded not done; never inferred merely because a day ended.
- **Unknown / not logged:** a past scheduled opportunity without a record; missing data, not confirmed failure.
- **Not scheduled:** neutral/not applicable, excluded from adherence and streak opportunities.
- **Upcoming:** scheduled in the future, not yet an outcome.

Today may also show an open/unlogged entry point. Historical cells remain editable: complete, enter partial quantity/duration, explicitly mark missed, or clear a log back to missing. Saving zero is an intentional record of not done; clearing removes that record. No background process converts unknown days to missed.

Full-completion streaks count confirmed goal completions on scheduled opportunities. An open or partial current day remains in progress; an explicitly missed current day closes confirmed continuity. A past unknown or partial day cannot establish a confirmed full-completion streak, but is not reclassified as failure. Separate state counts remain available for future analytics; do not silently treat unknown as zero in rates or averages.

Weekly targets accumulate dated quantities across a week. Eligible days are logging opportunities, not separate daily obligations; missing eligible days must not become seven individual failures. Weekly-target streaks count consecutive qualifying weeks; other rituals count consecutive scheduled opportunities. Weekly goals and daily completions must not be collapsed into a misleading completion rate.

Schedule, goal and measurement changes must preserve historical meaning. The current Rituals MVP freezes these while logged history exists; effective-dated schedule/goal changes are planned. Milestone celebrations occur only on meaningful recurrence-aware threshold crossings, not every completion, and do not replay after undo in the same streak.

## Daily Edit

A date-based command center: What matters? What am I doing? How am I caring for myself? How am I feeling? selectedDate controls priorities, tasks/events, movement, water, meals, mood, and eventually rituals. Backdating is intentional. Dashboard collections must be bounded: movement/emotion/tag libraries use overflow and management surfaces. Planner preview limits are configurable (initially three events/five tasks), with accurate totals and links into Planner.

## Mood and insight semantics

Mood is a top-level pill inside Wellness, alongside Plan, Saved Meals, and Grocery List; Wellness remains the sole main-sidebar destination. The existing Mood experience and date/period records stay canonical. Legacy `/mood` links redirect to the Wellness Mood view with their date query preserved. The Wellness default remains Plan.

Feelings answer “What am I feeling?” Influences answer “What might be shaping it?” Day Pulse answers “How am I doing?” Keep them analytically separate; never collapse them into one score. Energy, stress, and overall day are independent optional 1–10 values. Missing is not zero or negative. Relationships between mood, influences, habits, and movement may be compared statistically; correlation never establishes causation.

Capture structured data when useful: movement frequency, adherence/streaks, weekday emotions, influences, energy/stress/day trends, spending categories, plan versus actual, custom periods. Analytics should be colorful, satisfying, and statistically honest, supporting week/month/custom ranges where appropriate. Most Insights should use deterministic analytics. Muse does not require an AI product integration.

## Technical direction and privacy

Approved stack: Next.js, React, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/RLS, Vercel, PWA, private GitHub repository. The local database foundation and private authentication are implemented; domain UI persistence, hosted deployment and PWA installation remain planned. Independent private accounts are the ownership model; never treat the fictional Stephanie UI profile as the authenticated identity.

Preview/staging uses test databases/data; production uses real databases/data. One codebase/repository, separate environment variables/databases. No account numbers in Money. No persistence of prototype domain records yet; theme, material, Muse Magic, Notes pane and optional Cosmic Forecast preferences may use localStorage.

## Evolving decisions

Update these documents for approved durable decisions. Label implemented versus approved/planned versus future/exploratory. Do not promote brainstorming to product requirements. Preserve approved behavior unless explicitly changed.

## Bounded movement shelf

Selecting an overflow movement promotes it into the fixed quick shelf and demotes a least-recently-used unselected choice where possible. This never adds a chip slot or clears another selection. If selections exceed shelf capacity, their names remain visible in the compact summary; a More count alone is insufficient. Explicit pinning/preference controls are future direction, not a reason to grow the dashboard.

## Visual system decisions

Crystal and Frosted are shared optical materials, not layouts. Both preserve geometry and component hierarchy across Daily Edit, Planner, Rituals and Nourish. Atmosphere is system-wide and strongest in open/header regions, while dense data stays calm. Neon Hangover! is near-black neutral charcoal/graphite with vivid LED-like pastel light, never a navy/teal base. Reusable interaction feedback respects reduced motion and never changes task/ritual semantics.

## Nourish ownership and organization

Nourish owns dated meal assignments and a separate reusable saved-meal library. Daily Edit reads and edits those same assignments, filtered by selectedDate; it must not maintain a separate meal list. Assignments support breakfast, lunch, dinner and snacks, including more than one entry per slot. Quick free text is a first-class meal, with an optional note and optional saved-meal reference. Nourish has three related but separate experiences: Plan (what and when to eat), Saved Meals (ideas intentionally kept for reuse), and Grocery List (what to buy). A saved meal is a lightweight reusable name, multiple meal types, optional note/link and optional nutrition defaults, not a recipe. Breakfast/Lunch/Dinner/Snacks are reusable metadata; one saved meal can belong to several types without duplication. Recent Meals reflects recent occurrences regardless of whether saved; it is not the intentional library.

Moving preserves assignment identity and changes date/slot/order. Copying creates a new assignment identity for every target date. Assigned names/notes/nutrition are snapshots: changing or removing a library item does not silently rewrite or erase an existing plan. Library deletion clears its references while retaining planned content. The initial week is Monday–Sunday; mobile focuses one selected day rather than compressing the full desktop view. Domain records remain session-local. Recipes, pantry inventory, automation and external food services remain future/exploratory. Manual groceries and optional nutrition are now part of the prototype.

## Daily Edit actions and fixed routes

A source badge identifies ownership and is informational; Manage is the separate action into broader module/category management. Edit changes a particular record, while Settings is configuration. Apply these roles where meaningful, without forcing a badge or Manage action into every card. Today's Plan uses a Planner badge and date-specific Manage link; Meals uses Nourish. Movement has Manage without a redundant badge; Water has Manage for goal/quick amounts and Edit for the day's quantity. Mood and Day Pulse gain no invented management action.

Navigation destinations use dedicated fixed routes. Implemented modules have their own page; future destinations reuse the clearly labelled placeholder presentation. The former generic `[module]` URL-param route is obsolete and removed. Unknown paths return 404; do not retain dynamic routing merely to render a finite navigation registry.

## Optional nutrition and shopping

Nutrition tracking in Muse is optional context, not the center of the experience. Calories (kcal), protein/carbs/fat (g) may be entered independently; none blocks meal creation. Accept finite nonnegative decimals. An entered zero is known; blank is unknown. Saved Meal macros are reusable defaults copied to a specific occurrence. Occurrence edits never silently change the template, and template edits never silently rewrite historical meals.

Daily totals sum known values across all entries and disclose incomplete data, including per-field coverage. No data means no summary, not a row of zeroes. Daily Edit retains a compact summary; full Nourish displays four fields. Do not infer calories/macros from names or add lookup, barcode, micronutrients or diet scoring. Insights may describe known planned nutrition with explicit coverage; this is never confirmed intake. Targets are FUTURE/EXPLORATORY.

Grocery List is a manually maintained shopping companion with stable item and section IDs, item name, optional quantity/note, completion and removal. Group by shopping section; checked items remain visible and recede until explicitly cleared. A future optional Saved Meal → Grocery List connection is APPROVED/PLANNED; no ingredients are required, generated or inferred. Custom section management is planned; pantry/inventory is not part of this feature.

## Vivid color and Pretty Toxic! balance

Muse is not a muted productivity product. Its structure is sophisticated and restrained, but its color identity is vivid, luminous and joyful. Atmospheric color may be soft and dimensional; interactive and magical accents use deliberate high-chroma pops, like small sources of light. Sophistication comes from controlled distribution, never automatic desaturation or globally lowering accent opacity.

Pretty Toxic! combines BOTH teal/peacock/emerald and wine/black-cherry/garnet/raspberry/rose. Its header composition is cool left → dark dimensional center → prominent warm upper-right → cool lower-right, with subtle rose bleeding toward the center. Warm light must also appear in functional accents. Avoid tomato/orange-red, brown-maroon, Christmas blocking and monochrome green. Midnight Ballerina! is electric blue/cyan cosmos; Curses! keeps blue/violet/fuchsia refraction; Neon Hangover! is almost-black neutral graphite with intensely luminous aqua/mint/lilac/periwinkle/hot pink/peach points, without genre-specific cyberpunk UI.

## Celestial heroes and stable pickers

Every primary Muse module uses a distinct abstract cosmic environment. Shared theme-aware nebula, aurora, haze, refracted light, cropped oversized forms, distant particles and occasional official MuseStars overlap/fade through the whole hero. Copy and controls inhabit the cosmos; never enforce copy | centered illustration | controls or draw literal constellations, maps, atoms, vines, currency or module clip art. Variation comes from composition/scale/direction/density, not a new literal object for each module. Readability and functional hit areas dominate.

Approved atmospheric composition: Daily Edit is a personal morning sky; Planner is directional light; Rituals is rhythmic circular haze; Nourish is organic replenishing light; Mood is a multicolor emotional aurora with morning/evening check-ins shared with Daily Edit; Money is agency/momentum through refraction; Notes is the functional tag-first writing workspace with sparse surrounding thought-like light. Insights is the shared, deterministic reflection layer over those canonical sources, not another record owner. Primary module supporting copy uses a personal mantra, never a product description.

Theme is global app configuration: the fast picker belongs near Appearance/Settings in the sidebar, with a compact orb when collapsed. Mobile reaches the functional Appearance page through More. Desktop switching stays within the current module; there is no duplicate top-bar picker. Daily Edit’s three-star flourish has a normal-flow safe zone beside the header copy, separate from the date/week column. No theme picker or literal profile constellation occupies hero space. Cosmic Forecast is an optional full-width Daily Edit content card immediately after The Daily Edit heading and before Priorities, with manual zodiac settings; live horoscope retrieval remains unconnected. Broader zodiac personalization remains FUTURE/EXPLORATORY. Sidebar logo stars stay independent, with no connector through branding or collapse control.

Substantial searchable pickers use persistent search/filters, one scrolling results region and persistent confirmation. The Mood feeling picker is a responsive native modal; no scrolling header, whole-dialog scrollbar or second vertical results scrollbar. Preserve vocabulary IDs, quadrant meaning, selection and focus accessibility.

## Ritual completion presentation and daily progress

Progress visualization answers “How far did I get?” Completion answers “Did I finish?” Partial quantity/duration uses a ring/value. Completed quantity/duration uses a luminous theme-gradient orb with the achieved value centered and a small high-contrast neutral badge with a white check. Binary completion uses the same orb with a centered white check. Completion is richer than partial progress, without a full/double ring. Preserve actual values and accessible goal/completion labels. Missed uses ×, unlogged/unknown an open indicator, not scheduled a neutral dash, and upcoming the subtle future affordance. Underlying log states/history do not change.

The Ritual week strip shows full completed scheduled daily goals / scheduled daily goals. Partial remains a separate state and does not receive full completion credit; no new fractional-adherence model is introduced. Future days and days without daily obligations have no 0% bar. A day with at least one daily obligation and all such goals met earns a golden AchievementStar; undo removes it, and initial loading does not celebrate seed history. Weekly-target logging days are not daily obligations: weekly goals and their completion remain separately visible. Unknown past records remain Unknown, never reclassified as Missed by this progress view.

## Compact Planner interaction rules

Desktop Task List and dated containers have a stable shared structural height, independent of workspace or task count. Source tasks stack naturally from the top and scroll within their own area; workspace controls remain at the top and quick capture stays anchored at the bottom. Do not resize the shell or grow the whole page when switching contexts. Mobile uses the sheet/focused-day composition rather than inheriting the desktop height.

A shared task card has two default scan rows: completion/title/stopwatch, then clickable workspace/group classification with tags alongside/right where space permits. Estimates, due dates and other scheduling/subtask facts remain in Details rather than separate card rows. A future display preference may opt due-date preview back in; no preference UI is implemented yet. Timing expands inline with tracked/estimated time clearly separated and reuses the one canonical running timer; collapse never resets it. Workspace and Group remain distinct; reclassification preserves task identity and clears incompatible group references. Native/system select menus do not belong in primary Muse UI; use shared labelled, keyboard-accessible Muse controls.

Tasks remain draggable from non-interactive card areas, without permanent drag handles or Move links. Buttons, checkboxes, classification and timer controls do not activate drag. Full Task Details retains deeper fields, manual date/Move/return-to-Inbox and keyboard reordering. Rescheduling never implies failure.

## Multicolor functional palettes

A theme’s secondary and tertiary colors must participate in functional interactions, not just backgrounds. Allocate deliberate semantic roles to primary actions, secondary filters, information/links, active navigation icons, completion, progress, focus/hover edges and decorative points. Do not make every control rainbow or stamp one accent onto every interaction. Curses! combines cyan/blue navigation/information, violet actions/filters and fuchsia completion/progress accents. Pretty Toxic! combines teal/emerald selection/information with rose/berry actions, links and filter states. Preserve their established atmospheric backgrounds.

## Nourish capture and density

Saved Meals is a compact reusable library, with visible Edit and secondary link/removal in an overflow menu. Search combines with overlapping meal-type filters. Macros appear only when recorded, including explicit zero; notes stay short. Grocery List is category-first, not a large form: scoped Add opens a focused name field and Enter captures it into that category. Global quick capture defaults to Unsorted; quantity, notes and reassignment are optional secondary editing. Checked items remain until explicitly cleared. Starter shopping categories are replaceable sample organization, not a required personal taxonomy.

## Money ownership and accounting

Money is a manual, paycheck-centered system: income event, allocation intent, spending transaction, bill obligation, card snapshot, card payment, category/subcategory, contextual tags and reusable paycheck templates are distinct canonical concepts. Six sections—Overview, Paychecks, Spending, Recurring, Cards, Categories—share one store. Bills remain integrated into Overview/Paychecks; Recurring is the sixth Money subview, not a global navigation destination. No budgeting ideology is imposed; allocation groups are user-owned.

Paycheck periods may cross calendar months and are distinct from month/custom reporting. Periods filter dated spending and relevant charts; card balances reconcile independently from the explicit dated opening balance and recorded purchases/payments. Expected income is never presented as received income. Blank optional amounts/APR/limits/actuals mean unknown; entered zero remains known. Unallocated money is valid, overallocated money is explicit and nonjudgmental. Only a positive fully assigned income basis earns a golden AchievementStar.

A card purchase is an expense once. A later card payment is debt settlement/transfer, **never another expense**. Card payments have separate records and never enter spending/category totals. Each card requires a user-entered opening balance at the start of an explicit local date. Purchases/payments on or after that date affect its current recorded balance; earlier records remain history without another balance effect. Editing/removing records or the opening basis recomputes from authoritative records; no bank balance is inferred. Bill paid status alone does not manufacture a transaction. Allocation actuals use explicitly linked records or an explicit manual amount; do not silently guess links from category names.

Transaction splits preserve the original total: underassigned money remains visibly Unassigned; overassignment is rejected, never silently altered. Categories/subcategories classify spending; multiple tags describe its context. Archive categories/tags to preserve stable historical references. Paycheck templates copy allocation intent and optional expected income, not actuals or dated outcomes. Editing an instance never edits its template; saving back is a deliberate action. Money records are authenticated, user-owned Supabase records using exact USD cents. Accounts start empty; sample fixtures are never imported. No account numbers, credentials or bank integration. See [MONEY_PERSISTENCE](MONEY_PERSISTENCE.md) for the implemented scope and limits.

## Achievement hierarchy

MuseStar is the theme-aware signature used for identity, atmosphere, navigation and ordinary magical moments. AchievementStar uses the same canonical elongated four-point geometry but keeps a cross-theme gold/champagne/amber identity: “You did it.” Reserve it for defined meaningful targets, never ordinary checkboxes, purchases or recurring charges. Water earns it at/above its positive goal while retaining the true amount above target and capping only the bar at 100%. All scheduled daily Ritual goals and a positively fully allocated paycheck also qualify. Rendering already-earned history does not celebrate; a first earned transition may glint briefly, respecting reduced motion. Priorities may adopt it for all-defined-complete later; not added to every task.

ISSYA BDAY’s only celebration exception is 5–8 tiny transient candy pieces near a first earned AchievementStar; they disappear while gold remains. This is local feedback, not falling confetti, a full-screen party or everyday checkbox animation.

## Birthday theme family

ISSYA BDAY! (Frosting) and ISSYA BDAY XXX! (After Hours) form one family, implemented as two related registry entries without a new theme framework. CANDY COATED REALNESS: frosting-white versus genuinely near-black environments, shared deterministic bubblegum/cherry/tangerine/lemon/lime/aqua/cobalt/grape semantics, vivid control/progress/chart accents and purpose-designed light/dark Crystal/Frosted surfaces. Cosmetic sprinkle capsules/dots/diamonds/dashes are sparse and composed, never repeating wallpaper or literal cake/balloon imagery. Existing six identities remain intact. Gold never becomes rainbow.

## Assigned meal scan hierarchy

Weekly meal tiles prioritize title, compact known Cal/P/C/F values, and secondary Move/Copy. Omit unknown fields; recorded zero remains visible. Notes/source/saved provenance remain in details/data, not the default tile. Saved and one-off assignments use identical display rules; saved macros remain snapshots when scheduled. Daily totals remain a separate known/incomplete summary.

## Recurring expectations

Recurring tracks expected repeating obligations of all kinds, not just subscriptions: services, insurance, memberships, utilities, annual renewals and custom schedules. Stable records include optional known amount, fixed/estimated behavior, existing category, interval/unit recurrence, a manually editable anchor/next-charge date, billing source, existing card OR safe payment-method label, active/paused/cancelled status, notes and optional cancellation/end/manage information.

Billing source answers who manages/bills the obligation; payment method answers where payment comes from. Preserve both. Card references reuse the existing record; non-card labels are shared Money payment methods, also usable by actual transactions. No account numbers or credentials.

Recurring expectation is NOT an actual transaction. Creating, editing, advancing expected dates or cancelling a recurring item never creates spending, moves card balances or earns achievement. Paused/cancelled/ended items retain history and leave future totals/upcoming lists. A cancelled expectation does not erase an explicitly recorded unpaid bill. Matched linked bill dates are deduplicated in dashboard reminders; bill status and recurring status remain distinct.

Expected dates derive from an anchored calendar schedule, retaining month-end/leap-day intent; manual date edits reanchor. Monthly, yearly, weekly, fortnightly, quarterly, six-month and custom positive intervals are supported. Real charge amounts/frequency stay primary; monthly-billed totals, normalized monthly equivalents and annualized estimates are separately labelled, with variable/unknown coverage disclosed. Recurring category analysis is expected cost, not actual spending. Dashboard preview is bounded; full tracker owns compact filtering/history. Confirming/matching charges, durable occurrence history, paycheck automation and calendar/timeline remain planned rather than fabricated.

## Continuous atmosphere and decoration safety

One shared document-height atmospheric plane spans variable-length Muse pages without restarting gradients or creating header/content seams. Upper theme identity uses viewport-relative anchors; soft lower fields extend through the full page without repeated tiles. Glass preserves readable content. Hero art fades to transparent at every edge and reserves a measured safe region around date/week/toolbar controls; stacking order alone is insufficient. Decoration hides/reduces before controls crowd. Theme palettes, especially Curses!, are preserved.

Daily Edit keeps its large personalized greeting and The Daily Edit section heading. A separate smaller sans-serif supporting mantra rotates from the approved module library once per profile-local calendar day, remains stable within that day and across refreshes, and avoids consecutive-day repetition. It never replaces or competes with the greeting.

## Compact Planner filters

Search, single-choice Group, match-all Tags and all/open/completed semantics remain. The secondary filter popover uses compact labeled radio/checkbox rows with semantic markers, a search field, Show completed visibility, Timeboxed only for tasks with an existing scheduled time, and clear/done actions. Workspace remains in Task List. One internal results region scrolls; controls/footer remain available. The active count includes nondefault status/group/tags/timebox criteria.

## Money dashboard and ledgers

Money Overview uses content-sized dashboard cards in independently flowing, intentionally authored desktop columns. Card heights are not artificially equalized. Current paycheck → Recorded spending → compact Recurring form the left stack; Coming up → Plan/actual form the right. Consistent token gutters separate cards; full-width Recent Spending starts after both stacks. Narrow screens stack these authored groups in reading order, with no masonry or reordered focus flow. Navigation/period controls share a tighter coherent rhythm.

Paychecks keeps a bounded Previous/Current/Next shelf anchored to the actual current recorded period, plus searchable Past paychecks for older records. Selecting history changes the same canonical paycheck, never copies it or grows an unbounded pill list. Allocation rows use readable names/dates/numbers, a separate inline semantic-color category selector, planned and known actual/variance, and compact actions. Editing category preserves allocation identity, amounts, links and template independence; incompatible subcategory is cleared. Older fictional seed periods demonstrate the selector without inferring historical allocation data.

Bills use the same ledger hierarchy: name/cadence, due date, amount, explicit text payment status, payment action and edit menu. Paid, overdue, upcoming and unpaid/today remain distinguishable without color alone. Marking paid changes only the existing bill status, never creates an expense or conflates a dated bill with a recurring expectation.


## Emotional Observatory and editorial voice

Mood owns ONE shared check-in per local calendar date and morning/evening period. Daily Edit feelings read/write that same record. The current prototype also stores Day Pulse signals on it; this is a legacy mismatch with the approved day-level model, not the target ownership. Either period or both are optional; editing/backdating updates identity rather than appending duplicates. Feelings, up to three exploratory influences, independent optional Energy/Stress/Overall Day (integer 1–10), reflection and update time are distinct fields. Missing is never zero, low mood or failure. An entirely cleared entry returns to missing. No fabricated history or causal conclusions. Current records/favorites/custom influences are session-local; browser refresh resets them, clearly disclosed.

The Emotional Observatory provides emotion-family browsing, multi-select chips, favorites, available definitions, searchable/custom influences, date navigation, reflection, history editing and confirmed deletion. History summaries count actual known values only. Mood Meter family energy is NOT the independently logged Energy signal. Descriptive cross-module comparisons are now available in Insights when sample requirements are met. Durable private history and production persistence remain APPROVED/PLANNED.

Seven named modules use fixed approved uppercase page mantras; Daily Edit and Insights retain their five-line daily editorial collections. Standard page headers have no introductory eyebrow; the Daily Edit personalized greeting remains. Voice is warm, clever, occasionally cheeky/poetic, never clinical, corporate, preachy or relentlessly positive. No quote API required. Deterministic module-specific rotation uses the profile-local civil date; open apps update at local midnight. Server hydration uses a stable fallback before local-time selection. Remote libraries, favorite/custom mantras and seasonal content remain FUTURE/EXPLORATORY. Whimsy has a lightweight implemented landing page; its feature engines are not implemented.

Cosmic Forecast is optional, compact Daily Edit content, not a new module. A user can disable it or explicitly select a zodiac sign in Settings; no birth data is required or inferred. Forecast visibility and zodiac preferences now use the authenticated profile; browser values do not override saved account choices. The provider boundary carries sign, local forecast date, attribution, text, retrieval time and status. Successful responses can be cached for that date/sign. No live provider is connected: current copy is explicitly an illustrative preview/unavailable state, never represented as a fetched prediction. No client secret, new service, horoscope API or database has been introduced.

## Continuous galaxy and compact ledgers

The main scrollable canvas is one cosmic environment, including header, content, lower viewport and extended pages. Upper/middle/lower overlapping non-repeating feathered light, sparse deterministic stars/dust and depth coexist with quiet text regions. Do not place the only atmosphere inside a rectangular hero. Birthday themes use distributed irregular candy accents, never an isolated circular confetti/spinner graphic. Three official elongated MuseStars form the reusable signature; golden rewards stay separate. Decorative density never changes layout, intercepts controls or competes with information. Curses!'s established palette/base remains a benchmark, not a replacement palette for other themes.

Grocery List retains a curated category skeleton when empty, relevant categories when populated and an explicit reveal-all. Quick-add supports name, optional quantity and category in one desktop row, deliberately stacked on mobile; its category persists between adds. Notes remain in item details. Pencil/trash actions are labeled, focusable and touchable; removal/clear-completed offers Undo preserving original item identity, quantity, note and checked state. All existing section IDs remain available.

Paycheck allocation names and color-coded category dropdown chips share one horizontal identity line. Optional relevant due dates use readable labels; category text is not repeated below. Planned/Actual and actual variance remain aligned numeric columns, with overflow at the far edge. Bills share readable dates, explicit text status chips and compact payment/edit actions. Category edits and bill status changes do not alter financial calculations or create transactions. Workspace/group financial semantics and template independence remain intact.


## Notes ownership and reliability

Notes is now implemented as a tag-first writing workspace, owned by one authenticated, user-scoped persistent library. A note has a stable identity, structured editor JSON, title/plain-text search projection, archive/trash/pin state, timestamps and revision. Tags have independent stable IDs and normalized nested paths; note-tag relationships are many-to-many, never a folderId. Parent filtering includes descendants without duplicating notes. Rename preserves identities; confirmed branch deletion removes only tags/links, never notes.

Creation is one action and permits untitled content. Context may supply a tag or pin without requiring a creation form. Archive and Trash are system views; archive search is explicit, Trash is reversible, permanent deletion is confirmed. Duplicate creates a new record from the latest draft, not an outdated saved body.

Drafts enter the authenticated Notes owner immediately and persist with a short debounce, preserving the target note identity. A library revision covers content, metadata and tag-graph edits atomically; a stale save must not overwrite another edit or selected note. Pane visibility, focus, search and selection never discard drafts. Saved records survive refresh/restart; pending drafts stay tab-local until acknowledged. Errors retain reviewable drafts, network retry is idempotent, and conflicts require explicit latest-load recovery. Pane preferences remain browser-local. Durable version-history UI remains planned. Inline hashtag parsing is deferred; ordinary hashtag text is never modified.

Use a mature structured editor (Tiptap/ProseMirror in this implementation), not homemade HTML manipulation. It owns formatting, paste, selection and undo/redo. Cross-module links remain exploratory. Notes should remain a calm serious writing tool inside Muse's surrounding cosmic environment.

## Shared header/date identity and nine-theme naming

Every primary header uses a shared normal-flow copy/signature/context grid and semantic spacing rhythm. Daily Edit keeps its large personalized serif greeting and a single rotating mantra; greeting and date share a top edge, with week immediately below date. Functional controls own their track; stars own a safe decorative slot beside copy. No constellation line, theme picker or illustration intersects them. Daily Edit widgets and data remain unchanged.

Global selectedDate and Money's reporting/paycheck period are separate. Money date navigation must not silently change the selected financial period/paycheck. Themes change visual tokens, never this layout or domain behavior. Sidebar quick selection remains; mobile uses Appearance via More.

Theme names are display metadata, not saved identifiers. The six renamed labels are Glitter!, Midnight Ballerina!, Pretty Toxic!, Sunburnt & Sinful!, Curses! and Neon Hangover!; both birthday labels remain. Existing eight IDs, palettes, material settings and saved preferences are preserved. Disco Damage XXXTRA! is a new ninth theme, stable ID `disco-damage`, not a replacement. Its maximalist chrome/pink/cyan/violet/gold identity stays controlled, readable and reduced-motion friendly.


## Insights ownership, evidence and periods

Insights reads canonical Planner, Rituals, Mood, Money, Nourish and recorded Daily Edit state. It never creates replacement domain records or fills sparse history with demonstration events. The prototype explicitly discloses fictional starter data and session edits. Empty inputs stay empty. Normalization, period metrics, deterministic revelation rules and chart presentation are separate boundaries; future imported/manual sources require provenance and cross-source deduplication before aggregation. No analytics tracking, AI API or external health service is required.

Daily logs retain their local YYYY-MM-DD identity; actual timestamps are converted with the profile timezone. Periods are inclusive, comparisons use the immediately preceding equal-length range, and missing or zero baselines never yield invented percentage changes. Known zero differs from missing. Edited/deleted source records change the derived picture, not a separate analytics cache. Units, subjective signals and unrelated activity counts never become a single life score.

Planner's completion-rate denominator is tasks currently planned in the period, using their current completion state. Completion-over-time uses recorded completion timestamps instead; legacy completed records without a timestamp have no guessed date. Rescheduling preserves identity/completion and is not failure. Captured actual timer minutes are cumulative task snapshots, never manufactured daily time sessions.

Ritual analytics preserve complete, partial, explicitly missed, unknown/open, unscheduled and future states. Counts of full daily goals disclose all elapsed scheduled opportunities and separate unlogged coverage; observed full-goal share excludes unknown. Weekly goals use whole-week quantities and their own denominator, including explicit overlap labeling when the selected period cuts through a week. Confirmed streaks reuse recurrence-aware semantics, can begin before the chosen period, and disclose their as-of date. Quantities from different ritual units are never pooled.

Energy, Stress and Overall Day remain independent optional signals. Emotion/quadrant/influence frequencies count the applicable selections/check-ins, not diagnoses or a happiness score. Descriptive cross-source relationships require actual paired dates, sufficient samples and variability, show sample counts, and never imply causation. A missing movement entry is not evidence of no movement. Daily Edit movement is an intention, not a completed workout. Sleep/Apple Health comparisons remain FUTURE/EXPLORATORY until a real integration exists.

Money spending derives only from recorded transactions, respecting split amounts. Card purchases count once; payments, bill status, recurring expectations, planned allocations and savings allocations are not extra expenses. Paycheck allocation snapshots and known/manual actuals remain explicitly separate from period-filtered spending. Expected recurring dates are not predictions of actual charges. Nourish assignments remain meal plans, not confirmed consumption; aggregate planned nutrition describes only a known subset with per-field coverage and no inferred values or dietary targets.

## Forecast hero and Disco signature

Cosmic Forecast appears once, directly below the Daily Edit week strip in the right hero track. The left personalized greeting/mantra and right date top-align. Content determines height; disabling Forecast leaves no empty dashboard slot. Manual sign/visibility preferences and unavailable/illustrative preview remain; no live provider is implied.

The latest Session 2 Disco direction removes the literal mirrorball and supersedes earlier spherical-art approval. Disco Damage XXXTRA! is intentionally maximalist through holographic foil, prismatic reflected light, chrome and abundant official-star glitter. Keep copy/controls legible and noninteractive decoration pointer-transparent. Other themes stay unchanged; Quiet and reduced motion disable unnecessary motion without erasing Disco's color identity.


## Icon hierarchy and Water milestone refinement

Prominent navigation/featured icons may use shared vivid theme-aware SVG gradients; everyday utility/action icons remain crisp single-color. Optional small glass jewels are for meaningful highlights, not automatic boxes around sidebar icons. Preserve recognizable paths, stroke consistency, existing icon sizes and accessible control labels. Official three-star signatures keep canonical geometry and safe layout; achievement gold is a separate milestone semantic. Motion is restrained, never required, and respects reduced motion.

Water completion is attached to the progress finish line. Only a genuine threshold crossing celebrates; already-completed history renders calmly. Going below goal removes/rearms Water's state, and changes to the goal use the same threshold rule. Quantities remain true beyond goal, while only the visual bar caps at 100%. This explicit Water reentry behavior does not change other milestone replay rules.

Disco's approved holographic direction uses smaller neutral silver mirror facets with colored light reflections, not a giant opaque rainbow checkerboard. Most intensity lives in full-page refracted light and controlled glass edges. Header controls/copy have measured decoration exclusions and take priority; no decorative element can determine functional sizing. Other eight theme identities/backgrounds remain intact apart from their approved shared icon-paint roles.


## Universal layout and contextual management

Primary modules share one normal-flow two-line header: title/official star signature and one supporting mantra left, a consistently sized and top-aligned date track right where applicable. Module-specific filters/navigation/actions live in a secondary toolbar below. Date-less modules keep the same identity grid without an invented date control. Responsive stacking preserves reading order. Daily Edit's editorial exception uses its personalized serif greeting/mantra left and date → week → one compact Cosmic Forecast right; the complete header precedes The Daily Edit and dashboard. Forecast is never a dashboard-grid child or visually pulled upward with positioning.

Simple named-item management edits the selected row, with local Save/Cancel and Escape cancellation. Creation stays separate. Complex ritual/task/financial editors may remain intentional details drawers anchored to the originating item. Reusable icon actions supply names, tooltips, focus and touch targets; explicit overlay closing uses the shared glass X. Destructive overflow actions confirm locally, and protected workspace/group deletion restrictions remain.

Custom item colors are validated actual six-digit hex values when saved, independent of subsequent theme changes. Legacy theme-role presets remain readable; new preset choices resolve to concrete values on explicit save. Custom gradients support two/three validated colors and a restrained direction, with readable foreground content over subtle banner washes. Customization never edits the global theme. Icon selection uses a curated searchable/category library; extra geometry loads separately rather than loading an entire third-party catalog. The official MuseStar remains the only decorative sparkle geometry.

Mood's canonical date/period record continues to own feelings, influences, Pulse and committed reflection. Reflection typing edits a separate session draft only, never emotional history. Explicit Save updates the same logical record; Discard restores saved text. Drafts survive client route/date/period navigation and are labeled unsaved, not cloud saved. Blank draft saves do not create empty check-ins; deleting a check-in also clears its associated draft. Daily Edit and Mood use the same state source, not datasets synchronized with effects. Domain records/drafts still reset on refresh.

Money's Paychecks ledger is the reference for financial typography, category chips, amounts and compact actions. Spending permits direct category/subcategory and split-classification edits without altering amounts, splits, accounting links or balances. Recurring window totals enumerate expected occurrences in half-open local-date windows: next seven days includes today through +6, next thirty through +29. Expectations never create spending/payments. Active monthly equivalents normalize weekly to 52/year, fortnightly to 26/year, calendar month/year schedules by their cadence, daily by 365.2425/year; unknown amounts and variable estimates are disclosed. Paused/cancelled/ended items are excluded from active windows.

## V1 expression, emotional capture and delight

The personalized Daily Edit greeting is stable. Only Daily Edit and Insights retain their approved five-line daily rotation, with their existing sequence and deterministic actual profile-local calendar-day cadence; navigation, selected-day changes and rerenders never advance it. Planner/Rituals/Nourish/Mood/Money/Notes/Whimsy instead use fixed approved identity strings from `lib/page-header.ts`, listed in DESIGN_SYSTEM.md. This supersedes their former rotating copy and introductory eyebrows. The permanent brand headline remains separate.

Daily expression belongs to one local calendar date: editable intention, optional native Unicode intention emoji, and zero–three ordered Day in Three emojis. The latter is optional expression, not a Yale emotion ID, diagnosis, score or morning/evening session. Draft emoji selection, replacement/removal and confirmed order preserve that separation; cycling/reorder arrows are not displayed. Dayprints project those fields and existing Morning/Evening records into one compact daily history summary; missing dimensions are omitted, never fabricated or copied into a parallel store.

New emotional capture defaults to Morning before 15:00 and Evening from 15:00 in the configured profile timezone. The cutoff is centralized and configurable in code. A date's initial capture default is frozen; manual session choice wins. Historical editing keeps the record's explicit session, local date, stable ID, original creation timestamp and capture timezone; only updatedAt changes. Legacy unknown creation times stay unknown. Energy, Stress and Overall Day averages each have independent recorded-value denominators. Feeling-family totals count emotion selections, which may exceed check-in counts; the Yale four-quadrant capture model remains unchanged.

Muse Magic is a browser-local preference: Quiet, Magical (default), Extra. Decoration is separate from domain state. Small Spark / Orbital Glint and meaningful shooting-star/group-glint transitions use official MuseStar geometry, never confetti. History load, remount, refresh and ordinary rerenders do not celebrate. One mounted milestone scope does not repeatedly celebrate undo/recomplete. Operating-system reduced motion always wins. Water's existing goal sparkle and Ritual completion orbs remain the reference interactions. No special celebration for high Stress, low Overall Day, routine financial activity or a meal week without a reliable definition of completion.

Whimsy is a genuine Life navigation destination with Coming Soon previews for Horoscopes, Dream Diary and Tarot Journal. Those experiences remain unimplemented. Cosmic Forecast follows The Daily Edit heading as a full-width content card before Priorities. Login preview is isolated and honest: no access gate, account, token, email request or authentication success. Its demonstration confirmation states are explicitly labelled previews. The separate live `/login` now implements private invite-only Supabase sign-in through the local email inbox; hosted delivery remains planned.

## Writing-space and compact editing refinements

Notes actions live inside the workspace, not an external toolbar: tag collapse in navigation, search in the list, Focus/New note/pin/archive/overflow in the editor. Focus hides existing panes without remounting the editor or changing its note, selection, content or scroll. Restoration and search remain discoverable. Default desktop space favors writing (roughly 15/22/63), with usable pane minimums and progressive mobile navigation. Independent scrolling and a viewport-bounded workspace reclaim the old disclaimer/footer area; removing explanatory copy does not imply persistent notes. Preserve stored pane preferences and existing rich-text behavior. Drag-resizable panes are not implemented and were not removed.

Planner classification applies workspace/group changes immediately; closing/Escape does not roll them back. Groups remain scoped to workspaces, and incompatible references clear. Full Task Details remains compact, with manual Move beside Planned Date, and retains all deeper fields. No native organization selects, bottom instructional paragraph, or redundant Done confirmation in the quick classification menu. Birthday primary action colors are vivid readable candy pink rather than burnt orange; other theme palettes are unchanged.

Every meaningful field Muse collects needs a purpose, a place to review it, and a way to edit or delete it. A chart is optional; meaningful review and control are not. Never collect speculative data merely because it could be stored. Intention emoji expresses an approach, Day in Three expresses a day's experience, and Yale vocabulary expresses specific feelings; they remain distinct user/local-date relationships.

## Compact headers and future connected Whimsy

Standard headers show only title/official star signature plus one small uppercase mantra underneath. Existing date controls top-align with the title and stack at narrow widths. Remove obsolete eyebrow/subtitle copy and artificial minimum header height; preserve actual content spacing, functional controls, Daily Edit's editorial greeting/Forecast, all themes and module behavior. Approved fixed strings are maintained once in code and documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#compact-page-headers--current-approved-standard).

**PLANNED / NOT YET IMPLEMENTED:** Whimsy is a personal cabinet of curiosities, not another productivity dashboard. Detailed Cosmic Forecast, Tarot Study & Journal, Dream Diary, Unhinged Fortune Cookie, Fun Fact of the Day and Personal Book Diary/Reading Tracker are approved roadmap directions. Optional Daily Edit widgets, Evening at a Glance, connected Insights questions and weather are future work. The complete feature/persistence/audit intent is centralized in [WHIMSY_ROADMAP.md](WHIMSY_ROADMAP.md), not implemented by these declarations.

Durable boundaries for that future work: intentional private journal/draw/reading/save records have explicit user ownership, stable identity, original local dates/timezones, review and edit/delete. Reference content uses appropriate retrieval/caching: no personal history by default for forecast/facts/weather, and no saved-fortune record merely because a fortune appeared. Canonical reference text is not copied into every user record. Derived daily summaries read existing sources, omit missing fields and link back; saved snapshots require an explicit later need. Sensitive excerpts need deliberate product controls. Interpretive entertainment, personal reflections and empirical measurements remain distinct; associations never imply causal, clinical or spiritual scientific findings.

The upcoming repository/Supabase audit prioritizes current functional modules. Accommodate future source relationships without speculative tables, catch-all JSON stores, a duplicate universal event log, indefinite API response archives or analytics pipelines for features that do not exist. Muse doesn't just remember what happened. It helps users make sense of it.

## Final layout / expression corrections and rating integrity

Planner rail/day surfaces fill the actual remaining desktop workspace after measured surrounding chrome/gutters; no content-driven resize or arbitrary maximum height. Long source tasks and dated schedule/tasks scroll internally, while quick capture remains at the bottom. Small available heights/mobile flow naturally. Classification is compact with deliberate search/category spacing, not compressed controls.

Mood's desktop left stack contains the check-in and a **separate Day in Three card**, with Day Pulse independently sized on the right. Day in Three remains one per-date source shared with Daily Edit/history. Its continuous picker edits a temporary draft of zero–three emojis, supports explicit replacement/removal and commits only on Done; Cancel/Escape/outside/X preserve confirmed values. Displayed emojis have edit/remove actions, without cycling arrows.

Dayprints distinguish date-level intention/emoji/Day in Three from explicit Morning/Evening emotional sessions. **Important current mismatch:** Energy/Stress/Overall Day are still stored per session in the prototype. The UI now attributes each set in the right summary; it never fabricates a single daily score or combines values. The approved future model is one separate daily Pulse per user/local date. A lossless transition/conflict policy and coordinated Insights changes must be resolved during the upcoming audit, before production persistence. See [LAYOUT_MODAL_EMOJI_DAYPRINT_PASS.md](LAYOUT_MODAL_EMOJI_DAYPRINT_PASS.md#day-pulse-integrity-mismatch-deliberately-preserved). No automatic conversion or new score store is implemented here.

Development-only storage disclosure may live in Settings, not permanent working-surface footers. Removing prototype notices never authorizes a false persistence claim. All existing in-session data behavior remains.

## Architecture audit and daily ownership — approved target, not migrated

[ARCHITECTURE_AUDIT](ARCHITECTURE_AUDIT.md) records actual owners, lifecycle gaps and the Daily Edit data-flow matrix. [DATABASE_BLUEPRINT](DATABASE_BLUEPRINT.md) proposes the Supabase schema/security/synchronization sequence; implementation requires explicit approval. No backend/auth/storage migration is implemented by the UI correction.

One authenticated user/local calendar date must eventually own intention text/emoji, ordered maximum-three Day in Three and independent nullable Energy/Stress/Overall Day values. Morning and Evening retain distinct emotional sessions, influences/reflections and stable capture identity. Current session ratings are preserved until an explicit lossless transition decision; neither newest-session selection nor averaging is an approved consolidation. Daily Edit and Mood share their presentation layout; removing session labels from the Pulse header does not imply that underlying storage has migrated. Dayprints continue to attribute legacy observations. Current Insights daily means must be replaced deliberately when the approved daily source is implemented.

Enter once, update anywhere, see everywhere: dashboard projections must consume canonical module owners. Tasks/meals already share prototype owners; priority strings and Water ownership gaps need explicit decisions. Ritual/Money Daily widgets are absent and must not be claimed as connected. Do not silently import demonstration fixtures, reconstruct missing history or save transient UI/animation state as domain measurements.

## Approved daily records and historical presentation — architecture contract

**Approved/planned, not migrated:** one authenticated user/local date anchors daily intention text/emoji, independent nullable1–10 Pulse values, ordered0–3 Day in Three and related records. Morning/Evening retain feelings/influences/reflections/session identity, not independent Pulse sets. No merging/discarding prototype session values without an explicit lossless policy.

Priorities are up to three **dated Planner task designations**. New priorities create canonical tasks automatically; retained detached rows are inactive history. Keep stable ID, ownership/date, original text, display order, standalone completion or canonical task linkage, and creation/modification timestamps. Create a real Planner task atomically for each new priority; never auto-promote ordinary Planner tasks. While linked, task completion is the only authority; a priority completion action updates that task. Preserve historical commitments when a linked task moves/archives/deletes; the implemented Pass B lifecycle materializes the appropriate completion evidence when unlinking/deleting; see [PLANNER_PASS_B](PLANNER_PASS_B.md).

Dayprint is the unified historical presentation of a day, derived from its actual sources, not duplicated snapshots. It must eventually include intention, priority text/status/count, Day in Three, daily Pulse and separate Morning/Evening emotional sessions, including days with no Mood entry. Current intention/emoji/Day in Three sharing already works; priority history and optional links are now implemented locally in Pass B. Intention must persist independently of priorities, ratings or evening participation.

Nourish Water is an approved **future focused UI task** reusing the existing experience and one hydration owner. Adding/editing/removing quantities or changing a dated goal must update both Nourish and Daily Edit; never manufacture drink events from an aggregate. No Water widget is added to Nourish in this architecture cleanup. Rituals/Money Daily widgets are intentionally optional and are not needed for completeness.

Future Insights may query actual intention/Day in Three emoji usage, priority completion and daily Pulse/hydration relationships with honest sample sizes, original local dates and null handling. Emojis are descriptive expression, not validated psychological outcomes. Shared records must work across web/PWA/future native clients without relying on a page being mounted. See updated audit/blueprint matrices for actual versus target connections.

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


## Notes persistence — current checkpoint

**Implemented locally:** the standalone Notes library, rich-text documents, existing note metadata and nested many-to-many tag organization persist in owner-protected Supabase tables. No sample import and no Planner task-note changes. Atomic revision-checked saves cover content and organization; failed/uncertain writes retain drafts, retry uses a stable receipt, and conflicts require explicit latest-load recovery. Only confirmed data is described as saved. Permanent deletion remains confirmed and Trash-gated; branch deletion preserves notes. Pane preferences remain browser-local; unsaved content is tab-local until acknowledged. See [NOTES_PASS_A](NOTES_PASS_A.md) for validation and bounded-library limits. Other prototype domains and future Notes features remain deferred.


## Settings — current local checkpoint

Account timezone is explicitly selected and confirmed, never inferred from travel. UTC defaults prompt for confirmation. Confirmed changes reach shared date-sensitive consumers without discarding draft owners; historical local dates/zones and completion evidence remain unchanged. Forecast enabled/sign preferences share that profile authority; the card remains an illustrative preview. Appearance stays browser-local in the sidebar dropdown, without an Appearance navigation item or duplicate Settings controls.

Four Settings sections retain Muse cards and typography. Save/error/conflict feedback belongs below all sections and never treats pending choices as confirmed. Scoped saved-data JSON export lists included persistent sources and excluded prototypes/browser preferences/drafts. Account deletion remains unavailable pending a security-focused destructive-flow pass. About uses the exact approved core statement; an approved longer paragraph remains pending. See [SETTINGS_PERSISTENCE](SETTINGS_PERSISTENCE.md).


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

## Daily experience UI — Session 1

Daily Edit now uses the approved wider Forecast/Priorities stack and narrower Little Rituals surface. Little Rituals is a dated projection of authoritative Rituals, not a new checklist/log owner; preserve recurrence, lifecycle intervals, ordering and shared completion/recovery controls. Weekly sessions remain separate from daily completion denominators.

Dayprint is one selected day with The Day, Morning, Evening and far-right Day Summary. Intention, actual dated movement/hydration, independent sessions and daily Pulse/Day in Three remain with their existing owners. Priorities remain stored with historical links/evidence but no longer appear in Dayprint. Never substitute planned movement or current hydration preferences for historical records. See [UI_SESSION_1](UI_SESSION_1.md). This supersedes earlier no-widget/no-Wellness-Dayprint presentation notes only, without altering their data ownership rules.

## Wellness identity and UI Session 2

Approved user-facing identity: **Wellness**, Lucide heart-pulse icon, exact mantra **Take care of yourself. You've got places to be.** Preserve legacy `/nourish`, domain/table/storage IDs and existing behavior; this is not a new module or migration.

Status labels must describe actual acknowledged owner state, with errors/retry/drafts preserved and successful sync feedback in unobtrusive footers. Money's approved UI now aligns Spending with Plan / Actual and places Recurring full-width afterward; natural heights and unchanged financial semantics remain required. Disco's approved maximalism uses holographic light/glitter/chrome instead of a literal mirrorball. Session 3/Insights remains deferred. See [UI_SESSION_2](UI_SESSION_2.md).

## Daily Edit final card placement

The approved daily progression is expressed only through placement: Forecast/Priorities + Little Rituals, then Movement/Water/Meals beside Today's Plan, then Mood/Day Pulse followed by Day in Three. Reuse each existing owner and component exactly once; no new grouping functionality, records or persistence rules. Ritual list length never determines the top-row height, and Plan grows naturally with its existing bounded preview. Mood's dedicated page and Dayprint are not redesigned by this refinement.

## Insights MVP engineering

Insights is a read-only projection of authoritative module owners. Gate unconfirmed/failed/loading sources; never substitute prototype history. Count linked priorities through Planner once, distinguish completion transitions from distinct tasks, preserve captured historical local dates, and reuse Ritual recurrence/lifecycle/weekly helpers and Money calculations. Actual movement is separate from intention; meal assignments remain plans; daily Pulse is never session-specific. Current recurring expectations and allocation plans are not historical charges. Sparse evidence/unknown values must not become negative outcomes, invented patterns or accomplishment praise. Full definitions and implemented limits: [INSIGHTS_PERSISTENCE](INSIGHTS_PERSISTENCE.md). No independent writable analytics records or UI Session 3 work.


## Insights UI Session 3 — implemented presentation boundaries

The general Overview reflects personal life; recorded financial totals and financial revelations are grouped in Insights → Money. This is presentation routing over the same owner records/calculations, not a second financial engine. Inspector selection uses civil dates and the saved profile timezone for Today; historical selection remains unrestricted by chart range. Evidence disclosures remain available. Session 3 also supersedes the final Daily Edit equal-height Rituals rule: independent authored columns, natural card heights, bounded Ritual scrolling, standard gutters and proportional Day in Three. No persistence/ownership rules change. See [UI_SESSION_3](UI_SESSION_3.md).

## Disco Damage XXXTRA identity correction

Approved Disco-only direction: near-black/neutral charcoal foundations with concentrated blacklight neon and liquid-chrome reflections, rather than a purple/pink dark-mode wash. Color belongs mainly to localized atmosphere, semantic accents, selected states, progress and fine edges. Preserve all layouts, owners, functionality, theme IDs and the other eight themes. See the current [design-system direction](DESIGN_SYSTEM.md#disco-damage-xxxtra--blacklight-identity).


## Final Daily Edit / birthday-light repair

Daily Edit's independent left track is Forecast/Priorities/Movement/Water/Meals; right is Little Rituals/Plan/Mood/Day Pulse/Day in Three. Reflection must not sit after the shared tallest-column boundary. Preserve natural card sizes, one grid-gap token, existing owner captures and no duplicated records. Mobile orders Forecast, Priorities, Rituals, Plan, Movement, Water, Meals, Mood, Pulse, Day in Three. The dedicated Mood page is unchanged.

Only ISSYA BDAY! light receives stronger pearl surface separation and neon frosting accents. ISSYA BDAY XXX! dark, Disco and other theme tokens are protected. See [DAILY_EDIT_BIRTHDAY_REPAIR](DAILY_EDIT_BIRTHDAY_REPAIR.md) for validation and existing protected-theme test limitations.


## Daily Edit restoration and final theme-picker copy

The right-only reflection experiment is superseded: restore broad side-by-side Mood/Day Pulse with Day in Three directly below Mood. Preserve upper card placement and natural heights with existing gaps; do not relocate Wellness/reflection to fill space. Approved theme descriptions are centralized metadata, never theme appearance changes. See [THEME_PICKER_LAYOUT_RESTORATION](THEME_PICKER_LAYOUT_RESTORATION.md) for actual verification and the missing-reference limitation.


## Explicit reference arrangement — current Daily Edit

This supersedes the previous reflection-row/right-only experiments. Left is Forecast, Priorities, Movement, Water, Mood, Reflection, Day in Three; right is Little Rituals, Plan, Meals, Day Pulse. Reflection is an independent card with the same Morning/Evening selection and date/period records as Mood; each period keeps its own draft and saved text. Each card is in an independent natural-height stack with the same shared gap. Content growth moves only later cards in its own stack; preserve Ritual scrolling and all existing data/controls. There is no shared reflection row or nested reflection grid in Daily Edit. [DAILY_EDIT_STACKS](DAILY_EDIT_STACKS.md) records the earlier layout verification before the Reflection card was added. Theme-picker copy and all palettes are unchanged by this correction.

## Production readiness Phase 1 — authentication and self-deletion

**Implemented and verified locally:** explicit canonical HTTPS application/Supabase origins for staging/production; paired loopback development endpoints; no request-derived or localhost fallback for missing configuration. Magic links remain invite-only (`shouldCreateUser:false` plus Supabase signup prohibition). No hosted environment was created or changed.

Settings now supports authenticated, same-origin, explicitly typed DELETE confirmation for the current account only. A server-only Auth admin hard delete invokes existing owner/dependency cascades in one Auth database transaction; no piecemeal domain cleanup or new migration. Success requires an acknowledged matching user or a verified missing-user response after uncertainty. Failed/unconfirmed operations do not claim success. Confirmed deletion clears project auth/PKCE/return cookies and HTTP cache, broadcasts a transient logout signal and fully navigates away to dispose private providers/drafts/router memory. Appearance preferences remain. Outstanding JWTs may remain cryptographically valid until expiry; server identity checks deny the removed account and owned records are gone.

These decisions supersede earlier phase statements that self-service deletion was unavailable. Export is offered before permanent deletion; backups follow the eventual deployment retention policy and are not promised immediate erasure. Storage/attachments are currently disabled; introducing them requires revisiting deletion orchestration. Hosted email, invitation administration, TLS/proxy behavior and actual deployment retention still require staging verification. See [PRODUCTION_READINESS_PHASE1](PRODUCTION_READINESS_PHASE1.md).

## Mindspace — separate notebook and thought board

The latest critical correction supersedes the earlier shared-record proposal. Notes keeps knowledge; Constellations catches thoughts. They share Mindspace navigation and appearance, never content records, IDs, tags or save commands. Existing Notes are preserved in place, including anything captured during the prior shared implementation; no automatic migration or speculative classification occurs.

Constellations has independent owner-scoped cards, hashtags, private image assets, revision checks and idempotent commands. Mindspace opens directly to Constellations without a view selector. Notes is temporarily hidden from normal navigation, while its implementation and records remain intact; an explicit `/notes?view=notes` URL retains compatibility. Remember Constellations layout choices. Search and hashtag-board controls precede the board results and one bottom sync footer. The single quick-capture composer is hidden by default and opens below search; closing preserves an unfinished draft. Add/Edit Tags live in anchored floating popovers, not the page flow. Titles and tags are optional. Support text, directly interactive checklists, mixed images/text, pinning, optional dated reminders and confirmed deletion. Hashtag boards filter one canonical card collection; a card can belong to multiple boards without duplication. Tag color is canonical and changes associated chips/edges automatically. The first attached tag in stable order supplies the card's subtle edge; legacy card accent data remains stored but is not offered in the UI. Deleting a tag detaches it without deleting cards. Multiple selected hashtags use AND matching, and Lists/Reminders compose with search. Reminders are in-app dated markers, with no notification delivery. Default created ordering stays stable on ordinary edits; recently-updated sorting is an explicit choice. Mindspace has no global date navigator in either view, though individual card/reminder dates and date sorting remain. Notes shortcuts must not alter notebook records while Constellations is active.

## Whimsy foundation status (local)

The five Whimsy experiences have separate owner-owned persistence and versioned curated references in the local database. Capturing an assignment is an explicit write; merely reading a page never creates history. Source-backed Insights and optional widget/habit projections use actual saved records, omit missing values, and never expose private journal excerpts by default. Weekly Side Quests now has a local complete UI and a published 200-quest reference library. Tarot is now implemented locally with a separate daily draw, 78-card library, and private journal. Dreamscapes is now implemented locally with an original 36-symbol starter library and an off-by-default Daily Edit preview. The later Fortunes local section below supersedes its foundation status. Bookshelf full UI, other Daily Edit widgets, and automatic Ritual completion are not implemented. See [WHIMSY_FOUNDATION](WHIMSY_FOUNDATION.md). This checkpoint does not alter the approved Daily Edit layout or themes.

## Weekly Side Quests (implemented locally)

Each saved Monday-to-Sunday week has one owner-scoped draw. Users draw six distinct possibilities, reveal at most three positions, select exactly three, and explicitly seal the week; reading or opening the page never creates a draw. Individual rerolls preserve other cards and append draw history. Sealed selections do not change when the preferred draw experience changes; later swaps require an explicit confirmation and preserve a dated swap record. Completion is an explicit owner-owned record, reversible without penalty. Prior weeks remain visible. The preferred draw mode and vibe are saved per user with revision checks. Quest references are immutable catalog versions. The full experience is local only until its migrations are separately reviewed for hosted environments.

## Tarot data and interpretation (implemented locally)

Tarot is reflective, not deterministic prediction. Core card identity is stable across future decks, while each reading keeps its deck, spread, exact cards, orientations, local date/timezone, optional question/mood/tags, and original reflection. Exploratory readings enter the Journal only through an explicit save. The daily draw is owner/date unique and persists separately. Personal meanings never overwrite curated reference meanings; follow-up reflections append to history. Reversal preferences persist. Insights use actual saved readings only. All Tarot migrations in this slice are local-only and require separate hosted approval.

## Dreamscapes interpretation and privacy — approved / locally implemented

A dream's date is the date of the sleep experience selected by the user, distinct from the UTC timestamp when it was captured. Short fragments are valid. Dream emotions use the shared Mood vocabulary but never become waking Mood entries automatically. Encyclopedia associations are possibilities and reflection prompts, not predictions or diagnoses. A personal symbol meaning is private and remains separate from immutable shared symbol content. Recurring dream series are linked by the user, never asserted from a matching symbol alone. The Atlas and cross-module Insights count only saved records and leave missing days unknown. Dream text is not sent to third-party interpretation services. Account export and deletion cover private Dreamscapes records. The Dreamscapes Daily Edit preview is independently opt-in, off by default, and shows no private dream excerpt. It reflects only saved dreams for the selected date. Other Whimsy widget surfaces remain planned.

**Fortunes local implementation (hosted rollout pending):** A daily fortune is one immutable assignment for the user's intended local calendar date; an additional opened item is a separate recorded draw and never changes the daily assignment. Reading the Whimsy page does not create a draw or a saved discovery. Explicitly saving preserves a historical content snapshot and, for the Oracle, the question only if the user chooses to save it. Curiosities require verifiable primary source links and original summaries. Oracle/prophecy content is entertainment, never advice or a factual prediction. Optional Daily Edit placement is off by default; Insights uses persisted activity only. See [WHIMSY_FOUNDATION](WHIMSY_FOUNDATION.md).

### Bookshelf and Whimsy editorial integrity — approved, local implementation

Bookshelf tracks reading as explicit owner-owned books and completed sessions. Only one timer may be open per user; an unfinished timer is separate from completed history and survives refresh. Active reading time excludes pauses and is allocated by saved IANA zone across midnight. Pages logged through sessions, current book position, and total pages are different measures. Updating position does not fabricate logged pages; moving backward cannot generate negative pages. Session edits/deletion recalculate derived statistics. Bookshelf's optional Daily Edit widget is off by default, and a reading habit may consume source-derived daily duration only after explicit opt-in in a future Ritual integration. No automatic Ritual write is implemented. Curated Whimsy content keeps stable IDs and versions; newly written content remains draft until editorial approval and source verification where factual.

## Whimsy MVP navigation — approved local behavior

The base `/whimsy` route opens a five-experience overview hub. The Cosmic Observatory opens Horoscopes by default. My Cosmic Profile is a settings modal opened from a clearly labeled header button, not a primary section or Whimsy landing page; closing it preserves the current Observatory section. Explicit `?view=` links to Observatory content sections remain stable across refresh and browser navigation. The shared Whimsy tabs are ordered Observatory, Tarot, Dreamscapes, Fortunes, then Weekly Side Quests. Bookshelf is presented under Collections using its existing records and services; `/whimsy/bookshelf` redirects to `/collections?view=books`, and the saved widget preference remains valid. The five experience cards on the Whimsy overview lead directly to their existing destinations.

## Cosmic Observatory forecast decision — approved scope, provider unresolved

The Cosmic Observatory is an approved sixth Whimsy experience. Real daily, weekly and monthly horoscopes for all twelve zodiac signs remain required; the earlier choice to continue independent features while leaving the provider unselected was temporary sequencing, not permanent deferral. The current provider investigation must prioritize FreeHoroscopeAPI and must not introduce a recurring subscription. Local natal calculations remain the approved independent calculation authority; do not duplicate them through a hosted provider or send private birth details for public sign forecasts. Daily Edit and Observatory must share one forecast service and canonical sign preference. Only verified provider categories may be exposed. Provider freshness, licensing, cache/saved-reading rights and authenticated web/PWA compatibility must be reviewed before activation. See [provider research and actual-response evidence](ASTROLOGY_PROVIDER_RESEARCH.md). No provider is activated by this decision record.

**Current local Observatory implementation:** The protected sixth Whimsy destination, local profile/chart/library/calendar/journal, shared unavailable forecast contract, and actual-record Insights/recap projections are implemented. Temporary sign browsing remains separate from the saved canonical sign. The 58 original library entries are functional editorial drafts pending approval. Real horoscopes are still required and blocked by provider freshness/rights decisions; no live content, paid service, hosted migration or deployment is implied. See [implementation and QA](COSMIC_OBSERVATORY_IMPLEMENTATION.md).

## CosmyDay forecast MVP — approved November 2026

CosmyDay is the approved no-cost source for the three overview horoscope periods. The earlier provider-unselected language above describes the previous implementation state. Daily Edit and Cosmic Observatory share the same authenticated server route. Only a forecast whose provider period covers the reader's current local date may be displayed. Source text is cached in server memory for at most 15 minutes, with no stale fallback, durable snapshot, account export or offline copy. Display a visible CosmyDay link with every forecast. Other life-area categories remain unsupported. Production release requires a separate approval.

## Sidebar navigation and Collections placement — approved

The desktop sidebar has one viewport-bounded vertical scroll region containing the brand, Everyday (Daily Edit, Planner, Rituals, Wellness, Insights), Life (Money, Mindspace, Collections), Whimsy (Astrology, Tarot, Dreams, Fortune & Fun), then the Themes, Settings and Sign Out utilities. There is no Reflect group. Each sidebar label is the page destination: Astrology opens the Cosmic Observatory on Horoscopes, Tarot opens Tarot Sanctuary, Dreams opens Dreamscapes, and Fortune & Fun opens Weekly Side Quests by default with Fortunes & Nonsense as its second view. Weekly Side Quests is not a separate sidebar destination, and Whimsy pages do not repeat a cross-experience navigation row. On tall screens the utilities rest toward the bottom; on short screens every control scrolls with the rail. The main page scroll remains independent. Expanded utilities are labeled rows; the collapsed rail shows icons with accessible labels and native tooltips. The mobile bottom navigation keeps Today/Planner/Rituals/More; More lists the remaining destinations under the same group headings.

Collections is the approved future top-level Life destination between Mindspace and Whimsy. Its planned sections are Overview, Books, Movies, TV Shows, Games and My Collections; series details belong within the relevant media experiences and overview. The current Bookshelf remains in Whimsy until Collections has a functional destination and a separately reviewed move preserving all book records and deep links. Do not expose a placeholder Collections route as working navigation.

## Tarot Grimoire manuscript status — approved integration, local draft

The owner-supplied 78-card JSON manuscripts are the primary editorial source for the six-chapter Grimoire experience. The original files and their draft statuses remain version-controlled source material. Canonical Muse card IDs, artwork, private interpretations, saved readings, and dream records retain their existing identity and persistence. Swords court manuscript IDs are aliases to the four existing numeric card IDs. A local preview is not publication approval; editorial review is required before deployment. The Dream Encyclopedia page architecture reuses the 36 existing entries and creates no unsupported interpretations.

## UI Polish Batch 2 — approved navigation and Planner terminology

Daily Edit priorities and Planner task cards use the same task completion record. The Daily Edit plan preview omits tasks designated as priorities for that date; the full Planner retains every task. Planner's primary organization language is Workspaces and independent Tags. Earlier workspace-scoped Group records are retained as editable legacy tags so existing names, colors, and task associations are not silently deleted; new tags use the independent Tag model. A later data migration may remove legacy Group storage only after its associations are safely converted. Persistent bottom save-status footers are hidden when there is no error or unsaved draft; save behavior and recovery remain intact. Primary module navigation uses rounded pills, while within-module navigation uses the Fortune Cookie inset selected marker.

## UI Polish Batch 3 — approved Collections arrangement

Books presents Reading Desk and My Library on the same screen. Reading Desk features every Currently Reading book from the canonical library record; My Library retains the complete collection, filters, sorting, and status movement. Reading Atlas remains a separate Books view. Movies, TV Shows, and Games may feature records with their existing Watching or Playing status above the complete category catalog. These featured areas create no separate records or statuses. Dreamscapes keeps its diary view controls with search and filters. Observatory keeps the sign summary card and places Explore Sign above Change Sign beside it; My Cosmic Profile remains a header button opening the existing settings modal.

## UI Polish Batch 4 — approved display behavior

The Daily Edit Bookshelf widget displays one explicitly chosen Currently Reading book, saved in the existing owner-scoped widget preference. A missing or no-longer-active choice falls back to the first current read without changing the saved choice. Collections retains every active book. Featured Reading, Watching and Playing shelves use a bounded horizontal carousel with three desktop, two tablet and one mobile cards visible; the full library remains below. The carousel does not truncate or duplicate saved records. Unsupported emoji remain valid saved Unicode but display a clear fallback on devices without the glyph.

## UI Polish Batch 5 — approved control behavior

Collections overview date filters use the existing Muse calendar and allow a selected date to be cleared. Filtering changes no collection records. Planner task cards show the workspace icon in its saved color beside independently editable tags. Workspace and tag pickers stay separate; older Group records remain available as legacy tags under tag management until their associations can be safely converted.

## Collections consolidation — approved by issue #9

Collections opens on its existing Overview with Board and Library modes; media chips are the primary category selector. The former top-level media row is hidden, while its routes remain valid for detail, creation, Reading Atlas, Series, and My Collections. Advanced filters are collapsed initially and retain their values when hidden. Per-user opening mode, media category, and In Progress shelf visibility are saved in Supabase Auth user metadata without a new table; temporary browsing choices do not change those defaults. The compact In Progress shelf projects the same canonical books and media, linking to their existing tracking flows. Genre selection adapts to existing comma-delimited Book text and media genre arrays without deleting unfamiliar saved values. One to three optional Book emojis use the existing review field.

## Book and TV series organization — approved

Book series group canonical book records in a user chosen reading order. Each book retains its own reading, rating, review, and session history. Series progress counts finished released mainline books; announced or unknown installments remain visible without being treated as read. A series is Caught Up when all known released mainline books are finished and its conclusion is ongoing or unknown. Completed requires an explicit concluded state and no announced installment. Book detail links to the series detail; the Series route remains contextual, without a new permanent navigation level.

TV shows remain the parent records for optional season summaries and episode records. A season can be marked watched or tracked with simple manual counts; episode activity remains optional and independently preserved. Released seasons and episodes determine current progress; announced seasons and episodes do not reduce the available progress count. A TV series is Caught Up when all known released seasons are watched and its conclusion is ongoing or unknown. Completed requires an explicit concluded state and no announced season. Unknown conclusion never implies completion. Existing manual show status, series memberships, episode records, and viewing activity remain intact.

## Installed app — approved

Muse opens standalone when installed. Offline caching and service workers are not part of this decision and need separate approval. On iPhone, an installed app keeps its own session separate from Safari: email code and Google sign-in work inside the app, but an emailed magic link opens in Safari and signs Safari in, not the installed app. User-selectable themes are unchanged; only the status-bar color follows the active theme.

## Book lookup — approved

Book lookup only assists manual entry; saving a book never depends on an outside service. Imported values fill only empty fields or fields a previous import filled, so the reader's own entries are never overwritten; "Clear imported details" removes only imported values. Existing books are never changed by lookup; any future metadata refresh requires explicit confirmation. Missing information stays missing: page counts come only from edition-specific records (never work-level medians), formats map only when clearly stated, and genres map only onto Muse's existing book genres. Imported page counts set Total pages only, never the starting or current page. External text is stored and rendered as plain text, and covers must be HTTPS. Every book write (editor save and shelf status moves) carries the optional lookup fields so they are never silently dropped. The Google Books key is server-only and never exposed to the browser. Lookup uses free services only.


## Reading tracker integrity and statistics — approved

Muse is the reader's primary reading tracker, so reading records are never reset, replaced or silently removed.

- **Timer.** The running timer lives on the server and survives refreshes, closed browsers, app updates and device switches. An uninterrupted stretch longer than 3 hours is never saved without the reader's answer: on return (open, refresh, resume, other device) or at Pause/Finish, Muse asks "Were you reading the whole time?" and offers keep, "I stopped at", "I read for" and "discard this stretch". Long reads are valid; earlier reading in the session is never removed, and a corrected timed session stays timed. A confirmed stretch is not asked about again.
- **Offline.** A timer change that cannot reach the server is kept on the device with its original time and shown as "not synced yet"; it is never presented as saved. On reconnect the identical command is retried once; if the session changed elsewhere, the server copy wins.
- **Pages.** Pages read and current position are separate. A reread records the pages read (pages 100–120 is 20 pages) and never moves the current place; changing the current page in the book editor never counts as pages read. Pages are never negative.
- **Completions.** Every finished read is a completion. Rereads add a completion and never erase an earlier one; starting a reread opens a new reading cycle. Books completed counts completion events, unique titles counts distinct books, and annual "books" goals count completion events. Earlier reads can be corrected or removed explicitly in the book editor. An existing finish date counts as one completion; no completion is invented.
- **Archive.** A book with reading history is archived rather than deleted: it leaves the shelves, Collections and the Reading Desk, while its sessions and completions keep counting. Archived books are restorable. Permanent deletion of a book with history requires an explicit acknowledgement that states the sessions, time and pages being removed.
- **Statistics.** Calculated only from saved records, always live (no stored totals), so edits and deletions apply everywhere immediately. Active time excludes pauses and is split at local midnight in each session's saved timezone; pages stay on the session's saved date. A reading day is a local date with time or pages, counted once. The current streak counts consecutive reading days ending today, or ending yesterday until today is read. Pace = pages ÷ active hours using only sessions with both. Average session uses timed sessions only. Completed-read averages use only reads that have the measured value. Calendar completion time is inclusive. Time-left estimates need at least two timed sessions with pages (20 minutes total) for that book.
- **Scale.** Every Whimsy record is read page by page with no ceiling, so all-time statistics stay complete.
