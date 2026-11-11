# Focused Money, Notes, Planner and Appearance polish

## Scope and prioritized findings

This is frontend-only work. Login, Daily Edit, approved theme palettes, persistence, authentication and financial calculations are unchanged. Findings were identified before editing; the table records their final disposition.

| Priority | Area | Finding | Resolution |
| --- | --- | --- | --- |
| P2 usability | Notes | Empty-editor action buttons participated in the vertically centered message layout. | Separate top-right editor header; center only the message horizontally, retaining its approximate vertical anchor. Selected-note editor is unchanged. |
| P2 usability | Planner | Planned date's Move control increased its label row height relative to Due date; Workspace/Group label spacing differed. | Shared label/control tracks, consistent 44px control minimum, paired desktop fields and single-column narrow-screen order. No field or action removed. |
| P2 usability | Appearance | Muse Magic choices had no explicit group gap or wrapping layout. | Component-owned wrapping flex group with the existing 8px spacing token. |
| P2 readability | Money | Chart labels, allocation legends and account fact labels used roughly 11px text; chart details were roughly 10px. | Labels increased to 14px; chart details to about 13px; chart values explicitly use tabular numerals. Existing 30–36px headline totals and 20px Recurring values retained. |
| P3 polish | Money | Compact paycheck names were permanently ellipsized. | Allow natural name wrapping while retaining compact bounds, selected styling and history navigation. |
| Already implemented | Money | Spending/Plan alignment, full-width Recurring, aligned summary amounts, far-right Past Paychecks. | Verified the final CSS cascade and preserved the existing markup/layout. Earlier independent-stack design guidance was superseded by Session 2; DESIGN_SYSTEM now states the current approved arrangement. |
| Already implemented | Login | Neon atmosphere without rectangular confetti. | Preserved the existing login-scoped implementation. No copy, styling or auth edits. |
| Already implemented | Insights | Ghost owner-navigation actions, evidence disclosures and separation of financial insights. | Source review confirms RevelationList's ghost links/native disclosure and Overview's exclusion of Money revelations. No calculations/content rewritten. |

## Shared-pattern review

Reviewed shared headers, choice menus, modal/drawer containment and documented button/spacing patterns used by Daily Edit, Rituals, Wellness, Mood, Money, Notes, Insights and Settings. Existing semantic controls, theme tokens, focus treatment, dialog scrolling and reduced-motion behavior were retained. No new design system or global link reset was introduced. The focused fixes above are genuine alignment/readability issues; further aesthetic changes are optional and require a separate review. This is not a new comprehensive authenticated acceptance audit of every module.

## Verification

- 43 focused Money, Notes, Planner persistence and UI Session 2 tests passed.
- Final full suite: 299/299 passed. TypeScript, ESLint and production build passed. The initial sandboxed build stopped progressing; rerunning with the required local process/network permissions succeeded.
- Isolated headless Chrome fixtures checked all nine themes at 390, 768, 1024 and 1440px: no document horizontal overflow in 36 combinations.
- Additional rendered Money fixtures with 0, 3 and 30 synthetic recurring records checked the same four widths. Spending/Plan top edges match on desktop; Recurring amount right edges match; long paycheck names wrap. Mobile stacks naturally.
- Notes/Planner/Muse Magic layout fixtures confirmed the empty toolbar at the panel top edge, centered Notes content, aligned desktop date inputs and an 8px gap between Magic choices.
- Inspected desktop/mobile screenshots. Fixtures use repository Money SSR components and representative Notes/Planner markup with actual styles; they are not authenticated application E2E checks. No personal financial export, user data, database records or hosted environment was accessed or changed.

## Remaining limitations

Full authenticated interaction testing (opening editors/dropdowns, note creation/focus transitions, timing and saves) was not repeated for this layout-only pass. Existing behavior is preserved by unchanged handlers/data access and relevant regression tests. Supplied screenshots were not present in the attachment; validation uses the current implementation and explicit written requirements rather than an unverified pixel comparison.

## UI Fixes 4.0 (#130), stage 1 and Intentions

Implemented on `feat/130-ui-fixes-4`: Cosmic Forecast actions centered side by side and responsive, Preferences bottom-left with the CosmyDay credit right; Today's plan workspace chooser content-width; Day in Three emoji search and category side by side with a taller grid and 44px targets; Intentions prompt library (see FEATURE_SPEC); Intentions page text now uses the light-card ink on Midnight Ballerina and Pretty Toxic. Not started (separate stages): Mood vocabulary expansion and manual Steps.

**#130 Mood:** one cohesive feelings library with custom feelings, personal interpretations and per-entry snapshots (see FEATURE_SPEC). Manual Steps is not started.
