# Rituals MVP — local persistence and completion semantics

**Lifecycle completion:** the final addendum below supersedes the original archive/pause/delete exclusion. The original pass remains as a historical implementation checkpoint.

## Audit and preserved scope

The pre-migration `RitualProvider` used `MuseSession` in-memory state with `ritualsSample`, surviving client navigation but resetting on refresh. No Rituals SQL tables, durable browser storage or prior Supabase persistence existed. No sample definitions/history are imported. The prior Wellness milestone was committed separately before this task; it was not rebuilt.

Existing capabilities retained: user groups with names/icons/theme/custom colors/gradients/collapse; ordered rituals; checkbox, numeric quantity, duration in minutes and weekly-target session counts; daily, one weekly weekday, or selected weekdays; explicit start date; dated historical correction/clear; partial/complete/explicit missed/unknown/upcoming/unscheduled states; recurrence-aware streaks and Monday-first weekly totals. Duration has a minutes-entry sheet, not a running timer; numeric uses absolute quantity correction, not an incremental counter. No new timer/tracking/editor system is added.

The existing product has **no ritual archive/pause/delete control** or corresponding state. This pass does not invent those workflows. It preserves empty-group deletion (keep at least one group; move rituals before removing an occupied group), and rejects omission of existing ritual definitions rather than treating a missing client row as deletion. No deleted habits are silently recreated. Description and per-habit icon/color are not existing fields; customization belongs to groups.

## Implemented

`RitualProvider` is now one authenticated owner-scoped persistent store for all existing consumers. It exposes canonical definitions/entries to any future Daily Edit/Little Rituals consumer. The inspected Daily Edit has **no Little Rituals widget**; none is built or redesigned. Existing Insights consumers read the same provider, without new analytics/derivations. Planner and Wellness do not automatically complete rituals.

Checkbox cells directly cycle **Not Logged → Completed → Explicitly Missed → Not Logged**. A semantic cycle action applies against the latest queued state, so rapid clicks compose correctly rather than repeatedly acting on an old render. One owner/ritual/date key identifies the observation: value1 is completed, value0 is explicit missed, and clearing removes the row. Missing days are never backfilled as missed. Numeric/duration/weekly cells keep their existing entry sheets and explicit missed/clear controls. Progress values are preserved above goal, up to a validated technical bound of1,000,000; fill may cap, measurements never cap to the target.

Weekly-target values sum the existing per-date **session quantities** across eligible Monday–Sunday dates. One dated row prevents retry/double-counting; a user-entered quantity6 intentionally means six sessions, not six duplicated records. The UI displays **6 / 4**, **Goal reached**, and **2 above goal**. Correcting/clearing an earlier date immediately recomputes the affected week. Quantity and duration remain daily-goal types; the current UI does not configure weekly measured minutes/pages, so no new measurement modes are inferred or introduced.

Schedules/targets can be edited before logs exist. Once retained history exists, type/goal/unit/schedule/start date remain locked both in the reducer and database, while name/group remain editable. This preserves the approved current UI contract and prevents historical reinterpretation. Effective-dated editing is **planned, not implemented**; the blueprint's future `ritual_versions` is not falsely claimed as present. Clearing all observations currently removes the history lock, matching existing behavior; an immutable schedule-change ledger is a future separately approved feature. Edits never fabricate completion entries.

## Database and security

Additive migration: `supabase/migrations/20261101001100_rituals_mvp.sql`.

- `ritual_groups`: existing customization, collapse and display order.
- `rituals`: stable UUID, owner/group reference, type/goal/unit, recurrence weekdays/start date, capture timezone, display order and server timestamps.
- `ritual_entries`: composite primary key(owner, ritual, local_date), finite bounded nonnegative quantity, explicit recorded/missed outcome, original capture timezone and server timestamps. No competing stored completion/streak score.
- `ritual_versions_owner`: conservative per-user command revision; **not schedule-version history**.
- `ritual_commands`: stable receipt/hash/revision for safe retries, including uncertain acknowledgements.

RLS permits only owner reads. Anonymous RPC access and direct client writes are denied. Invoker `read_rituals` returns one consistent domain snapshot. Definer `save_rituals` derives identity from Auth, locks the owner's revision, validates ownership/schedules/values/customization and saves atomically. Cross-owner UUID reuse and references are rejected. Duplicate dated outcomes, future new logs, unscheduled/pre-start logs and unsupported historical setting edits are rejected independently of UI checks. Empty-group removal cannot erase attached history. Deferred owner references plus account cascades permit disposable-account cleanup without weakening normal deletion restrictions.

The existing Settings owner-only JSON export now includes Ritual groups/definitions/observations; no command receipts or playback keys are exported. User-facing account deletion remains separately scoped.

## Reliability and dates

Typed data access and the small command lane reuse the established Notes/Wellness architecture: no new persistence framework or dependency. Initial load gates capture. Stable form IDs and command receipts prevent duplicate definitions; retry never repeats an increment/cycle. Failed or ambiguously acknowledged writes retain complete drafts and offer Retry, JSON review/copy, or explicit discard/load-latest. Concurrent writes raise a conflict instead of silently rebasing over another client's values. Generation guards prevent stale reads from overwriting newer edits; an acknowledged save followed by a newer competing revision is also treated as a conflict.

