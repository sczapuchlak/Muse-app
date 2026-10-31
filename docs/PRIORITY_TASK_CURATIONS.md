# Daily Edit priorities — task curations

**Implemented locally after Settings persistence.** This brief supersedes Pass B's optional standalone-priority creation and independent live title rule. It does not redesign Daily Edit or Planner, migrate movement/Wellness, or deploy anything.

## Ownership and creation

Every new priority is a dated top-three designation of a real Planner task. Task title and live completion have one authority: Planner. The priority retains stable identity, original daily record/date/timezone, slot and recoverable snapshots. Ordinary Planner tasks are never automatically promoted.

`create_priority_task` atomically captures the task and designation under the existing owner Planner version/day locks. It uses the oldest active workspace; if none exists, this explicit capture creates a Personal workspace. The task is planned for the selected local calendar date. Users can reclassify it later in Planner; no advanced task fields are added to Daily Edit.

A private insert trigger also protects the existing priority metadata command: a new unlinked priority cannot be left taskless by an older caller. `tasks.origin_priority_id` uniquely identifies the originating designation per owner; it is retained as provenance if that designation is removed, not treated as a live FK. Creation and title commands enter the existing Planner queue, with stable receipt IDs, conservative aggregate revisions, authoritative readback and retained failure/conflict drafts. The add field is cleared only after its actual priority is read back. Repeated submissions/retries do not create duplicate tasks.

## Titles, completion and removal

The daily MVCC projection supplies the canonical task title. Daily Edit also consumes the shared Planner state for safe optimistic title/current-completion feedback. Inline title editing delegates to a revision-checked task-title command and preserves notes, subtasks, dates, workspace and other metadata. Planner edits invalidate daily/history projections; priority metadata writes refresh Planner. Other-tab/focus/reconnect refresh behavior remains; continuous cross-device Realtime is not claimed.

Current-day completion/reopening still uses the established canonical task command, transition history and timer behavior. Historical linked checkboxes remain explicit day-end readouts; their existing task menu offers clearly current-task actions. New historical tasks do not pretend to have existed/completed before creation. Day-end boundaries remain strictly before next midnight in the original daily IANA timezone, including DST. Titles are current; historical completion evidence is separate. Mood/Dayprint presentation is unchanged.

Removing a priority removes only its dated designation and frees the slot. It never deletes, archives, renames, reschedules or reopens the task. Reordering preserves priority IDs and task data. Designation changes participate in the Planner version scope so stale acknowledgements cannot report an already-removed designation as saved. The limit remains three per date, with no task-count limit or automatic slot filling.

The old Unlink action is removed: use Remove priority to keep the task in Planner. Explicitly selecting another existing task remains possible in the compact existing control, without overwriting either task's richer details.

## Deletion and legacy backfill

Task deletion keeps the existing tombstone/history and atomically materializes the priority's appropriate historical/current result plus last canonical title. Its normal title/checkbox controls become an inactive “Kept for history” readout. Users may remove the designation or explicitly select another existing task. Neither normal reads nor backfill silently recreate a deliberately deleted/unlinked task.

The initial local scan found **three eligible standalone priorities, zero existing links and zero detached-history rows**. Migration `20261031000800_priority_task_curations.sql` backfilled all three. A transaction-local preservation check verifies original text, order, local date, timezone, known state and completion capture timestamp; any mismatch rolls the migration back. No title-based task matching is used.

Eligible legacy standalone rows receive task links once; existing links and deliberately detached/materialized histories are left alone. A source-identity uniqueness constraint and transactional public owner-scoped backfill command make retries/interruption safe. Imported task rows use their actual import instant, not backdated creation. Their known initial state/capture timestamp are stored in protected baseline columns; **no completion/reopening events are fabricated today**. Later real task transitions use the existing event history.

For dates ending before backfill, the priority retains its original manually dated true/false fact in explicit legacy provenance fields. That manual fact is not represented as proof that the newly created task existed then. For dates after import, actual transitions plus the protected initial task state resolve history. Unknown detached evidence remains unknown. Unlink/delete materialization respects these legacy facts. No task-history analytics migration or speculative metrics were added.

The migration is additive and keeps recoverable evidence. A rollback must not erase tasks that have since been edited: inspect source IDs/events and preserve records rather than automatically deleting imported tasks.

## Movement — read-only findings

Daily Edit Movement remains **prototype session state**, through `useMuseState`/`MuseSession`: a date-keyed movement selection, plus shared movement-type, quick-shelf and recent-choice libraries. Historical selections survive client date/module navigation in that session, but not refresh/browser restart. There is no movement Supabase table or authoritative persistent movement log in this implementation.

The existing blueprint's `movement_types`, `movement_days` and `movement_day_types` are the appropriate future Wellness-owned source. Preserve intended local date/captured timezone, stable type IDs, and explicit recorded-empty versus absent days. Daily Edit, Mood/Dayprint and future Insights should project that one owner; a movement intention is not proof of exercise/workout logging. **No movement/Wellness schema, records or functionality was implemented here.**

## Validation and limits

- Local `test:priority-curations` covers atomic create/idempotency, duplicate-submission rejection, title edits in both directions, richer metadata preservation, completion/reopening, designation removal without task mutation, three-slot rollback without orphan tasks, ordinary tasks staying unpromoted, selected past/future dates, task deletion/no resurrection, fresh clients, actual conflicting writes and owner/anonymous/direct-write denial. Disposable users are deleted. `test:priority-links` remains an alias to the current contract rather than testing the superseded standalone/unlink behavior.
- Rolled-back database fixtures cover backfill replay, existing links/details, retained detached rows, initial-state evidence without invented events, legacy true/false history, subsequent reopen/delete, current canonical titles, selected future dates, original timezone stability and RLS. Existing midnight/DST/historical suites remain in place.
- Unit tests cover safe creation acknowledgement, retained retry/conflict text, canonical title edits preserving fields and inactive deleted-task readouts. Existing daily/Planner regressions run against the current contract.
- Browser checks cover actual UI automatic creation, double submission, title/completion synchronization without reload, metadata preservation, removal, failures/retries/conflicts, deleted-task readouts, selected dates and refresh/restart persistence. Representative desktop/mobile inspection preserves the existing layout. A scoped block capture group (with inert loading/error behavior) avoids native fieldset layout invalidation when adding/removing rows or retrying; the surrounding card/grid design is unchanged.

Workspace selection is deterministic rather than a new user-configurable default preference. Pending text/drafts remain tab-local until confirmed. Existing whole-owner conflict scope, local-only authentication/privacy limitations and prototype-only domains remain unchanged. No commit, push or hosted change.

Final automated results:218 Node tests,162 database assertions, daily and Planner integration regressions, focused priority-curation API integration, ESLint, TypeScript, database function lint and production build pass. Historical replacement tests ensure legacy facts cannot bleed into a different selected task.
