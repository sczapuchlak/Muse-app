# Muse product rules

Approved product direction. Implementation status lives in FEATURE_SPEC.md.

“Your plans. Your rituals. Your feelings. Your future. All beautifully yours.”

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
| Money | Records, budgets, transactions, payment semantics | Future relevant summaries |

Never create disconnected duplicates because information appears on multiple pages. Planner owns plannedDate; plannedDate and dueDate are separate. Rescheduling is not failure, does not change dueDate, and does not duplicate a task. Events remain distinct from tasks.

## Planner context

Planner is a planning environment: **global Muse navigation → Planner planning rail → rolling three-day planning canvas**. The secondary rail is a staging/source area, not “Day 0” or a second app navigation. Desktop uses a bounded 260–320px rail beside a flexible day canvas. The rail contains compact Search, one Filters/Today/previous/next utility row, a user-defined workspace switcher, an unscheduled pool, and quick task creation. The workspace menu includes existing contexts, counts, selection and New workspace/organization management. Workspace answers “Which world am I planning from?” Groups/tags classify/filter within that context. Selected workspace scopes the source pool and canvas. Secondary group/tag/status filters live behind one compact Filters control in the planning utilities; compact search and filters refine the relevant task set. Workspace selection lives with the task pool, never as a permanent board-toolbar filter. The canvas divides available width between three useful columns, reducing to two when needed. Mobile focuses one day and opens Planning Space in a sheet with the same source semantics; never stack an oversized desktop rail above microscopic day columns.

Tasks can be captured unscheduled from the rail or planned directly in a day; both workflows create the same canonical task type. Today returns the rolling window to today; previous/next shift by one day, independent of calendar weeks. Moving or reordering a task preserves its ID, due date, and completion. Daily Edit continues to surface a bounded subset of the same Planner-owned records. Approved Planner eyebrow: “MAKE SPACE FOR WHAT MATTERS”; support: “Make a plan that can move with you.”

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

Schedule, goal and measurement changes must preserve historical meaning. The prototype freezes these after the first entry; effective-dated schedule/goal changes are planned. Milestone celebrations occur only on meaningful recurrence-aware threshold crossings, not every completion, and do not replay after undo in the same streak.

## Daily Edit

A date-based command center: What matters? What am I doing? How am I caring for myself? How am I feeling? selectedDate controls priorities, tasks/events, movement, water, meals, mood, and eventually rituals. Backdating is intentional. Dashboard collections must be bounded: movement/emotion/tag libraries use overflow and management surfaces. Planner preview limits are configurable (initially three events/five tasks), with accurate totals and links into Planner.

## Mood and insight semantics

Feelings answer “What am I feeling?” Influences answer “What might be shaping it?” Day Pulse answers “How am I doing?” Keep them analytically separate; never collapse them into one score. Energy, stress, and overall day are independent optional 1–10 values. Missing is not zero or negative. Relationships between mood, influences, habits, and movement may be compared statistically; correlation never establishes causation.

Capture structured data when useful: movement frequency, adherence/streaks, weekday emotions, influences, energy/stress/day trends, spending categories, plan versus actual, custom periods. Analytics should be colorful, satisfying, and statistically honest, supporting week/month/custom ranges where appropriate. Most Insights should use deterministic analytics. Muse does not require an AI product integration.

## Technical direction and privacy

Approved stack: Next.js, React, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/RLS, Vercel, PWA, private GitHub repository. Supabase/auth/backend/PWA installation are **planned**, not part of the local prototype. Independent private accounts are the future model; never assume every user is Stephanie.

Preview/staging uses test databases/data; production uses real databases/data. One codebase/repository, separate environment variables/databases. No account numbers in Money. No persistence of prototype domain records yet; theme and material preferences may use localStorage.

## Evolving decisions

Update these documents for approved durable decisions. Label implemented versus approved/planned versus future/exploratory. Do not promote brainstorming to product requirements. Preserve approved behavior unless explicitly changed.

## Bounded movement shelf

Selecting an overflow movement promotes it into the fixed quick shelf and demotes a least-recently-used unselected choice where possible. This never adds a chip slot or clears another selection. If selections exceed shelf capacity, their names remain visible in the compact summary; a More count alone is insufficient. Explicit pinning/preference controls are future direction, not a reason to grow the dashboard.

## Visual system decisions

Crystal and Frosted are shared optical materials, not layouts. Both preserve geometry and component hierarchy across Daily Edit, Planner, Rituals and Nourish. Atmosphere is system-wide and strongest in open/header regions, while dense data stays calm. Afterglow is near-black neutral charcoal/graphite with vivid LED-like pastel light, never a navy/teal base. Reusable interaction feedback respects reduced motion and never changes task/ritual semantics.

## Nourish ownership and organization

Nourish owns dated meal assignments and a separate reusable saved-meal library. Daily Edit reads and edits those same assignments, filtered by selectedDate; it must not maintain a separate meal list. Assignments support breakfast, lunch, dinner and snacks, including more than one entry per slot. Quick free text is a first-class meal, with an optional note and optional saved-meal reference. Nourish has three related but separate experiences: Plan (what and when to eat), Saved Meals (ideas intentionally kept for reuse), and Grocery List (what to buy). A saved meal is a lightweight reusable name, multiple meal types, optional note/link and optional nutrition defaults, not a recipe. Breakfast/Lunch/Dinner/Snacks are reusable metadata; one saved meal can belong to several types without duplication. Recent Meals reflects recent occurrences regardless of whether saved; it is not the intentional library.