All module consumers share one provider. User-scoped tab notifications, focus and reconnect refresh confirmed data; cross-device updates appear on focus/reload rather than a new Realtime subsystem. Pending drafts are tab-local with before-unload warnings, not offline persistence. Milestone playback suppression remains mounted-session state, not a historical measurement or database score. Entry Orbital/Constellation feedback waits for confirmed saves; loading does not synthesize entry actions.

Dates are explicit local calendar dates. The server uses the authenticated profile's valid saved IANA timezone to establish today and reject future outcomes; client `today` and timestamps cannot backdate a server edit. New observations capture that zone; corrections retain original creation/capture context when the user travels. Existing observations are preserved even when travel temporarily places that original date ahead of the profile's current day. Week arithmetic reuses shared UTC-safe civil-date utilities; no global timezone UX change. `/rituals?date=` now participates in existing shared date synchronization, preserving intentional historical selection across refresh.

## Scale and remaining boundaries

As in Notes/Wellness Phase1, reads/saves are a bounded owner-library snapshot (8MiB; max5,000 definitions/groups/entries per collection) with one owner revision. Oversized writes fail with draft recovery, never truncate history. Paging and finer-grained commands belong to later scale work. No hosted resources, migrations resets, fabricated history, new analytics, archive/delete workflow, schedule-version editor, Little Rituals redesign, integrations, coaching or gamification were added.

The defined **existing-interface** MVP is ready for review only after the validation results below pass. No commit/push/merge/deployment is authorized or performed by this task.

## Validation and delivery

- **246 unit/regression tests passed**, including **29 focused Rituals domain/store tests**: recurrence, missing/missed/partial/future semantics, full rapid checkbox cycles, retry after failed/uncertain acknowledgement, stale reads, in-flight edits on separate dates, conflict recovery, above-goal minutes/counts/weekly values, history locks and confirmation-only entry feedback.
- **202 local database assertions passed** across all existing modules, including Rituals RLS/direct-write restrictions and natural-key outcomes. Local SQL lint found no schema/function errors.
- `npm run test:rituals` passed: empty authenticated accounts, group customization/collapse/removal of empty groups, definition CRUD within supported behavior, schedule/goal edits before logs, checkbox cycle/idempotency, partial and above-goal numeric/minutes, weekly6/4 and correction/week boundaries, MWF streaks, duplicate/future/unscheduled/pre-start rejection, history-lock enforcement, actual concurrent writes, ownership/anonymous/direct-write isolation, travel capture context, export and fresh authenticated-client persistence. Unchanged definitions retain their modification timestamp during entry writes.
- `npm run test:wellness` passed after Rituals migration/export changes. Existing Planner/Priorities database regressions and full unit suite also passed; no module-specific task/priority logic was changed.
- Browser: actual private login, first-use group creation, creating all four types, direct Complete→Missed→Not Logged cycling,25pages/30minutes and6/4 with2above goal, blocked-network draft/retry, competing-writer conflict/explicit reload, historical URL selection and refresh. Checked containment at1440/1024/768/390px. Refresh assertions wait for a new document rather than inspecting the outgoing page.
- A **real browser restart** retained authentication, group/definitions, historical checkbox records, quantity/duration values and weekly progress. Light/dark desktop/mobile layouts were inspected. All disposable test accounts and populated records were removed.
- TypeScript, ESLint, production build and `git diff --check` passed. No commit/push/merge/deploy was performed.

Changed-file map: new `lib/data/rituals.ts`, `lib/data/rituals-store.ts`, SQL migration, local API test, store tests, pgTAP assertions and this report; migrated `components/rituals/RitualStore.tsx` and existing Rituals editors/cells/group/page; small `lib/rituals.ts` cycle action; existing AppShell provider wiring, shared date URL sync, generated DB types, Settings/export inclusion, package test command, and explicit persisted render fixtures. Current checkpoints updated in PRODUCT_RULES, FEATURE_SPEC, DATABASE_BLUEPRINT and ARCHITECTURE_AUDIT. No full architecture audit was repeated.

**Readiness:** implemented and validated for the existing-interface Rituals MVP, ready for user review/commit. Planned effective-dated schedule editing and absent archive/pause/delete habit workflows are explicitly outside this migration; no claim is made that those future capabilities exist. The shared data owner is available for Little Rituals, but no Daily Edit ritual widget currently exists.


## Lifecycle MVP completion

Migration: `supabase/migrations/20261101001200_ritual_lifecycle.sql`. No reset, hosted change or prior record import. The previous uncommitted Rituals work is preserved.

### Product semantics

