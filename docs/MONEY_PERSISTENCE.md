# Money MVP persistence

## Scope and audit

Implemented locally, preserving the six existing Overview, Paychecks, Spending, Recurring, Cards and Categories views. Bills remain embedded in Overview/Paychecks. Before this pass all Money records lived in a sample-seeded reducer; there were no Money database tables or durable user records to migrate. No fixtures or browser data have been copied into authenticated accounts.

Required MVP areas are **Cards / Accounts** (the current manual card and payment-method representations), **Transactions** (spending and separate paycheck income records), and **Paycheck Budgeting** (dated paycheck plans, allocations, actuals and remaining income). There is no separate existing bank-account balance entity; no banking subsystem or extra income-transaction type is invented.

The existing UI supports create/edit for paychecks, templates, allocation groups, allocations, spending transactions, cards, card payments, bills, recurring definitions, categories/subcategories, tags and payment-method labels. Removal remains scoped to transactions, allocations and card-payment undo. Category/tag archival and recurring active/paused/cancelled states remain. This pass does not invent full deletion controls for every definition, bank accounts, imports or financial advice.

## Persistence and ownership

Migration: `supabase/migrations/20261101001300_money_mvp.sql`.

Normalized records: `money_categories`, `money_subcategories`, `money_tags`, `allocation_groups`, `payment_methods`, `paycheck_templates`, `paycheck_template_allocations`, `paychecks`, `allocations`, `transactions`, `transaction_splits`, `transaction_tag_links`, `cards`, `card_payments`, `bills`, `recurring_commitments`, `recurring_versions`. Supporting owner-scoped revision, command-receipt and deletion-tombstone tables protect writes.

All records have owner constraints/RLS. Authenticated clients read their own records; anonymous access and direct table mutations are denied. The validated `save_money` security-definer RPC performs the entire graph update in one transaction. Composite foreign keys prevent cross-owner references. Account export includes current Money plus recurring definition snapshots; administrator removal of an auth user safely cascades through dependencies. Self-service account deletion remains unavailable in the existing Settings screen and is a separate pre-production privacy limitation.

The shared typed repository/store reuses Muse's established save pattern: stable record/command IDs, owner-level revision checks, no silent conflict overwrites, ignored stale reads, retained in-memory drafts after failure, explicit retry or discard/load-latest, before-unload warning and success feedback only after acknowledgment/readback. Focus/online/cross-window notifications refresh clean stores; dirty drafts remain protected. A newer concurrent save after acknowledgment produces a recoverable conflict rather than a false saved state.

## Accounting contract

- USD is explicit; monetary storage is integer cents, validated against exact JavaScript-safe aggregate bounds. Optional missing values remain unknown; zero remains known. Signed card opening balances allow credits.
- User-approved **dated opening balance**: enter the balance at the start of the chosen local date. Current balance = opening + purchases on/after that date − payments on/after that date. Earlier transactions remain historical spending without double-counting the opening basis. Editing the basis or moving/editing/deleting dated transactions recomputes the projection. The displayed client balance is never trusted as financial input.
- Card purchases count once as spending; payments are debt settlement, not another expense. Paid bill status does not create spending. Allocations are intent; explicit actuals override otherwise linked observations. No observed actual remains unknown.
- Splits cannot exceed their transaction total. Unassigned remainder is retained. Category/subcategory and card/paycheck/allocation relationships are validated atomically.
- Paycheck periods and reporting months/custom ranges stay distinct. Templates create independent UUID allocation snapshots, copying defaults rather than actuals. Later template edits do not rewrite existing plans.
- Recurrence keeps the original calendar anchor (Jan 31 → Feb 28 → Mar 31). Active expected windows, normalized estimates and actual charges remain distinct. Definition changes keep snapshots; they never mutate recorded transactions/bills or generate financial history.
- Financial calendar values are database `date` fields. Capture context uses the authenticated saved valid IANA timezone; missing configuration fails explicitly. Historical records never shift on device travel. Server creation/update timestamps are UTC, and unrelated saves do not restamp unchanged parent records.

## Limits and deferred work

The transport is a bounded atomic snapshot of normalized tables, not a JSON database: at most 5,000 entries per top-level collection and 8 MiB per command, with an exact-precision aggregate guard. This is appropriate for the current personal MVP; pagination/per-record commands are needed before materially larger usage. One owner revision deliberately detects concurrent edits across Money; it does not auto-merge disjoint edits.

Unsaved recovery drafts remain in memory; leaving after a warning can lose an unconfirmed draft. Domain localStorage is not authoritative. Recurring definition snapshots are not a complete immutable transaction audit ledger or future effective-dated schedule editor. Automatic occurrences, charge matching, advanced paycheck schedules, refunds, foreign currency, bank imports and historical balance charts remain deferred. The current UI's absent definition-deletion flows have not been added. Local verification is not hosted deployment or a production security/backup/operations review.

## Verification

- Focused store/domain tests: empty accounts, dated basis, edits/deletes, stable retry receipts, uncertain acknowledgments, no duplicate IDs, conflicts/reload, stale reads and confirmed feedback.
- Local API suite (`npm run test:money`): all twelve UI collections, normalized relationships, card boundary/reversal logic, templates, recurrence/versioning, archive, split/fractional-cent rejection and rollback, concurrency, tombstones, user isolation, direct-write/anonymous denial, fresh session and export.
- Database assertions include Money schema, RLS and restricted RPCs alongside existing foundation suites.

Final local validation: **263/263 unit/render/store tests**, **226/226 database assertions** across nine suites, Money API integration, TypeScript, ESLint, SQL lint and production build passed. Browser verification used a disposable invited account: card creation and dated basis, transaction create/edit and recalculated balance, payment/undo, category create/archive/restore, recurring definition and bill creation, failed-save retry, conflict discard/reload, six-section navigation, refresh, logout/login, browser restart and a real restart of the isolated production-build server. Desktop and mobile containment and a mobile allocation form were checked.

Paycheck-budgeting browser checks explicitly covered creation of an allocation group and dated allocation, transaction linkage, derived actual $23.45 against a $50.00 plan, $950.00 unallocated from $1,000.00 income, independent template application, prior-period selection, and survival across refresh/logout/browser/application restart. Missing versus explicit-zero actual income was verified. Broader relationship validation, record deletion and recurrence boundary coverage are also exercised by API/domain tests. No claim of exhaustive visual testing across every theme/device is made; styling was preserved.

The defined existing Money MVP is locally validated and ready for code review. Hosted personal-production readiness still requires deploying/reviewing the migrations, environment/RLS configuration, backups/restore operations and the existing self-service deletion privacy gap; none was bypassed in this local pass. No hosted resources, production financial records, commits or pushes were changed.
