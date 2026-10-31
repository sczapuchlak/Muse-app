# Insights MVP engineering — authoritative derived reads

## Status

Implemented and locally validated. Insights has **no separate personal-history tables, analytics events, writable summaries or materialized Dayprints**. It observes authenticated canonical owners through one typed adapter (`lib/insights/persisted.ts`) and existing subscriptions. UI Session 3 remains separate and has not started.

## Audit: what was already correct

Existing Overview, Plans & Rituals, Mood & Energy, Money, Wellness (legacy `nourish` view ID), global periods/comparisons, chart value tables, evidence disclosures and date drawer were retained. Planner creation/current-planned status and captured completion transitions, recurrence-aware Ritual opportunities/streaks/weekly values, optional daily Pulse aggregates, Money category shares/allocation actuals, and meal-plan/nutrition coverage already had usable calculation boundaries. Sources now have real persistent stores; rebuilding them was unnecessary.

Actual gaps: prototype provenance/notice survived those migrations; loading gated only the daily range; completed movement was omitted; the inspector used only whatever daily dates happened to be cached and constrained selection to the chart range; a Pulse-only day could trigger the entire Overview's empty state; daily Pulse normalization lacked defensive deduplication/rating validation; missing Money dates were charted as zero; no-current-record spending could be described as a decline; weak revelation thresholds could overstate sparse/explicit-missed logs. An overlapping daily range read could overwrite a newer response without a local edit.

## Authoritative source matrix

| Owner | Persistent read / source | Insights use |
| --- | --- | --- |
| Daily Edit / Mood | `read_daily_days`, daily records, priority projection, independent check-ins/emotion/influence joins; DailyStore | Daily Pulse, intention/emoji, Day in Three, Morning/Evening, history inspection; no duplicate priority accomplishment |
| Planner | `read_planner`, tasks, classification, closed timer records, append-only completion events; PlannerStore | Captured/current planned/completed metrics and historical transitions |
| Rituals | `read_rituals`, definitions/groups, entries and inactive intervals; RitualsStore | Canonical opportunity/cell/streak/weekly helpers, historical lifecycle semantics |
| Wellness | `read_wellness`, assignments, activities, movement intentions, daily hydration snapshots; WellnessStore | Planned meals, optional known nutrition, planned movement vs explicitly recorded activities, dated water/goal/unit |
| Money | `read_money`, normalized transactions/splits/classifications, paychecks/allocations, cards/payments, recurring definitions; MoneyStore | Canonical spending/category shares/allocation actuals, current plan snapshots, explicitly projected obligations |
| Settings | Existing authenticated profile with saved IANA timezone | Today, creation-timestamp conversion and period context; no device-zone fallback |
| Notes | No existing Insights metric or integration | Deliberately not read or converted into activity counts |

No sample fixture or browser storage is used as authoritative history. The source notice/provenance now accurately identifies saved manual records. Fresh accounts stay empty; read navigation never creates daily records.

## Metric contracts