- The existing row overflow menu now offers Pause/Resume, Archive/Restore and permanent Delete. Paused/archived labels are visible; View archived/Back to tracking is a compact toolbar toggle. The existing editor and history lock remain unchanged.
- Lifecycle changes apply from the actual **profile-local today**, even when viewing a historical week. Menu wording makes this explicit. No retroactive date editing is introduced. A travel-induced attempt to move a lifecycle boundary earlier than its recorded dates fails with draft recovery rather than rewriting history.
- Inactive periods use start-inclusive/end-exclusive civil dates. Resume/restore ends an interval, with no missed/completed backfill. Same-day close/reopen produces no artificial day-long gap. Restore returns to active; archiving a paused habit closes its pause and starts archive without erasing earlier pause history.
- Existing real measurements on the day pausing/archiving began remain in historical summaries and can be corrected or cleared. Newly creating outcomes on an inactive date is prohibited. Dates outside the original recurrence remain unscheduled even if malformed prototype data happens to contain a row.
- Streaks skip genuinely inactive unrecorded opportunities. Entirely inactive weeks are excluded from weekly obligations/streak opportunities; partly active weeks keep the original target and actual quantity, without prorating, extra credit or fabricated completion. The weekly progress UI does not present a goal as due for a fully inactive week. Existing historical reports read the shared opportunity helper so real archived observations are not lost or misclassified.
- Permanent deletion opens a separate confirmation. It warns how many recorded dates will be erased, offers Cancel, and prioritizes Archive instead for preservation. Confirmed deletion removes definition, entries and lifecycle periods. The minimal owner/UUID/deleted-at marker contains no title, settings or measurements and exists only to prevent resurrection. Deleted personal content is not retained in that marker or exported as history.

### Integrity and architecture

`rituals.lifecycle_status` plus RLS-protected `ritual_inactive_periods` provide the canonical state/history. `ritual_tombstones` and a protected insert trigger reject every resurrection path, including a fabricated fresh-revision snapshot. Existing observations remain immutable in capture date/zone/created-at during lifecycle changes. A second trigger prevents creating new inactive-date logs while permitting correction of existing ones.

The lifecycle RPC derives user/timezone/date server-side and shares the owner revision lock and command receipts with existing saves. Repeated transition commands/receipts are safe, deletion requires a strictly true confirmation, foreign/anonymous requests are denied, and stale commands conflict. Ordinary snapshot writes cannot forge lifecycle states/periods. No private record is deleted merely because a client omits it.

The existing command queue isolates lifecycle intents into individual acknowledged commands between ordinary snapshot batches. This preserves rapid create/edit/lifecycle sequences and stable retry receipts; failures retain the explicit pending action for review/copy/retry. Ordinary metadata edits preserve projected lifecycle fields in the optimistic state. Unknown acknowledgements and newer competing snapshots use the existing explicit recovery pattern. There is no second independent store or background job.

New files: lifecycle SQL migration, `components/rituals/RitualLifecycle.tsx`, domain lifecycle tests, API lifecycle tests and pgTAP assertions. Existing domain helpers, typed access/queue/provider, group/page rendering and minimal historical Insights filtering were extended; no new analytics or layout redesign. Generated types, test command and product/feature/blueprint/audit checkpoints were updated.

### Lifecycle validation and readiness

- **255 unit/regression tests passed**. New domain tests cover inactive dates versus genuine prior observations, same-day idempotence, no backfill, pause-gap daily/weekly streaks, historical archived statistics, full-week exclusion and partial-week original targets. Queue tests cover batching boundaries, metadata edits retaining lifecycle, unknown acknowledgement/retry, refresh through a fresh store, conflict/draft recovery and dependent-state deletion. Existing Insights regression coverage confirms malformed unscheduled observations are still excluded.
- **212 local database assertions passed**, including lifecycle RLS, denied direct writes, private deletion markers, anonymous command denial and the resurrection trigger. SQL lint reported no errors.
- Local lifecycle API tests passed pause/resume/archive/restore, duplicate commands/receipts, unchanged historical entries and6/4 weekly quantities, same-day interval handling, correction of already-recorded data, denial of new inactive-date logs, restart through a fresh authenticated client, strict deletion confirmation (false/null denied), deletion cleanup, tombstone protection, stale/forged snapshot rejection, competing commands, owner isolation and export. A saved-zone test across Pacific/Kiritimati and Pacific/Pago_Pago verifies that the server chooses the boundary date and rejects a backward lifecycle rewrite after date-line travel. Existing Rituals integration tests also passed.
- Actual browser checks passed the compact menus, paused labels, archive filtering/view/restore, history warning and Archive instead, deletion cancellation and confirmation with/without records, resurrection denial, failed-save retry, competing-write recovery, refresh, and desktop/tablet/mobile containment. A **real browser restart** retained paused/archive state, the private session, permanent deletions and archived historical6/4progress; light/dark desktop/mobile screenshots were inspected. Disposable accounts and populated test history were removed.
- TypeScript, ESLint, production build and `git diff --check` passed. No commit, push or deployment was performed. No Money, dashboard or new habit-type work was started.

**Rituals MVP readiness:** the defined lifecycle requirements are implemented and validated, ready for user review. Transitions are intentionally day-granular and begin today; retroactive lifecycle editing and effective-dated measurement/schedule editing remain outside scope. There are no known outstanding functional lifecycle blockers.
