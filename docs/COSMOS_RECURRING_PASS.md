# Muse cosmos, rewards, birthday and Recurring refinement

## Completed

- Task List now contains its title, existing custom workspace selector, quick capture and immediately stacked task cards. Standalone New workspace, Unscheduled label/count, explanatory copy and helper footer are removed. Fixed desktop sizing/internal scrolling and naturally top-aligned short lists are preserved. The workspace popover retains contextual choices/markers/selection, separated New workspace and existing organization flow; keyboard opening/arrow/Home/End and creation-field focus are supported. No second workspace manager.
- Theme/material switching moved from heroes to the sidebar footer near Appearance/Settings, compact orb when collapsed; mobile uses app chrome outside the hero. Existing immediate theme/material preferences and the Appearance destination remain. Full deeper Appearance configuration is still planned. Daily Edit stars sit left of the date, week below.
- Reusable gold AchievementStar and guarded AchievementBadge share the canonical Muse geometry. Water below/exactly/above target is handled with actual amount retained and bar capped. Perfect scheduled daily Rituals and positive fully allocated paychecks use the same gold. Initial history/date hydration does not celebrate; ordinary cells/recurring charges do not earn gold. Reduced motion has static feedback.
- Whole-hero abstract nebula, aurora, haze, refraction, cropped forms, dust and sparse official stars replace high-level literal diagrams. Compositions vary for Daily Edit, Planner, Rituals, Nourish, Mood, Money and Notes. Old high-level line-art renderers are removed. The profile constellation utility remains dormant, outside the rendered hero. Mood/Notes remain placeholder modules with hero treatment only.
- Ritual completion is a dimensional multicolor theme orb. Binary completion uses a central white check; numeric/duration completion keeps its achieved central value and a small neutral/white-check badge. Partial rings, centered footprint, statuses, schedules and daily denominators remain. Perfect-day reward is gold, individual completion stays theme-colored.
- Assigned Nourish tiles show known Cal/P/C/F values instead of note/source copy. Zero remains known, unknowns are omitted, details retain data, daily totals remain. Saved and one-off assignments share the display. Move/Copy and native drag remain; drag is activated from non-interactive tile areas.
- ISSYA BDAY! / Frosting and ISSYA BDAY XXX! / After Hours are related registry entries with shared candy semantics and purpose-designed white/black Crystal/Frosted surfaces. Deterministic capsule/dash/dot/diamond/curve accents, eight chart roles, candy progress/orbs, previews and persistence are implemented. Only a first meaningful earned goal gets eight tiny transient candy pieces; no falling/full-screen confetti. Existing six atmospheric identities are preserved.
- Money Recurring is a sixth internal section, with compact chronological rows, search, All/Monthly/Yearly and one category/method/provider/status Filters popover. Add/edit uses Muse drawers and custom choices. Existing categories/cards and shared safe non-card payment-method labels are reused. Dashboard preview is capped at three charges; cards link to the same recurring records.

## Recurring semantics and decisions

Expected recurring obligation is separate from actual spending, dated bills and card payments. Saving or computing dates never creates a transaction or changes a card balance. Billing source and payment method are distinct. Paused/cancelled/ended items leave future totals/upcoming but remain historical records. Matching linked bill dates are deduplicated from dashboard reminders; cancelling an expectation never erases a recorded unpaid bill.

Monthly/yearly/weekly/fortnightly/quarterly/six-month/custom positive intervals derive dates from the original anchor, including short months/leap years. The editor displays the next expected charge while preserving the original billing day on unrelated edits. Deliberate date/schedule edits reanchor. Real charge amounts/frequencies remain primary; monthly bills, annualized estimate and monthly equivalent are labelled separately. Variable amounts use approximate indicators; unknown amounts remain unknown. Expected category cost does not enter actual category-spending charts. Day/week normalization uses 365.2425 days/year; aggregate estimates round to cents.

No bank integrations/credentials, Supabase/auth, external cancellation, major Notes/Mood/Insights implementation, new UI libraries, commit or push. Records remain fictional/session-local. Durable occurrence/history, transaction matching, effective-dated schedule/pricing, paycheck automation and calendar/timeline remain planned.

## Files created in this pass

- `components/AchievementStar.tsx`, `components/AchievementStar.css`
- `components/CosmicSprinkles.tsx`, `components/CosmicSprinkles.css`
- `components/nourish/MealMacros.tsx`
- `components/money/RecurringEditor.tsx`, `components/money/MoneyRecurring.tsx`
- `lib/recurring.ts`, `tests/recurring.test.mjs`
- This report.

## Main files extended

- `app/themes.css`, `app/globals.css`, `lib/themes.ts`, `lib/navigation.ts`
- `components/AppShell.tsx/.css`, `ThemeSwitcher.tsx/.css`, `MuseHeader.tsx/.css`, `MuseStar.tsx`, `PageCelestial.tsx/.css`, `ModulePlaceholder.tsx`
- `components/WaterCard.tsx`, `WeekNavigator.tsx`
- `components/planner/PlannerRail.tsx`, `PlannerWorkspaceMenu.tsx`, `PlannerOrganization.tsx`, `Planner.css`
- `components/rituals/RitualWeekCell.tsx`, `Rituals.css`
- `components/nourish/MealSlot.tsx`, `Nourish.css`
- `components/money/Money.tsx`, `MoneyViews.tsx`, `MoneyCharts.tsx`, `MoneyEditors.tsx`, `TransactionEditor.tsx`, `CardBillEditor.tsx`, `Money.css`
- `lib/money.ts`, `lib/money-sample.ts`
- `tests/daily-edit.test.mjs`, `tests/refinement.test.mjs`, `tests/rituals.test.mjs`, `tests/nourish.test.mjs`
- `docs/PRODUCT_RULES.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURE_SPEC.md`

Retired high-level source: `components/celestial/{CelestialPrimitives,PlannerCelestial,RitualsCelestial,NourishCelestial,MoodCelestial,MoneyCelestial}.tsx`. Existing unrelated working-tree changes were preserved.

## Verification

- ESLint, TypeScript, **94 tests** and final Next.js 16.4.3 production build passed.
- All eight themes supply the same token contract. Numeric checks cover text/materials, filled labels, dark planning hierarchy and white orb/badge contrast; appearance preferences restore all entries.
- Water SSR checks cover below/exactly/above target, true quantities, capped bar, gold geometry and calm initial earned state. Macro checks cover unknown, partial, zero, assigned tiles/data preservation and daily totals.
- Recurring tests cover anchored month ends/leap years, all supported intervals, status/end exclusion, normalization/unknowns/estimates, provider/method/custom-category filtering, stable references, no generated actual spending, bill deduplication, compact preview and safe date editing.
- HTTP 200 and content/structure checks passed for Daily Edit, Planner, Rituals, Nourish, Mood, Money overview/Recurring and Notes. Checks confirm theme outside hero, stars before date, simplified Task List, meal macros and recurring dashboard content.
- Browser discovery returned no connected browser. **No visual/gesture/touch/focus-compositing approval is claimed.** Actual browser review is still needed for birthday contrast/saturation/white-black balance, abstract hero density, sidebar/collapsed/mobile theme control, gold threshold glints, Ritual orb/badge balance, meal macro wrapping and recurring sheets/filters. Automated/HTTP checks do not substitute for that review.
