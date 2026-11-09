# Vision Boards (#118)

Envision → **Aspirations | Vision Boards | Bucket List**. Implemented on branch `feature/vision-boards-118`, awaiting review. **Background removal: Option A (approved by Stephanie, 2026-11-09)**: Muse guides people to Apple's own cutout feature and keeps the transparency; it never removes backgrounds itself.

## Cohesion Check

1. **Authoritative source.** `vision_boards` (one row per board). A board owns its background, its layered elements and the image files it uploaded.
2. **Related owners.** Aspirations and Bucket List dreams (Envision), Intentions pages (Planner), Muse Marks (Planner, as a symbol vocabulary only).
3. **Duplicates.** None. An element stores `{kind, id, label}` for an Aspiration or a dream: the id plus a name snapshot. A duplicated board shares its source's image files instead of copying them.
4. **Optional relationships.** Every link is optional. Intentions can show a board through a new optional "Vision board" section (a reference to the board id). Boards never create Tasks, goals or Rituals.
5. **Patterns reused.** `MuseSectionNav`, `MuseSearch`, `MuseChoiceMenu`, `MuseSegmented`, `MuseModal`, `GlassPopover`, `MuseOverflowMenu`, `MusePaintPicker`, `MuseColorPicker`, `SaveIndicator`, `.muse-planner-surface`, the Aspirations form classes, the private image pipeline (`uploadBoardImage`), the mobile `.muse-scroll-fade`, and Muse's own icon drawings for Muse Mark stickers.
6. **Place in the cycle.** Envision (imagine) → Intentions (show the board for the period) → live it.
7. **Now or later.** Working: Aspiration and dream links on elements, the Intentions section, a link from a board with a period to that period's Intentions. Future: Aspirations/Bucket List showing "on these boards", Reflections looking back at a period's board, board export as an image.

## Data

- `vision_boards`: title, description, theme, optional period (`month | quarter | year` + aligned start, same rules as Intentions), `size` (landscape 1600×1200, portrait 1200×1600, square 1400×1400), `background` (pinned hex or gradient, never a theme token, so a board looks the same in every theme), `elements` (ordered array: the last is on top), `revision`. Owner-only RLS, four policies, revision trigger.
- **Board units.** Positions and sizes are in board units on the fixed canvas; `x/y` is the element's centre. A board reopens identically on any screen; phones zoom and pan instead of rearranging.
- **Elements:** `image` (asset, non-destructive crop `{shape, zoom, x, y}`, optional border, shadow, sticker outline for transparent images; `cutout`/`useCutout` are reserved for background removal), `text` (font Editorial / Clean / Label, size, color, bold, italic, alignment, optional label tape), `sticker` (decorations or `mark:<icon>` Muse Marks). Any element can be locked and can carry one link.
- **Images** reuse the private `constellation-images` bucket under `owner/board/content-hash`. Same image twice = one file. `asset_paths` is derived by trigger, rejects paths outside the owner's folder, and the storage delete policy refuses to remove a file any board still uses. PNG is now allowed so transparency survives in Safari (which can't encode WebP). Account deletion already clears the owner's folder; the account export includes `vision_boards`.
- **Cleanup.** Deleting a board removes files no other board uses. Leaving the editor removes uploads nothing references (never ones the undo history could restore).

## Editor

- **Canvas library: Konva + react-konva** (MIT; react-konva 19.3 targets React 19.3). Chosen because it gives a mature transformer (drag, resize, rotate, snapping), touch and pinch, clipping for shape crops, real shadows that follow transparency, and the same renderer for previews. Alternatives considered: Fabric.js (heavier, not React-native), react-moveable (older, DOM-based, no React 19 peer support), tldraw (licence watermark for production use), a hand-built DOM editor (more code to own). Konva loads only in the browser and only when a board is shown.
- **Saving:** autosave about a second after each change, an immediate save when the app is backgrounded (iPhone app switch) or the page closes, a recovery copy on this device until the save is confirmed (offered next time: Restore or Discard), revision checks with "Load the latest" / "Keep my version" on a conflict, and the shared save indicator.
- **Undo/redo** (80 steps; typing and sliders merge into one step), Layers list (accessible way to choose any piece), keyboard: arrows nudge (Shift ×5), Delete, ⌘Z / ⇧⌘Z, ⌘D, `[` `]` layers, Esc.
- **Adding:** Photos (multiple), paste or drop images, Text, Stickers (14 decorations + all 24 Muse Marks), Background (any color or gradient).
- **Viewing:** zoom −/+/Fit, ⌘/pinch-scroll to zoom, scroll or drag empty board to pan, two-finger pinch on phones. The canvas owns touch gestures, so the page never scrolls while you work. Phones use the 400px copy of photos unless zoomed in (memory).
- **Crop & shape:** Rectangle, Square, Circle, Oval, Arch, Heart, Star; zoom and drag inside the shape. Non-destructive and editable later.

