# Daily Edit — explicit reference column stacks

Supersedes the earlier grouping experiments and missing-reference assumptions in the previous correction reports. Uses the user's explicit left/right card sequence.

Desktop left (8 parts): Forecast → Priorities → Movement → Water → Mood → Day in Three.

Desktop right (5 parts): Little Rituals → Plan → Meals → Day Pulse.

`DailyEdit.tsx` places existing cards directly in two flex stacks inside one page-level grid. Existing DailyCapture/WellnessCapture boundaries remain with their controls. There is no nested Mood/Pulse grid, shared card row, height equalization, spacer or compensation margin. Card padding, themes, data owners, status/retry controls and child functionality are unchanged. Little Rituals CSS is untouched: it grows naturally up to its existing30rem maximum, then only its list scrolls. Plan retains its actual-content height and bounded preview. Every card follows its previous same-column neighbor by `--grid-gap`, and column gutter uses the same token.

At the existing880px content breakpoint the wrappers flatten into a single column, preserving sensible progression: Forecast, Priorities, Rituals, Plan, Movement, Water, Meals, Mood, Pulse, Day in Three. Pulse uses the whole right track on desktop; Day in Three uses the whole left track directly after Mood. All ten cards appear once.

Files: `components/DailyEdit.tsx`, `components/DailyEdit.css`, `tests/insights.test.mjs`, and the current product/design/feature docs. No theme/token, persistence, database, authentication or business-rule edits.

## Validation

- 23 focused Insights/daily-experience/subtitle tests passed, including exact column membership, order, unique card instances and no nested reflection grid.
- TypeScript, ESLint and production build passed. Whitespace check passed.
- Full suite is not repeated for this layout-only correction. Previously reported protected Disco assertions remain a separate issue, not silently skipped or fixed here.
- Actual authenticated Chrome checks passed at1440/1100/768/390px. All ten unique cards have exact column membership/order, equal adjacent vertical gaps, aligned column edges and no horizontal overflow. Mobile order is verified against actual bounding boxes.
- Empty → three → sixteen saved Rituals: card grows naturally, pushes Plan/Meals/Pulse by the same displacement, leaves the left stack unchanged, then scrolls internally at the existing cap. Adding nine planned tasks grows the bounded Plan preview and pushes Meals/Pulse without moving Mood. No same-column gap changes.
- Complete-page desktop/mobile screenshots were captured and visually inspected, including light and dark desktop paint. Pulse track bounds stay inside its full-width right card. Day in Three remains directly beneath Mood at left width. Full-page fixed mobile navigation is captured at its original viewport position, as expected for browser screenshot capture.
- Browser QA uses disposable local accounts; records/accounts were deleted afterward. The initial harness used a consumed/unsupported QA login-link type; a fresh email callback fixed the harness. No auth implementation changes.

Ready for visual review of this clarified layout. No commit, push or deployment.
