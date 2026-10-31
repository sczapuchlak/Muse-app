# Planner persistence — Pass B

**Implemented locally.** This extends [Pass A](PLANNER_PASS_A.md) and the [daily cutover](PHASE1_DAILY_PERSISTENCE.md), without redesigning the dashboard or migrating another module. No hosted resources, personal seeds, commit or push.

## One commitment, optional task link

A day still has at most three independently identified, ordered priorities. Each keeps its own editable text and original daily record/date. Creating a priority never creates a task. The compact link control selects an existing active, owned Planner task, changes the association or unlinks it. A task can be linked on different days, but only once within the same day. Deleted tasks are excluded from new choices; organization archives do not destroy existing links.

While linked, `task_id` is populated and `standalone_complete`/priority `completed_at` are null. Planner is the sole live completion authority. Completing/reopening a linked priority delegates to the existing Planner command, timer closure and append-only transition history. Editing priority text/order never changes task completion or title. Rescheduling a task never moves its priority.

## Live versus historical completion

`daily_priority_projection` exposes current, historical and display status separately. Historical status is the latest task transition **strictly before the next midnight of the priority's date in its original daily IANA timezone**. The task's known-open creation is the baseline; if it did not exist before that cutoff, the answer is null/unknown. Existing Pass A records were created under this history contract; there is no import of prototype facts.

- Completion after the cutoff does not backfill an earlier priority.
- Reopening later does not undo a prior day's completion; repeated complete/reopen events retain their timestamps.
- A task already complete when linked remains currently complete; past days still use actual earlier history, not link time.
- An event exactly at next midnight belongs to the next day. DST days can be23/25 hours.
- Profile/device travel does not relabel existing daily dates or replace their original zone.
- Ordinary completion is timestamped by the server. There is no new backdated task-event correction flow.

Current/future Daily Edit priority checkboxes reflect the canonical live task. Past linked checkboxes are explicitly labeled day-end readouts; the link menu separately exposes Complete/Reopen **current task**. This prevents a click today from pretending to change yesterday's history. Unknown is visibly distinct from false and excluded from the completed numerator, with an unknown count. Dayprint uses the historical projection, even without a Mood session. Standalone priorities retain their existing manually dated completion semantics; their capture timestamp is not retroactive task evidence.

Unlinking or soft-deleting a task atomically materializes the appropriate result: current state for current/future commitments, day-end state for past commitments. Stable priority ID/text/date/order survive. Actual completion evidence is retained separately from `materialized_at`; unknown stays null. Unlinking never changes the task. Once detached, subsequent task changes no longer alter that standalone priority. An explicit later standalone checkbox edit is a manual priority correction, not a rewritten task event.

## Database and synchronization

`20261030000500_priority_task_links.sql` adds owner-safe links, materialization provenance, a per-day unique-link index, `priority_commands` idempotency receipts, temporal helpers and one MVCC daily projection RPC. Generated database types and the shared typed repository are updated. There are no duplicate Dayprint records or independent linked completion values.

All priority writes now use revision-checked commands, not authenticated direct table mutation. Owner RLS remains on reads, with explicit owner checks and composite owner FKs in the fixed-search-path command boundary. All priority commands acquire the owner Planner version lock before daily/priority locks. Link changes require the expected Planner revision; linked completion checks both Planner and priority revision. Task delete detachment runs within the same transaction. Concurrent unlink/delete/complete cannot leave contradictory partial state.

Linked completion enters the existing `PlannerStore` queue; priority metadata enters the existing per-date `DailyStore` queue. Stable receipt IDs survive retry. A confirmed metadata readback must match acknowledged priority versions; it cannot silently adopt another writer's newer version. Failed or ambiguous writes retain reviewable intent, while actual conflicts require deliberate discard/load-latest. Existing status/retry UI is reused. Task success and cross-tab Planner invalidation refresh the daily projections, including loaded history. Refocus/reconnect refresh existing caches; continuous cross-device Realtime is not claimed.

## Validation

- `npm run test:priority-links`: actual local API standalone/link/unlink/completion/reopen, metadata and completion idempotency, rescheduling/delete preservation, historical unknown, real unlink-versus-complete race, fresh-client persistence, anonymous/foreign/direct-write denial. Disposable users are removed.
- `supabase/tests/database/priority_links.test.sql`:37 rolled-back assertions covering late/reopened/repeated history, exact midnight,23/25-hour DST boundaries, original-zone travel, current versus historical projections, materialization and owner isolation. Together with the existing foundation suite:94 assertions.
- Unit coverage includes historical Dayprint/unknowns, accessible historical priority presentation, linked task/timer optimistic behavior, uncertain-response retries and metadata acknowledgement races.
- Local isolated Chrome checks cover standalone capture/link, completion in both modules, error/retry, stale-write conflict and explicit recovery, unlink, rescheduling, historical unknown/current-task menu, refresh/restart, three-priority and mobile containment, no-Mood Dayprint and deletion materialization. Client-side navigation was also verified without a page reload. Representative desktop/mobile layout inspection is not exhaustive visual approval of every theme.

## Limits and next stages

Existing Insights has no priority-completion metric; no speculative metric or full Insights migration was added. Future priority analytics must consume the historical projection, preserve unknowns and declare their denominator. Planner aggregate concurrency remains deliberately conservative, so unrelated task edits can cause a conflict. Profile editing/export/erasure UI, continuous Realtime, backdated task-event correction, hosted deployment and other module migrations remain deferred. No Rituals or other module persistence was begun.

Final checks:199 Node tests,94 database assertions, local priority-link/daily/Planner/foundation API integration, database function lint, ESLint, TypeScript and production build pass. A stale local Next.js development cache was regenerated for the final rendered checks; no source workaround or configuration change was required. The isolated QA browser and disposable accounts were cleaned up; the local development stack remains available.
