# Nourish / Wellness persistence — Phase 1 and MVP completion

**Current status:** the MVP completion addendum below supersedes the initial grocery/activity-UI exclusions. The initial pass is retained here as an implementation history.

## Scope and original audit

Implemented locally; no hosted resources, visual redesign, navigation rename or fictional history import. This pass follows the completed priority/task integration.

Before this pass, `NourishProvider` owned an in-memory reducer seeded from `nourish-sample`; assignments and the saved library reset on refresh. Water totals/goal/quick additions and Movement's library/shelf/dated selections used `MuseSession` memory. The authenticated shell also registered a fictional water/movement day. No Nourish/hydration/movement database tables or production persistence existed. Daily Edit and Nourish already shared meal assignments. Dayprint had **no** food/water/activity sections. Insights consumed session movement/water alongside meals.

The smallest cutover retains the meal reducer/editor and presentation, introduces one typed authenticated Wellness owner using the established Notes revision/receipt pattern, and removes sample personal records. Grocery List remains session-only with its existing categories and interactions; it is not imported into the database. Starter movement **definitions** and default water controls are configuration, never recorded activity/intake. No previous memory data can be safely attributed to a user and is imported.

## Implemented

- Meal assignment create/read/edit/delete, move and copy; selected local date/slot/order, title, optional note, saved reference and independently optional nutrition fields. Explicit zero remains known. Existing unused `recipeId` remains a client compatibility null, not a recipe system.
- Saved meal library, multiple meal types, notes/reference URLs and optional nutrition defaults. Occurrence snapshots do not change when templates change. Template deletion detaches references without erasing occurrences. Stable form IDs prevent repeated-submit duplicates.
- Hydration aggregate per local date: actual quantity, applicable goal and unit snapshots. Quick additions compose against the latest draft; retries reuse the same receipt. Edit permits recorded zero. Removal is supported by the data command; the existing UI's total editor can set zero and no new removal UI was introduced. Settings persist default goal/unit/quick amounts without creating intake. Existing goal controls explicitly update the selected recorded day's goal and prospective defaults; other days' goals stay intact. Unit relabeling of historical quantities is rejected; no new conversion UX.
- Movement type library, bounded quick shelf/recency, archive/rename and dated multi-select **intentions**. Explicit clearing preserves recorded-empty versus absent. Library/preferences edits alone never create a daily intention. Archive preserves historical type IDs. Only starter definitions are offered initially; fictional custom examples are not imported.
- **Separate actual activity records:** stable ID, local date, type and capture timezone, with CRUD through the typed shared store/API. Intentions never create actual records, and actual records never complete intentions/tasks. There was no actual-activity editor, duration/notes workout model or Planner activity link in the existing application. None is invented here. Actual entry UI is a future focused product task; this pass does not claim the Movement chips log completed exercise.
- Daily Edit and Nourish share one owner for meal changes; Daily Edit water and movement use that same persisted owner. Existing Insights source reads now receive canonical water/intention/meal collections rather than fictional session history; no new analysis or charts.
- Dayprint is unchanged: it has no existing Wellness section. It displays no invented hydration or movement, and no new widget/card or separate Dayprint record was added. Future summaries can consume these authoritative dated records and must distinguish absent, zero, intention and activity.
- Existing owner-only Settings export includes Wellness saved data. Other prototype domains and unsaved drafts remain excluded.

## Schema, security and reliability

Migration: `supabase/migrations/20261101000900_wellness_pass_a.sql`.

Relational owners: `saved_meals`, `meal_assignments`, `hydration_settings`, `hydration_days`, `movement_types`, `movement_preferences`, `movement_days`, `movement_day_types`, `movement_records`. Bounded optional nutrition is a validated four-key numeric JSON object; meal slots/types are constrained canonical values. Control tables `wellness_versions` and `wellness_commands` contain owner revisions/idempotency receipts, not historical measurements.

All private tables have RLS owner reads; direct client mutations and anonymous RPC access are denied. `read_wellness` uses invoker permissions. `save_wellness` uses authenticated identity, a locked per-user revision, validated bounded payload, owner-scoped relationships and stable receipt hash. Cross-owner UUID reuse is rejected. Archive definitions rather than deleting historical references. Deferred owner/type references permit safe account-cascade ordering without erasing history during ordinary edits. Existing user-facing account deletion remains unavailable; only disposable local test accounts were removed.

The shared client command lane batches existing reducer intents into an atomic confirmed snapshot. It keeps drafts on write/read failure, reuses the same batch/receipt on retry, rejects stale/newer competing snapshots, and requires explicit discard/load-latest on conflicts. Capture is unavailable until the initial owner revision loads or while an error requires recovery. Form input and pending state are not advertised as saved. Unsaved JSON is reviewable/copyable before discard. Before-unload warns for pending writes; unsaved drafts are not durable offline storage.