## Background removal

**Decision (2026-11-09): Option A for v1.** No API and no in-browser model. Photoroom (C) may be revisited later for an integrated Remove Background button; `cutout`/`useCutout` on image elements are kept for that.

**What v1 ships (iPhone and iPad only, so the desktop editor stays uncluttered):**
- **Paste** button beside Photos. Safari only offers its own Paste menu in text fields, so this reads the copied image from the clipboard (Safari asks once). Transparent PNGs stay transparent, get no print frame, and can take the white die-cut **Outline**.
- **Make a cutout** (a quiet text button) opens a compact guide: open a photo in Photos → press and hold the subject → Copy → come back and Paste → optionally Outline. It says plainly that Apple's Photos makes the cutout.
- A one-time, dismissible tip under the toolbar ("A little magic trick…"), remembered per device (`muse.vision.cutoutHint`) and retired once the guide is opened or a cutout is pasted.
- Desktop keeps ⌘V paste and drag-and-drop, with no extra guidance.

The options considered:

| Option | Cost | Download / infra | Quality | Privacy | Notes |
|---|---|---|---|---|---|
| **A. Apple "Copy Subject" + paste** (chosen for v1) | Free | None | Excellent (Apple's model) | On device | Long-press a photo in Photos → Copy, then paste into the board (or Share → Save to Files and upload). Muse keeps the transparency and offers the sticker outline. iPhone/iPad/Mac only; not a button inside Muse. |
| **B. In-browser model** (transformers.js / onnxruntime-web) | Free per image | One-time model download in the browser (tens of MB) + WASM/WebGPU runtime | Good to very good, depends on model | On device | Model licences matter: BRIA RMBG is non-commercial; `@imgly/background-removal` is AGPL; MODNet (Apache-2.0) is portraits only; U²-Net small (Apache-2.0) is lower quality. Slow (several seconds) and memory-hungry on older iPhones. |
| **C. Photoroom API** | ~$0.02/image (monthly plans from ~$20 for 1,000) | API key + a small server route | Very good | Photo leaves the device to Photoroom | Simplest high-quality button. |
| **D. remove.bg API** | ~$0.23/image on the $9/40-credit plan; packs ~$0.21–0.65/image | API key + a small server route | Very good | Photo leaves the device | Most expensive. |

If a one-tap button is wanted later, C (Photoroom) behind a server route with a per-user monthly cap is the recommended path. B is worth revisiting only if a permissively licensed general-object model of acceptable size appears.

Sources: [remove.bg pricing](https://remove.bg/pricing), [Photoroom API cost](https://www.photoroom.com/blog/remove-bg-api-cost-leonardo-ai-vs-photoroom), [@imgly/background-removal (AGPL)](https://npmjs.com/package/@imgly/background-removal).

## Tests

- `tests/vision-boards.test.mjs` (model, crop math, layers, history, migration, integrations).
- `npm run test:vision-boards:db` (local Supabase: RLS, revisions, exact reopen, derived paths, own-folder rule, PNG, shared-file guard, period rules).
- `npm run test:vision-boards:ui` (local browser journey, 32 checks: desktop, iPhone with the cutout guide, dark theme). Headless Chrome can't write to the clipboard, so the Paste button needs a check on a real iPhone.
- `scripts/verify-hosted-vision-boards.sql` (read-only, 12 checks) before and after the staging/production push.
