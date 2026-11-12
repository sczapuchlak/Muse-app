# MVP 1 priority 1 bug fixes — verification

## Scope and integration

Isolated branch `fix/mvp1-priority1`, based on `main` at `948f9b9` (including Claude’s merged Books Phase 4, PR #170). Application verification includes `e37188d`; the subsequent main update only changes release documentation. No integration conflicts. No Books files, models, migrations, existing records, or unrelated page designs are changed. The original working tree remains untouched. Its separate, uncommitted mobile viewport work touches AppShell, MuseModal, GlassPopover, and global layout files. Those edits were inspected read-only and were not copied or modified. AppShell edits are in different rules; re-run this UI journey after that work lands, especially the shared keyboard modal geometry. No conflicts exist against current committed main.

Vision Boards still owns each board in `vision_boards`; existing revision-checked save/load, private assets, optional references, and name snapshots are unchanged. No ownership or relationship changes require an Integration Map update.

## Confirmed causes and fixes

### Vision Board creation on phones

The shared tall dialog intentionally has `overflow:hidden`. The Vision Board form lacked an internal scroll region: at 390×844, its 758px dialog contained 882px of content, with an overflowing 790px form. The existing Aspiration editor’s scrolling rules were scoped to that editor, so did not apply here. Programmatic `scrollIntoView` alone could misleadingly reach hidden content, despite the absence of usable touch scrolling.

The Vision Board details form now has one scrollable field region, a fixed dialog header, and an always-accessible action row. Scoped height constraints use the visual viewport, update on resize/pan, and reserve iPhone safe areas. Inputs retain a 16px mobile floor. Period/shape controls can wrap between buttons; their labels do not break mid-label. Optional labels stay on the same line as their field name where space permits. Existing `MuseModal`, `MuseChoiceMenu`, and segmented controls are reused; their shared implementation is unchanged.

The same fix applies when reopening details to edit a saved board. Persistence and collage composition are untouched.

### Midnight Ballerina login contrast

Midnight Ballerina (`astral`) has a light login card on a dark canvas. The login card was omitted from the light-card ink rebinding used elsewhere. It inherited near-white canvas foreground (`rgb(242,247,255)`) and muted canvas text on `rgba(228,247,251,.99)` glass, including the email placeholder.

Only the astral login card now consumes the existing card ink, muted, accent, and error ink roles. Its inputs, code field, borders, links, validation feedback, and focus ring use these card roles. The primary button keeps its pink fill; hover/active text uses card ink instead of the light canvas action pink. No theme palette or other theme is modified.

Rendered contrast is measured after alpha compositing over both black and white behind the almost opaque card. Conservative minimum ratios from the browser run:

| Element/state | Contrast |
| --- | ---: |
| Heading | 13.81:1 |
| Labels / feedback | 6.52:1 |
| Email text | 14.69:1 |
| Email placeholder | 6.94:1 |
| Email border | 3.60:1 |
| Keyboard focus ring | 7.71:1 |
| Email primary button | 7.27:1 |
| Primary hover text | 13.81:1 |

### Page-wide horizontal line

Reproduced after keyboard navigation followed by dismissing a dialog with no explicit return target. `useMuseDialog` correctly focuses `#muse-main-content`. That noninteractive layout container has `tabIndex=-1`, and the generic `:focus-visible` rule paints a 2px outline across its full width (390px in the phone reproduction). Its upper edge appears as an unexplained horizontal rule.

Only this noninteractive page focus target no longer draws an outline. Its DOM focusability, skip navigation, dialog focus return, and the shared global focus rules remain intact. Buttons, links, and inputs retain visible keyboard focus. The same focus behavior is verified on Envision and the Observatory in three themes.

The exact empty-space tap-only sequence reported by the user was not independently reproduced on physical Safari. This change addresses the reproduced page-outline cause; it does not claim to fix every possible transient Safari rendering artifact. No unrelated borders, decorative pseudo-elements, or global focus styles were suppressed.

## Astrology Library investigation — unresolved reproduction

No content clipping was reproduced in “Start with a spark” on this `main` baseline in Chrome. Inspected the discovery section, featured grid, each tile, text children, ancestors, overflow settings, responsive columns, and the fixed mobile navigation. Tested 1280px, 820px, 390px, and 320px widths, plus enlarged root/body text. No horizontal page overflow or clipped text was observed. The cards’ 1px decorative gradient border extends beyond their client box; this is not clipped content.

Each of the three spark actions can be scrolled clear of navigation, opened, read, and dismissed in Iridescent, Prism Noir, and Midnight Ballerina. Buttons and content remain present. No speculative Astrology or global CSS change is included. The reported clipping remains open for reproduction on the affected device/browser/scroll position; a physical iPhone/PWA check is still needed.

## Verification

- `npm test`: **968 passed**, 0 failed.
- `npm run lint`: 0 errors, **28 existing warnings** in unrelated Books/Collections and their tests. Changed TSX and new scripts: no warnings/errors.
- `tsc --noEmit`: passed.
- Production `next build --webpack`: passed. Existing Settings page warning about the named `version` export remains unrelated.
- Local production-browser regression: **52 checks**; no browser runtime exceptions. Uses headless Chrome with a disposable, onboarded owner and the real local database.
- Create → select year → save → reload/reopen → edit → save verified against persisted board data. Cancel preserves the full saved row. No duplicate board is created.
- Real touch scrolling, 320×568 and 390×844 phone layouts, desktop, conditional month/year/quarter menus, and three themes checked.
- Chrome safe-area override (47px top / 34px bottom) checked. A simulated 400px panned visual viewport verifies keyboard-height positioning and reachable actions.
- Real local email-code request/verification and incomplete-code feedback tested. Google’s actual OAuth handoff is intercepted at local Supabase and returned as a denied callback, exercising recovery without contacting Google.
- Astrology cards, navigation overlap, dialog opening, skip navigation, and interactive keyboard focus verified across three themes.

Physical iOS Safari keyboard animation, installed-PWA behavior, VoiceOver, and successful live Google account consent are **not** established by headless Chrome emulation. These remain manual acceptance checks. No hosted environment or real library was used.

## Reproduce locally

Requires Docker, dependencies, and macOS Chrome. This test setup is separate from `muse-local` and the Books test projects. It has no reset/repair/migration-history operation.

```sh
node scripts/mvp1-test-db.mjs start
MVP1_BUILD=1 MVP1_PRODUCTION=1 node scripts/test-mvp1-ui.mjs
node scripts/mvp1-test-db.mjs stop
```

The helper copies the repository’s migrations/templates into a dedicated local project, checks that a pre-existing migration copy matches, and refuses an unexpected project configuration. Published ports must be loopback only. The browser harness refuses a database other than the dedicated local API on port 56321. It removes its disposable owner and browser profile after testing. Screenshots are emitted to `/private/tmp/muse-mvp1-after`.

The Docker network `muse-local-only` and the existing repository Docker wrapper are reused. No hosted keys are required. Tests create no real mail: the email flow uses the local mail service.

## Release boundaries

No new migrations or data backfill. No merge or deployment performed. This branch is disabled in `vercel.json` Git auto-deployment settings so pushing the review branch does not deploy it. Staging and Production settings are otherwise unchanged. Any hosted acceptance deployment needs a separate instruction.

## Screenshots

All screenshots use disposable local data.

- [Phone creation: scroller and fixed actions](qa/mvp1-priority1/vision-phone.png)
- [Small phone with safe areas](qa/mvp1-priority1/vision-small-phone.png)
- [Simulated keyboard viewport](qa/mvp1-priority1/vision-keyboard.png)
- [Desktop creation](qa/mvp1-priority1/vision-desktop.png)
- [Midnight Ballerina email](qa/mvp1-priority1/login-astral-email.png)
- [Readable validation](qa/mvp1-priority1/login-astral-error.png)
- [Astrology investigation, tablet](qa/mvp1-priority1/astrology-820.png)
