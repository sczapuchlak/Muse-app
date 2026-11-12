# Vision Board desktop image paste follow-up

## Report and confirmed findings

Reported on a MacBook in Chrome and Safari: copying an image from a website, then trying Command V or right-click Paste.

The previous implementation accepted image files from a native paste event, and a local Chrome test verified those images could upload and persist. However, the explicit Paste button was rendered only on iPhone/iPad. Desktop canvas right-click had no Muse Paste action. Clipboard payloads without image files were silently ignored. The original physical Mac Command V failure was not independently reproduced; native computer automation was unavailable. Raw CDP key injection also does not execute browser shortcuts in a normal textarea, so that automation limitation is not treated as an application failure.

## Changes

- Show the existing Paste action on desktop as well as mobile. Keep the Apple cutout guide and hint Apple-touch only.
- Add a canvas-specific right-click **Paste image** action using the existing GlassPopover component. Escape returns focus to the canvas.
- Explicitly focus the canvas on desktop pointer interaction, preserving board drag/selection behavior and normal native paste handling.
- Accept image files or file items from native clipboard events. If the event has no image bytes, try the existing async clipboard image reader and give actionable feedback for unavailable image data or denied permissions.
- Keep text-field paste native. Never fetch copied links, parse clipboard HTML into the canvas, or access the clipboard without an explicit paste action.
- Preserve the existing image preparation, transparency handling, owner-private upload, collage insertion, revision checks, and autosave paths.

Only Vision Board components, its clipboard helper/tests/documentation, and the review branch's Vercel deployment hold are changed. No Books or shared layout/theme/modal implementation changes. No schema changes or migrations.

## Verification

- `npm test`: **975 passed**, 0 failed, including 6 clipboard payload/permission tests.
- `npm run lint`: **0 errors, 27 existing warnings** in unrelated files. Changed code and new tests/scripts lint cleanly.
- `tsc --noEmit`: passed.
- Production `next build --webpack`: passed. Existing Settings named `version` export warning persists. This machine ran low on disk; only this worktree's generated webpack cache was cleared. The cache warning did not prevent production compilation.
- Local production Chrome journey: **15 checks passed**, no browser runtime exceptions.

The browser test uses a generated PNG with transparent pixels and webpage-style HTML alongside it on an isolated browser clipboard. It exercises real native browser paste events and the async clipboard API, not a synthetic ClipboardEvent or mocked upload. The browser's explicit paste edit command is used because CDP raw Meta+V does not invoke Chrome's shortcut command dispatch. It does not claim to reproduce native Copy Image clicks from a real website, physical Mac keyboard input, or Safari.

Verified journeys:

1. Desktop Paste is visible; Apple-specific instructions remain absent on desktop.
2. Clicking the canvas gives it keyboard focus; a native browser paste saves exactly one image.
3. Toolbar Paste and right-click Paste image each save one additional image.
4. Escape closes the context action and restores canvas focus.
5. Text editing receives ordinary native text paste without importing an image. Returning to the canvas restores image pasting.
6. A copied URL gives guidance and leaves the persisted board unchanged.
7. Denied clipboard access leaves saved data unchanged; granting permission again allows a successful retry.
8. Reload restores exactly the five explicitly pasted images and the text element.
9. Phone-sized layout retains Paste and the Apple cutout guide without horizontal page overflow. This is Chrome UA/layout emulation, not Safari acceptance.

All test accounts/boards/images are disposable and local to `muse-mvp1-priority1`, API port 56321. No real Vision Boards, hosted data, or Books data are used. An interrupted test was rerun; the final 15-check run passed. Test cleanup removes private image files before deleting the owner.

## Repeat locally

```sh
node scripts/mvp1-test-db.mjs start
MVP1_BUILD=1 MVP1_PRODUCTION=1 node scripts/test-vision-paste-ui.mjs
node scripts/mvp1-test-db.mjs stop
```

Requires the repository's Docker setup, dependencies, and macOS Chrome. The harness checks the dedicated local project and API URL. Browser screenshots are written to `/private/tmp/muse-vision-paste-ui`.

## Manual acceptance still needed

On the MacBook, in **both Chrome and Safari**: copy an image from a website with Copy Image; click the board and use Command V; then test the toolbar Paste and right-click Paste image, approving any clipboard prompt. Reopen the board to confirm it saved. Also verify browser denied-permission guidance and normal paste into a text element. Safari/iOS clipboard permission prompts and physical shortcuts cannot be established by headless Chrome.

The fix is for review only. No merge, hosted migration, or deployment is authorized/performed. This review branch is held from automatic Git deployment in `vercel.json`.

## Screenshots

- [Desktop Paste button and canvas context action](qa/vision-paste/desktop-context-menu.png)
- [Persisted collage after explicit pastes](qa/vision-paste/desktop-pasted-images.png)
- [Mobile toolbar and cutout guidance](qa/vision-paste/mobile-paste-toolbar.png)