Cross-module navigation uses one provider. Other tabs notify via user-scoped BroadcastChannel/storage signals; focus/reconnect refetch. Cross-device changes refresh on focus/reload, not via a new Realtime service. Conservative owner-wide conflicts are deliberate; there is no silent rebase of competing hydration increments.

This Phase 1 uses a bounded library read/snapshot (8 MiB, max 5,000 entries per collection). Paging and narrower entity/day command lanes are later scale work; oversized writes fail with draft recovery rather than truncating history. No new generic persistence framework/dependency was introduced.

## Dates and timezones

Dates are explicit ISO calendar dates, not browser-local instants or UTC-derived midnight conversions. Selected historical/future dates remain deliberate. The server requires the saved valid IANA profile timezone and stamps it on initial capture; clients cannot forge a capture zone. Updates preserve existing capture timezone/created timestamps through travel. New dates use the newly confirmed profile zone. Existing shared date navigation utilities handle midnight/DST; no global timezone settings changes were made.

## Validation

- Targeted store tests: batching/rapid increments, empty reads, known zero, dated goals, retry after failure/uncertain acknowledgement, stale reads, concurrent edits, in-flight changes on another date, activity/intention separation, and timezone midnight/DST boundaries.
- Local authenticated API integration (`npm run test:wellness`): meals/templates/move/copy/delete/snapshots, hydration goals/quantities/idempotency/removal, movement library and independent actual activity CRUD, strict dates, travel, real conflicting clients, owner/anonymous/direct-write isolation, invalid-write rollback, fresh-client persistence, owner-only export and populated account-cascade cleanup. Disposable accounts removed.
- Browser: actual login; shared meal edits Daily Edit ↔ Nourish; water additions; movement intention without activity; blocked-network retry and stale-write conflict recovery; historical date isolation; refresh and a real browser restart with saved session/data. Layout containment checked at 1440/1024/768/390px, plus light/dark rendered screenshots. No UI redesign was performed.
- Final automated results are recorded below after execution.

## Deferred

Grocery persistence; actual-activity entry UI; a broader Wellness module/navigation; sleep/supplements/wearables/exercise programming; new Dayprint Wellness sections; new hydration UI in Nourish; production deployment/privacy rollout; new nutrition or Insights analytics. Planner, priorities and other module semantics are unchanged.

### Final results

The full regression run passed **230 tests**. After the final hydration-limit safeguard, all **13 targeted Wellness store tests** passed again; excessive rapid additions retain a visible draft for server rejection rather than becoming a silently successful no-op. Database regression coverage passed **180 assertions**. Local Wellness API tests, TypeScript, ESLint, SQL lint, production build and `git diff --check` passed. Browser workflow/restart results above were executed against the local development app, not inferred from component code. A deletion-cascade ordering problem found during disposable-account cleanup was corrected with deferred owner/type references and rechecked with populated activity/intention data.

### Changed-file map

- Foundation: new `lib/wellness.ts`, `lib/data/wellness.ts`, `lib/data/wellness-store.ts`, `components/WellnessStore.tsx`; generated `lib/database.types.ts`; the additive migration above.
- Existing consumers: `AppShell`, `NourishStore`, `DailyEdit`, `MovementCard`, `WaterCard`, `WaterAmountForm`, Nourish page/meal/saved/placement editors, and `insights/useInsightsSources`. No styles or theme files changed. Successful meal feedback now waits for acknowledgement; failures do not celebrate.
- Export: existing `Settings` copy, `app/api/account/export/route.ts` and owner-only SQL export extended for the newly persistent sources.
- Verification: `scripts/test-local-wellness.mjs`, `tests/wellness-persistence.test.mjs`, `supabase/tests/database/wellness.test.sql`, `tests/wellness-render.mjs`; existing render tests use an explicit confirmed Wellness fixture, never a production fallback. `package.json` adds `test:wellness`.
- Documentation: this report plus current checkpoints in `PRODUCT_RULES`, `FEATURE_SPEC`, `DATABASE_BLUEPRINT` and `ARCHITECTURE_AUDIT`. The architecture audit was not repeated.


## MVP completion — explicit movement and groceries

The final approved addendum makes the existing Grocery List part of MVP and exposes explicit movement completion without redesigning the card.

### Movement

The selected quick/overflow chips still express intention only. A compact Mark Done/Review done action opens the existing glass popover, listing selected or already-completed types with a per-type Mark Done/Undo control. Completed names appear in the card summary. Completion is an idempotent set operation, not a toggle or second task model. It creates one activity for the selected local date/type; repeated clicks cannot multiply rows. Undo removes the actual activity and leaves intentions untouched. A completed activity remains reviewable/undoable if its intention is later deselected or definition archived. To correct a completion, undo it and mark the appropriate type/date.

The shared Wellness queue, saved profile timezone, revision conflicts, failure/retry recovery, confirmation-only Spark and original activity capture context remain authoritative. The database adds unique(user_id,local_date,type_id). If unexpected pre-existing duplicate actual activities exist, migration stops for review rather than deleting real records.