| Existing metric | Definition / scope / missing-data behavior |
| --- | --- |
| Current planned task completion | Currently complete tasks / tasks whose current planned date is in the inclusive range. It is a present plan snapshot, not an immutable historical completion rate. Moving/removing a priority does not delete a task or mean failure. |
| Creation/completion trends | Creation timestamp converted using saved profile timezone; completion transitions use their **captured local date/timezone**, including reopened/deleted tasks. Transition IDs are deduplicated. Re-completion remains a separate transition, explicitly not another distinct task. Priority records are not added again to these counts. Legacy undated completions stay disclosed/undated. |
| Workspaces/groups/time | Current task classifications for tasks planned in range. Actual minutes are closed/cumulative saved task snapshots; estimates stay independent. No fabricated per-day running-timer history or unsupported goals/Aspirations metrics. |
| Daily Ritual goals | Existing `ritualOpportunity`/`ritualCell` across elapsed scheduled dates; Complete, Partial, explicitly Missed and Unknown/Open remain distinct. Unscheduled/future dates excluded; missing logs never become misses. |
| Ritual lifecycle and streak | Existing `ritualStreak`, as of min(range end, today). Inactive intervals skip obligations; archived historical achievements remain; deleted definitions do not reappear. No competing streak engine. |
| Weekly targets | Existing `weeklyValue`, whole Monday–Sunday totals clipped at today, with partial-range overlap labelled. One session is not four; above-goal values remain real. Entire inactive weeks have no goal opportunity. |
| Feelings/influences | Independent Morning/Evening records; each emotion/tag counts once per session, multiple selections allowed. Families retain canonical Yale quadrant identities. No absent-session emotion is inferred. |
| Day Pulse | One authoritative daily Energy/Stress/Overall Day set, never session averages in production. Optional nulls excluded from each mean independently; weekday means require three distinct rated dates. Daily observations are date-deduplicated and 1–10 validated. |
| Hydration | Actual per-date totals with that date's goal/unit snapshot. Goal attainment only on known positive goals; no setting backfill, no missing-day failure. Different units are not pooled into a fabricated total. |
| Movement | Existing intent counts remain planned. Explicit activity IDs are deduplicated, including owner/date/type duplicates, and drive a separate Recorded movement series and historical inspector summary. Missing intent is not an explicitly empty intent, and a plan never becomes a completion. |
| Meals/nutrition | Dated assignments are **plans**, not confirmed consumption; saved templates alone are not activity. Known nutrition coverage/fully specified subsets retain the existing calculation; missing fields are not guessed. |
| Spending/category/trends | Canonical `spendingTotal`/`periodTransactions`/`categorySpending`. Splits contribute only shares plus unassigned remainder. Category drilldown reuses canonical shares, including explicitly uncategorized split parts. A no-transaction chart date is a gap; a recorded zero transaction remains zero. Period total describes recorded spending, never proof of all real-world spending. |
| Income/allocations | Paychecks with received/expected date in range; actual income only where recorded. Whole-plan allocation intent and linked/manual known actuals remain current snapshots, not prorated historical expense totals. Missing actual is null, explicit zero stays known. |
| Recurring expectations | Current active definitions projected over the selected range using existing anchor rules. Not historical charges or historical schedule-version reconstruction. Editing/pausing changes the projection, never recorded spending. |

### Financial exclusions and unsupported features

Card payments/undo, explicit dated opening balances, allocations, paid bill flags and recurring projections are not extra expenses. Earlier purchases can count as historical spending while correctly being excluded from a card's post-opening-balance reconciliation. Insights does not mutate or recompute balances with a second engine. Edits/deletion/reclassification flow from the Money owner and canonical helpers.

The existing Money MVP has no general transfer/refund/negative-adjustment transaction type or multicurrency accounting. Do not guess exclusions from merchant text or invent a second financial taxonomy. Separate card payments are the existing debt-settlement representation; arbitrary transfers/refunds require the future canonical Money design first. No historical account-balance series or frozen past classification is claimed.

## Dates, comparisons and inspector

7/30/90 days, year-to-selected-date and custom periods retain inclusive date boundaries and the existing 732-day maximum. Previous range is the immediately preceding equal-length period with no overlap, not year-over-year. Missing/zero comparison bases never create a percentage; Money comparisons require recorded transactions in both periods. Partial/future selection remains labelled by the selected dates: Ritual obligations use elapsed dates, current task plans remain current, and recorded timestamp data is never extrapolated.

Calendar dates remain dates. UTC timestamps are converted only where needed; captured completion local dates and historical daily records are never relabelled on travel. Invalid/missing saved timezone is an explicit UI error. Existing DST/leap/year-boundary helpers remain authoritative.