Moving preserves assignment identity and changes date/slot/order. Copying creates a new assignment identity for every target date. Assigned names/notes/nutrition are snapshots: changing or removing a library item does not silently rewrite or erase an existing plan. Library deletion clears its references while retaining planned content. The initial week is Monday–Sunday; mobile focuses one selected day rather than compressing the full desktop view. Domain records remain session-local. Recipes, pantry inventory, automation and external food services remain future/exploratory. Manual groceries and optional nutrition are now part of the prototype.

## Daily Edit actions and fixed routes

A source badge identifies ownership and is informational; Manage is the separate action into broader module/category management. Edit changes a particular record, while Settings is configuration. Apply these roles where meaningful, without forcing a badge or Manage action into every card. Today's Plan uses a Planner badge and date-specific Manage link; Meals uses Nourish. Movement has Manage without a redundant badge; Water has Manage for goal/quick amounts and Edit for the day's quantity. Mood and Day Pulse gain no invented management action.

Navigation destinations use dedicated fixed routes. Implemented modules have their own page; future destinations reuse the clearly labelled placeholder presentation. The former generic `[module]` URL-param route is obsolete and removed. Unknown paths return 404; do not retain dynamic routing merely to render a finite navigation registry.

## Optional nutrition and shopping

Nutrition tracking in Muse is optional context, not the center of the experience. Calories (kcal), protein/carbs/fat (g) may be entered independently; none blocks meal creation. Accept finite nonnegative decimals. An entered zero is known; blank is unknown. Saved Meal macros are reusable defaults copied to a specific occurrence. Occurrence edits never silently change the template, and template edits never silently rewrite historical meals.

Daily totals sum known values across all entries and disclose incomplete data, including per-field coverage. No data means no summary, not a row of zeroes. Daily Edit retains a compact summary; full Nourish displays four fields. Do not infer calories/macros from names or add lookup, barcode, micronutrients, diet scoring or nutrition analytics. Targets are FUTURE/EXPLORATORY.

Grocery List is a manually maintained shopping companion with stable item and section IDs, item name, optional quantity/note, completion and removal. Group by shopping section; checked items remain visible and recede until explicitly cleared. A future optional Saved Meal → Grocery List connection is APPROVED/PLANNED; no ingredients are required, generated or inferred. Custom section management is planned; pantry/inventory is not part of this feature.

## Vivid color and Nightbloom balance

Muse is not a muted productivity product. Its structure is sophisticated and restrained, but its color identity is vivid, luminous and joyful. Atmospheric color may be soft and dimensional; interactive and magical accents use deliberate high-chroma pops, like small sources of light. Sophistication comes from controlled distribution, never automatic desaturation or globally lowering accent opacity.

Nightbloom combines BOTH teal/peacock/emerald and wine/black-cherry/garnet/raspberry/rose. Its header composition is cool left → dark dimensional center → prominent warm upper-right → cool lower-right, with subtle rose bleeding toward the center. Warm light must also appear in functional accents. Avoid tomato/orange-red, brown-maroon, Christmas blocking and monochrome green. Astral is electric blue/cyan cosmos; Prism Noir keeps blue/violet/fuchsia refraction; Afterglow is almost-black neutral graphite with intensely luminous aqua/mint/lilac/periwinkle/hot pink/peach points, without genre-specific cyberpunk UI.

## Celestial heroes and stable pickers

Every primary Muse module receives a unique celestial visual signature derived from the meaning of that module. Shared primitives and theme tokens create consistency; composition creates personality. Large intentional negative space is an editorial illustration canvas, not automatically space to compress or leave empty. Functional titles and controls dominate. Module eyebrow copy is a mantra/philosophy, with a warm poetic-functional subtitle.

Approved signatures/copy: Planner maps paths and possibilities (MAKE SPACE FOR WHAT MATTERS / Make a plan that can move with you.); Rituals expresses orbits/return (A RHYTHM OF YOUR OWN / Small things, returned to.); Nourish is cosmic botanical (NOURISH WHAT CARRIES YOU / A little something to look forward to.). Future module signatures and mantras require intentional design; examples for Money/Mood/Insights/Notes are exploratory, not implemented features. Do not mechanically reuse one tiny constellation or force identical hero heights.

Daily Edit retains its separate profile-driven constellation between greeting and right controls. The brighter three-star signature and Theme Picker stay on one horizontal row, stars immediately LEFT; date and week sit below. Sidebar logo decoration may use tiny independent MuseStars, never a line through/from the logo or toward the collapse control.

Substantial searchable pickers use persistent search/filters, one scrolling results region and persistent confirmation. The Mood feeling picker is a responsive native modal; no scrolling header, whole-dialog scrollbar or second vertical results scrollbar. Preserve vocabulary IDs, quadrant meaning, selection and focus accessibility.

## Ritual completion presentation and daily progress

Progress visualization answers “How far did I get?” Completion answers “Did I finish?” Partial quantity/duration uses a ring/value. Completed quantity/duration retains the actual value in a filled control with a small check badge, never a full/double progress ring. Binary completion uses a filled check. Missed uses ×, unlogged/unknown an open indicator, not scheduled a neutral dash, and upcoming the subtle future affordance. Underlying log states/history do not change.

The Ritual week strip shows full completed scheduled daily goals / scheduled daily goals. Partial remains a separate state and does not receive full completion credit; no new fractional-adherence model is introduced. Future days and days without daily obligations have no 0% bar. A day with at least one daily obligation and all such goals met earns a small MuseStar; undo removes it, and initial loading does not celebrate seed history. Weekly-target logging days are not daily obligations: weekly goals and their completion remain separately visible. Unknown past records remain Unknown, never reclassified as Missed by this progress view.