### Groceries

The existing interface supports one ongoing owner-scoped shopping list. There is no named-list selector, separate units field, custom-category management flow, manual reordering or implemented meal-to-grocery action. Quantity text already includes units (e.g. “2 cartons”, “500 g”); it is preserved exactly as supported, with bounded surrounding-whitespace normalization. Persist category definitions/order and item ID, name, quantity, note, category ID, checked state, insertion position and creation metadata. No list is inferred from the selected day.

New `grocery_sections` / `grocery_items` tables have owner-only RLS reads, denied direct client writes and owner-scoped category references. Existing default category definitions appear on empty lists and persist on first explicit Wellness write; no shopping items/history are seeded. There was no durable/user-attributable legacy grocery storage to import. The old in-memory grocery reducer was removed as an owner; existing actions now use the same atomic Wellness store as meals/water/movement.

Quick capture uses a stable submission ID to avoid duplicate repeated submits and distinguishes queued from confirmed saved. Checked/unchecked edits, category/quantity/note editing, removal, clear-completed and Undo persist. Undo is a revision-checked restore of the original item identity/metadata, not an unchecked overwrite of another window's newer list. Draft review/retry/conflict recovery includes groceries; portal editors also preserve input and disable submission when recovery is required. Grocery completion Spark waits for confirmed persistence. Settings export now includes groceries.

Migration `20261101001000_wellness_mvp_completion.sql` extends the existing canonical read and wraps the prior save inside the same transaction/owner lock/idempotency receipt. The underlying save moves into `muse_private` and loses client execute permission, preventing bypass of grocery validation. Receipt retries return without replaying an obsolete grocery snapshot, even after later successful changes. No existing personal records or receipts are reset. The bounded owner-library scope remains the same; paging/entity-granular commands are later scale work.

### Git checkpoint review

At the start of this continuation, the current branch was `main`, remote `origin` was the existing Muse-app repository, and Priorities integration was already committed as `e914f38` (“bidirectional chat from task to top 3”). The working tree contained the prior Wellness pass. No unrelated changes were discarded. The user's final addendum requires review before commit/push, and no feature branch destination was specified. No commit, branch switch, push, merge or deployment is performed here. After review, confirm the intended feature branch and create a Wellness checkpoint; do not recreate or split the already-existing Priorities commit.

### Remaining MVP boundaries

No missing functional item remains in the defined existing-interface scope once validation below passes. Still outside scope: multiple named shopping lists, custom section management, meal-generated groceries, new workout fields/programming, sleep/supplements/wearables, new Dayprint Wellness UI, new Insights derivations, module rename and hosted deployment. User-controlled account deletion/production privacy rollout remains separately scoped. Transient drafts and Undo notices are not offline-persistent; confirmed records are. The dated actual-completion model does not infer precise exercise start/end times or a historical completion clock time from an edited civil date.

### MVP validation results

- **237 unit/regression tests passed**, including **19 focused Wellness store tests**. These cover planning versus completion, Mark Done/repeated clicks/undo, original intentions and date isolation, actual restart through a fresh store, uncertain acknowledgements, grocery metadata/order/check state, removal/restore/clear, failed drafts and conflicting updates.
- **189 local pgTAP assertions passed**, including Grocery RLS/direct-write restrictions, private underlying-command isolation and database completion uniqueness.
- `npm run test:wellness` passed the existing meal/water/movement regressions plus actual completion/undo, duplicate-constraint rejection, grocery CRUD/check/clear/Undo, metadata/order, replay of an old receipt after newer changes, real simultaneous writers, owner/anonymous isolation, invalid-category rollback, saved-data export and fresh authenticated-client persistence. Disposable users were removed with their populated dependent records.
- Browser primary workflows passed: Mark Done and Undo; repeated clicks; completed/undone state on distinct historical dates; grocery capture/repeated submit, quantity/note/category editing, checking, deletion/Undo; blocked-network draft/retry; real stale-write conflict and explicit recovery; navigation and refresh. Containment was checked at 1440/1024/768/390px.
- A **real browser restart** retained the saved authenticated session, independent completed/undone historical movement, planned choices, and grocery IDs/quantity/category/notes/checked state. Light/dark mobile completion popovers and grocery surfaces were inspected. The restart harness initially used an ungranted administrative table read; it was corrected to use the authenticated owner API and the restart verification passed. Both test accounts from those runs were cleaned up.
- TypeScript, ESLint, local SQL lint, production build and `git diff --check` passed. No financial calculations, Planner/Priorities behavior, new Dayprint sections or unrelated modules were changed.

**Result:** functionally complete for the defined existing-interface Wellness MVP, ready for user review. Git checkpoint/push remains pending review and confirmation of the intended feature branch; the repository is on `main`. No new commit, push or deployment was made.