The unchanged native-date drawer loads its selected date independently via DailyStore, including dates outside the current chart range, without creating a record. It stays mounted through loading and preserves scoped loading/pending/error/retry behavior. Displays saved intention/emoji, Day in Three, independent M/E and Pulse, actual movement/hydration, current plans/completion transitions, spending and meal plans. Navigation carries the selected civil date. Calendar replacement, placement/styling and financial/life content separation remain UI Session 3.

## Reliability, ownership and performance

- Shared owner stores continue to handle authenticated RLS reads, focus/online refresh, cross-window notifications and local subscriptions. Existing user/session provider boundaries isolate ownership; no service key enters application code.
- Analysis is hidden while any contributing owner is loading, failed or has unconfirmed pending/draft changes. It never treats failure as an empty account or reports optimistic changes as saved analytics. Retry delegates to existing owners; conflicts/drafts are resolved in their owning module, never silently discarded by Insights.
- Daily range retrieval is paged in100-date pages. Current+previous requests are bounded to at most1464 dates; inspector requests only its selected date. There is no request per plotted point.
- A small monotonic read-order guard now prevents an older overlapping daily response from replacing a newer accepted read. Existing local-edit epochs and write/conflict semantics are preserved. Influence metadata gets explicit loaded state so partial labels are not mistaken for complete data.
- The adapter/analysis memoize owner snapshots; chart hover/dialog state does not create another fetch framework. Other owners retain their established bounded snapshot limits (Money/Rituals/Wellness), not new unbounded analytics queries.

## Revelation evidence

Existing deterministic rank/basis/record IDs/disclosure remain. Current planned-task counts are explicitly snapshots. Completion comparisons need at least three transitions in each period and equal-length ranges. Ritual rhythm requires at least three completed goals, at least three logs and50% recorded coverage; explicit missed logs cannot generate accomplishment praise. Feeling observations require at least three check-ins, water at least three known-goal days, meal rhythm at least three planned dates, and financial category observations at least three transactions. These are descriptive thresholds, not statistical significance claims. Existing relationships require their paired-date counts and variance; no causation/clinical claims, AI prose or fabricated encouragement.

## Verification and readiness

- **278 unit/render/store tests passed**, including new source-readiness, stale overlapping reads, linked history deduplication, planned/actual movement, dated hydration, independent M/E/day Pulse, financial parity through edits/undo/delete, sparse evidence/missed logs, leap/DST/previous-range tests. Existing source-domain regressions remain passing.
- `npm run test:insights` passed against disposable local authenticated accounts: production adapter over all persisted owners, empty/sparse state, linked priority completion/reopening, archived Ritual history and weekly target, activity/intent separation, water/meal plans, Money baseline/payment/edit/delete parity, fresh-session persistence, read-only derivation, cross-user and anonymous isolation. Accounts and dependent records removed.
- Live local browser: Overview and all views, period changes, saved-timezone inspector default, historical dates outside the chart range with M/E/Pulse/Wellness values, Money parity, source update on focus, blocked-source error/retry, refresh and1440/768/390px containment passed. Charts were allowed to finish responsive resizing before measurement; the first immediate resize measurement was a harness timing failure, not counted as a pass.
- TypeScript, ESLint, production build and whitespace checks passed. No SQL changed; no migration or database lint run was necessary. Existing RLS/RPC contracts were exercised by the API suite.

Ready for code review and the separately authorized UI Session 3. Not a hosted deployment/security/operations signoff. Large historical workloads may eventually need paginated domain APIs/server aggregation; no new analytics tables are justified for the current MVP. Notes/aspirational goals, connected Rituals, health integrations, true meal consumption, immutable financial schedule/balance history and unsupported financial types remain unavailable rather than fabricated. No commit, push or deployment.


Presentation follow-up: [UI_SESSION_3](UI_SESSION_3.md) now implements the previously deferred calendar, action hierarchy and personal/financial content separation. The metric and persistence contracts in this report remain unchanged.
