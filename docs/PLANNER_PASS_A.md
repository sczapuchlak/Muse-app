# Planner persistence — Pass A

**Implemented and validated locally.** The approved Planner UI is preserved. Authenticated routes no longer mount the sample Planner state. No hosted changes or priority linking are included.

## Authoritative records

`20261030000400_planner_pass_a.sql` adds owner-scoped workspaces, task groups/tags and links, tasks, ordered subtasks, floating local events, time sessions, completion transitions, and command/version metadata. There are no personal seeds. A new account starts empty and uses the existing workspace menu to create its first workspace; task capture explains/disables its workspace requirement instead of inventing Work/Personal records.

All existing task fields are retained: title, workspace/group/tags, optional planned/due date, local time slot, estimate, notes/detail, subtasks, recurrence metadata and actual time. Creation/completion/time-session timestamps come from the database, not the browser. Recurrence metadata does not generate occurrences. Rescheduling/reordering changes planned placement without changing identity, due date or completion. Clearing optional fields survives JSON serialization as an explicit null.

Task deletion is a **soft removal from every active view**. Deleted rows and completion facts remain available for historical reporting; there is no restore/trash UI in this pass. Account deletion cascades owned records. Unused organization definitions archive rather than break historical references. Active referenced workspaces remain protected and at least one workspace is retained after initial creation; groups/tags clear their applicable live associations. Archived names can be reused for new definitions. User-facing permanent erasure/export controls remain the separately approved privacy work before production use.

## Completion history and dates

Every completion/reopening transition records server UTC time, the user's current saved IANA timezone, its intended local date, task title/workspace and planned-date context. Reopening clears the task's *current* completedAt while preserving earlier transitions. Later rescheduling, editing, deletion or travel never relabels those historical facts. Existing Insights completion-date reads now use recorded completion transitions, including completions of reopened/deleted tasks; current planned completion rates still describe current plans. Re-completion is a separate recorded transition, not proof of another distinct task. No charts or speculative analytics were added.

Planner's Today/week/date controls use the authenticated profile's timezone. Missing/invalid zones are explicit errors, never a mock/device fallback. The existing valid UTC profile default is displayed with a reminder to confirm it matches the intended planning day; no profile is silently changed. User-facing profile editing remains outside Pass A. Task planned/due dates are calendar dates, not timestamps.

Existing event/time-slot behavior remains floating local calendar time with captured timezone. For example, an event entered at 01:30 on a DST fold remains the intended local entry; this pass does not invent a UTC occurrence or duration. External-calendar integration and explicit ambiguous/nonexistent wall-time resolution remain future calendar work. Timer intervals, unlike floating scheduling labels, are actual server instants; elapsed time is derived from their valid endpoints, not timezone arithmetic or supplied client clocks.

## Commands, security and synchronization

- `lib/data/planner.ts` projects one typed, consistent `read_planner` snapshot into the established PlannerState. Daily Edit's bounded task/event preview, desktop/mobile Planner, search/filter/classification, Details, timers and relevant Insights reads share those records. Priorities remain completely separate.
- `PlannerStore` is scoped to the authenticated app/profile. Optimistic drafts serialize through `planner_command`; queued typing updates coalesce. A receipt ID and request hash make ambiguous retries idempotent, preventing duplicate capture, toggles or timer starts. A readback must confirm the acknowledged version before reporting saved.
- A per-user Planner revision/row lock conservatively protects writes, ordering, organization dependencies and the one active timer together. Another client's edit produces a conflict instead of silently rebasing pending changes. This first-slice choice can conflict on otherwise unrelated edits within one account; finer entity/order scopes may follow without changing task identity.
- Failed/uncertain writes retain their reviewable draft. Network retry is explicit. Conflicts require deliberate discard/load-latest; no forced overwrite exists. Title/subtask text remains an unsubmitted user-scoped editor draft until committed, survives drawers/navigation, and blocks refresh from changing its editing base. Closing classification/move/organization editors preserves their consistent editing context. Pending drafts/writes warn before leaving.
- Cross-tab signals contain only invalidation metadata. Refocus/reconnect and other-tab notifications refetch when there is no pending editing context. Epoch checks reject older responses. Continuous cross-device Realtime is not implemented.
- Every Planner table has owner RLS. Authenticated users have read access to their records and no direct table mutation grants. The narrowly validated security-definer command fixes its search_path, checks auth.uid(), selects only that owner, enforces owner-safe foreign keys and accepts no caller-supplied owner. Completion history and timer timestamps cannot be forged through REST writes. Admin credentials are used only for disposable local test provisioning, never application CRUD.
- Starting a timer closes another active interval in the same transaction; one open interval per user is enforced by an index. Completion/deletion closes that task's active timer. The durable total is the nonnegative baseline plus closed intervals; the UI adds the current open interval for display. There is no fabricated interval history from prototype totals and no new manual-time correction flow.

The initial repository reads the whole Planner aggregate in one MVCC snapshot, avoiding torn parent/child data and REST row-limit truncation. Date/workspace indexes exist. Range paging/archived-history pagination and narrower concurrency scopes remain scale work, not claims made by this local Pass A implementation.

## Validation

- Targeted local `npm run test:planner`: empty accounts; full-field CRUD and clearing; organization; scheduling/reorder; actual competing writes; completion/reopening timestamps/history; idempotent commands; timer/event durability; fresh clients; stable historical facts after timezone change; safe deletion/archive; owner, anonymous and forged direct-write denial. Disposable accounts are deleted.
- Unit tests cover cache initialization, coalescing, failed-write retention/retry, uncertain-response idempotency, concurrent edits, editor draft preservation, stale responses, acknowledgement races, timezone/date validation, and completion history after reopen/delete/travel.
- Actual isolated Chrome: workspace creation from empty state; capture/edit/subtask/completion/reopen; date changes; drag/drop; search; manual Inbox move; timer; delete; refresh and real browser restart; error/retry/conflict recovery; the shared Daily Edit preview; representative light desktop/dark mobile containment. This is not exhaustive visual approval of every theme.
- All 192 Node tests, ESLint, TypeScript and production build pass. Existing 57 foundation database assertions, local daily persistence and auth/inbox integration pass; database function lint is clean. No sample imports, database reset, production operation, commit or push.

## Scope at the Pass A checkpoint

At this checkpoint Pass B was deferred. The subsequent [PLANNER_PASS_B](PLANNER_PASS_B.md) now implements Planner-linked priorities, shared task completion and original-day historical priority calculations locally. Other module migrations remain deferred. No Rituals, Money, Nourish, Notes or Whimsy data migration was started. Existing daily persistence and authentication remain intact.
