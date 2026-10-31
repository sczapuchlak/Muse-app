# Muse targeted refinement and Money pass

## Existing work retained

The established global shell, six themes, Crystal/Frosted preference system, Daily Edit ownership/date controls, three-day Planner architecture and canonical task/timer models, Ritual recurrence/log semantics, and Nourish library/grocery/hero work were retained. Dedicated finite routes remain; no generic `[module]` placeholder was reintroduced. No commit or push was made.

## Completed in this continuation

- Planner: fixed shared desktop rail/day sizing; task area scrolls internally with pinned source controls and natural top alignment. Compact shared cards replace the old action rows. Inline timer reveals existing start/pause/resume/stop behavior without a second timer model. Classification stages separate workspace/group choices before applying, so moving out of a filtered workspace cannot interrupt group selection. Arrow/Home/End choice navigation, new-group capture and semantic color dot. Permanent drag handles/Move links removed; non-interactive card areas retain placement/reorder/drop. Details retains manual Move and full editing, with MuseChoiceMenu replacing native Workspace/Group selects. Mobile keeps the source sheet, focused day and comfortable controls.
- Rituals: consistent contained status geometry, central filled completed check with optional small actual value, partial progress ring/value, neutral non-interactive unscheduled dash, distinct Unknown/Missed/Upcoming. Top week-date rings use full completed scheduled daily goals only, with weekly targets separate and guarded perfect-day MuseStar/Spark. Existing clipped group banners/reduced motion retained.
- Functional colors: complete semantic roles distribute actions/links/information/nav/filters/completion across each palette. Priority fixes restore cyan/blue/violet/fuchsia Prism Noir and teal/emerald/rose/berry Nightbloom. Existing atmospheric palette values are preserved.
- Nourish: retained compact library and category-first grocery surfaces; resolved the circular sample-data dependency by isolating grocery taxonomy constants. Global capture defaults to Unsorted; optional details and scoped capture remain intact. Nourish and Money now share section navigation.
- Money: real five-section module with one local reducer/provider; paycheck periods/templates/allocations, spending ledger/search/filters/splits, card snapshots/separate payments/history undo, bills/paid status/upcoming reminders, category/subcategory/tag/group management, allocation ribbon, plan/actual/category bars, and utilization. Responsive Muse drawers/choices/materials and a unique environmental trajectories hero. No account numbers, integrations or external UI libraries.

## Accounting and interaction decisions

Integer USD cents; optional missing values remain unknown. Expected income is labelled expected. Unallocated/overallocated plans are literal, nonjudgmental amounts. Only positive fully allocated plans earn the star. Splits retain explicit remainder and reject overassignment. A card purchase counts once as spending; card payments update the manual balance without becoming expenses. Re-saving a stable record applies only its delta. Payment/allocation relationships and safe balance arithmetic are validated. Bill paid status does not invent a transaction. Allocation actuals use explicit links or a recorded manual value. Template updates are deliberate and do not rewrite existing instances.

Latest approved direction replaces older week-strip bottom progress lines and attached completed-value badges with date rings and central completion checks. Planner search/utilities remain in the hero context, not Task List. Module supporting copy is a personal mantra. No unresolved product conflict was found.

## Validation

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm test`: **81 passed**.
- `npm run build`: passed on Next.js 16.4.3; all fixed routes prerender successfully.
- Local HTTP 200/content checks: all five Money views, Daily Edit, Planner, Rituals, Nourish Plan/Saved Meals/Grocery List, Mood; remaining Notes/Insights/Appearance/Settings navigation routes also returned 200.
- Automated checks include recurrence/day progress, canonical task placement/timer behavior, optional nutrition/snapshots, Unsorted grocery capture, six-theme token/material/text checks, exact-money parsing, cross-month reporting, split reconciliation, template independence, archival, card balance deltas and avoiding double-counted payments.
- No connected browser was available (browser discovery returned an empty list). These are domain/SSR/HTTP/structural checks, **not visual or gesture verification**. Desktop/mobile, actual focus/drag behavior and backdrop compositing still need local browser review.

## Sample/local and deferred

Domain records remain fictional/session-local and reset on refresh. Only existing appearance preferences persist. Bills store recurrence and dated reminders, with manual next dates; automatic recurring occurrences are planned. Durable user-owned storage/RLS, concurrency, auditable time/payment/history/snapshot reconciliation, effective-dated recurrence, richer analytics/currency support and cross-module Insights remain later work. No bank connection, forecast, advice, Supabase or authentication was added.

Inspect closely: Task List height across Work/Personal and long source lists; compact task drag/timer/classification and manual Move; Ritual date rings/status alignment; Prism Noir/Nightbloom functional accent balance; Money amounts/charts/edit sheets in six themes and both materials; narrow-screen ledger and section navigation. Existing environmental hero/long-scroll atmosphere and Nourish density should also receive visual review.

## Files created

- `components/MuseSectionNav.css`
- `components/MuseSectionNav.tsx`
- `components/celestial/MoneyCelestial.tsx`
- `components/money/AllocationEditor.tsx`
- `components/money/CardBillEditor.tsx`
- `components/money/CategoryEditor.tsx`
- `components/money/Money.css`
- `components/money/Money.tsx`
- `components/money/MoneyBillRow.tsx`
- `components/money/MoneyCharts.tsx`
- `components/money/MoneyEditors.tsx`
- `components/money/MoneyFields.tsx`
- `components/money/MoneyStore.tsx`
- `components/money/MoneyViews.tsx`
- `components/money/PaycheckEditor.tsx`
- `components/money/TransactionEditor.tsx`
- `components/planner/TaskClassification.tsx`
- `components/planner/TaskTimer.tsx`
- `docs/MONEY_PLANNER_RITUAL_PASS.md`
- `lib/grocery-sections.ts`
- `lib/money-sample.ts`
- `lib/money.ts`
- `tests/money.test.mjs`

## Files materially changed

- `app/globals.css`
- `app/materials.css`
- `app/money/page.tsx`
- `app/themes.css`
- `components/AppShell.css`
- `components/AppShell.tsx`
- `components/MuseIcon.tsx`
- `components/MusePageHeader.tsx`
- `components/PageCelestial.tsx`
- `components/WeekNavigator.css`
- `components/WeekNavigator.tsx`
- `components/nourish/GroceryList.tsx`
- `components/nourish/Nourish.tsx`
- `components/planner/Planner.css`
- `components/planner/PlannerRail.tsx`
- `components/planner/PlannerTaskCard.tsx`
- `components/planner/TaskDetails.tsx`
- `components/rituals/RitualWeekCell.tsx`
- `components/rituals/Rituals.css`
- `docs/DESIGN_SYSTEM.md`
- `docs/FEATURE_SPEC.md`
- `docs/PRODUCT_RULES.md`
- `lib/nourish-sample.ts`
- `lib/nourish.ts`
- `tests/daily-edit.test.mjs`
- `tests/nourish.test.mjs`
- `tests/rituals.test.mjs`

## Permanent documentation

PRODUCT_RULES, DESIGN_SYSTEM and FEATURE_SPEC were updated for stable compact Planner behavior, multicolor semantic interactions, Ritual progress/completion geometry, fast grocery capture, Money ownership/accounting/period semantics, reusable section navigation, and the mantra rule. Implemented local behavior is distinguished from planned persistence/automation/analytics and future exploratory modules.
