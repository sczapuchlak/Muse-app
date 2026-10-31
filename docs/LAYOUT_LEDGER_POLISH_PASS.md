# Focused layout and ledger polish

## Completed

- Money Overview uses two explicitly authored, independently flowing desktop stacks. Left: Current paycheck → Recorded spending → compact Recurring. Right: Coming up → Plan/actual. Cards stay content-sized, with existing 24px token gutters and no equal-height/filler sizing. Full-width Recent Spending follows both stacks. Narrow screens stack the authored groups in DOM reading order, preserving focus order. Money navigation/period spacing is tightened with existing tokens.
- Paychecks has readable title/date/income/allocation figures, three bounded Previous/Current/Next choices and searchable older history. Two clearly fictional September income records demonstrate history without inventing allocations. A separate inline category selector uses existing category IDs/colors; edits retain amounts, links and template independence. Numbers/variance align in a ledger and recompose with labels on small screens.
- Bills uses a readable ledger: name/cadence, due date, amount, text status, manual payment action and edit menu. Paid/overdue/upcoming/unpaid-today states are derived, theme-aware and not color-only. Marking paid still changes only the canonical bill status.
- One document-height shell atmosphere replaces the fixed viewport plane. Theme bloom colors and upper identity are retained through viewport-relative upper anchors; soft, non-repeating lower fields span changing content lengths. Hero art fades on all edges and reserves measured control space; narrow layouts hide decoration before date/week/toolbars crowd. No theme identity or Prism Noir palette redesign.
- Daily Edit retains the large personalized greeting and section heading. A separate smaller sans-serif supporting mantra rotates daily through 24 reusable lines, stable while editing with no consecutive-day repetition.
- Planner defaults to two scan rows: checkbox/title/stopwatch, then clickable workspace/group and tags. Due/estimate/scheduling/subtask facts stay in Details. An optional due-preview prop supports future settings without adding a preference UI. Stopwatch reveals an inline tracked/estimated panel using the same canonical timer; collapse does not reset it. Native drag, ordering, dates, classification and all Details fields remain.
- Planner Filters now uses compact searchable sections, semantic checkbox/radio rows, Group, match-all Tags, Show completed, existing scheduled-time-only filtering, status, clear/done and an active count. One results area scrolls, preserving header/footer. Workspace remains in Task List.
- Shared tags/search/focus/choice menus use consistent padding/line-height/radius, contained focus outlines and semantic accent roles. Popover geometry intersects visual viewport and modal bounds, including keyboard offsets, with no oversized forced minimum. Search/results/footer avoid nested scrolling.
- Categorized Grocery List was already implemented and is retained/route-verified: 13 stable sections including Unsorted, scoped/global capture, checks/quantity/edit/removal and recoverable completed items. No large permanent form is rendered. Notes now stay in the existing editor instead of default row space.

## Files created

- `components/money/MoneyPaychecks.tsx`
- `components/money/MoneyAllocationRow.tsx`
- `lib/daily-mantras.ts`
- `lib/popover-layout.ts`
- `tests/visual-polish.test.mjs`
- This report.

## Files changed in this pass

- `app/atmosphere.css`, `app/themes.css`, `app/globals.css`
- `components/AppShell.tsx/.css`, `PageCelestial.tsx/.css`, `MuseHeader.tsx/.css`
- `components/GlassPopover.tsx/.css`, `MuseChoiceMenu.tsx/.css`
- `components/planner/Planner.tsx`, `PlannerTaskCard.tsx`, `TaskTimer.tsx`, `TaskClassification.tsx`, `PlannerFilters.tsx`, `Planner.css`
- `components/nourish/GroceryList.tsx`
- `components/money/Money.tsx`, `MoneyViews.tsx`, `MoneyBillRow.tsx`, `Money.css`
- `lib/planner.ts`, `lib/money.ts`, `lib/money-sample.ts`
- `docs/PRODUCT_RULES.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURE_SPEC.md`

Existing unrelated working-tree changes are preserved. No commit or push.

## Models and remaining scope

Canonical task, money and grocery record shapes remain. The only new filter configuration is optional `timeboxedOnly`, using existing timeSlot data. Paycheck navigation/bill statuses are derived selectors, not duplicate records; two additional income records are fictional fixtures. Category edits clear incompatible subcategory selection without rewriting templates or actual events. No persistence, Supabase, auth, bank integration, timer duplication or new UI library.

Due-date preference UI, durable timer/order/history records, production persistence and later Appearance controls remain approved/planned. Domain state still resets on refresh. Manual bill paid state never creates spending or conflates a bill occurrence with a recurring expectation.

## Validation and limits

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm test`: **102 passed**.
- `npm run build`: passed on Next.js 16.4.3; all fixed routes generated successfully.
- HTTP 200 checks: Daily Edit, Planner, Rituals, Nourish Plan/Grocery List, Money Overview/Paychecks/Recurring, Mood and Notes.
- Rendered content checks confirm shared atmosphere, separate mantra, compact task rows, no default due preview, categorized Grocery List without a permanent form, independent dashboard columns, historical selector, inline categories and bill actions/statuses.
- Automated checks cover all eight theme contracts/material/text contrast, canonical placement/timer/edit behavior, filtering, grocery semantics, financial calculations and bill semantics. New tests cover column structure, bounded history, category preservation, bill states, mantra rotation, inline timer structure, due-preview configuration and popover placement for desktop/laptop/tablet/mobile/keyboard/modal bounds.

Browser discovery returned no connected browser. These are domain/SSR/geometry/HTTP/build checks, not visual, pointer, touch, keyboard-focus or real compositing approval. Local browser review remains necessary: full-page background continuity while scrolling Nourish, hero safe regions, compact task drag/timer/filter behavior, tags/focus clipping, all eight themes/materials, authored Money stacks, ledger typography, historical navigation and mobile reflow. No known implementation blocker remains; visual approval is pending.
