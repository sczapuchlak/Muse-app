# Theme picker subtitles and Daily Edit restoration

## Changes

- All nine exact approved descriptions live in `lib/themes.ts`. Existing names, IDs, order, swatches, modes and birthday family/variant metadata are unchanged (verified against the pre-change registry).
- ThemeSwitcher uses its existing name/secondary-caption structure; Appearance uses the same descriptions, replacing the old short birthday caption. A subtitle-only whitespace/wrapping declaration preserves its existing typography. Theme paint/tokens, borders, animations and persistence are untouched.
- Existing upper Daily Edit cards stay in place. Mood/Pulse are removed from the narrow right track into the page-level reflection grid. Both are top-aligned and readable at full track widths. Pulse spans the reflection rows at natural height, leaving Day in Three immediately below Mood with exactly the shared gap. Narrow layouts keep Mood → Pulse → Day in Three. Existing capture/state/owner components are reused once each.

## Actual validation

- 35 focused tests passed: exact copy/rendered Appearance captions plus existing Insights/layout/theme/Session2 regressions.
- TypeScript, ESLint, production build and whitespace checks passed.
- Disposable local authenticated Chrome: desktop picker contains all nine exact captions; all nine themes switch, selected ID saves to localStorage, and refresh restores it after hydration. Actual mobile/tablet Appearance chooser displays all nine captions with clean wrapping and all nine selections working.
- Daily Edit checked/screenshot inspected at1440/1100/768/390px. Mood/Pulse top alignment, broad widths, Day in Three left alignment and exact Mood-to-Day-in-Three gap asserted in paired mode; stacking and horizontal containment passed at narrow widths. No slider clipping or narrow nested reflection tracks. Screenshots inspected for the picker and restored reflection area. QA account removed.
- Full suite was not repeated for this targeted pass. The three previously reported protected Disco material/contrast failures remain unaddressed; this update does not claim a globally green suite or production signoff.

## Review limitations

The referenced approved-layout screenshot was not included in this message. Restoration follows the written requirements and earlier repository composition; exact comparison to that image cannot be claimed. A clarification was requested.

The left upper stack is intrinsically taller than Plan in sparse states. Keeping upper placement unchanged and a top-aligned broad reflection row necessarily leaves space below the shorter upper column. There are no added margins, reserved empty rows or stretched cards concealing it. Removing that remaining space would require a composition/size change that this brief forbids; it remains for visual review.

No commit, push, deployment, schema, persistence, business-rule or appearance-token change.
