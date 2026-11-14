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

## Vision Boards 2.0: the creative studio (#187)

Implemented on `feat/vision-boards-2`. Staging acceptance is pending. The approved additions are below; the clarification about editable borders, radii and canvas space is reflected throughout.

**Data (backward compatible).** Every existing board parses exactly as before. All new fields are optional jsonb, and no stored element changes form.
- **Paint.** One `Paint` type (`lib/vision-boards/paint.ts`) fills everything:
  - `solid` (pinned hex);
  - `gradient` (2–3 stops at any whole-degree direction; boards aren't limited to the app's four);
  - `pattern` (a library id `kind/category/name` or one of the person's private uploads, with `scale`, `rotation`, `x`/`y` offset and an optional base color; uploads can repeat or cover once).
- **New element kinds.**
  - `shape` uses `decorShapes`: rectangle, rounded, square, circle, oval, arch, heart, star, scalloped card and circle, wavy, organic, torn paper, ticket, tag, label, ribbon banner, speech bubble. It has a fill paint, a border stroke (paint + width), an editable corner radius, a shadow, a finish and an optional `role` (`backing`, `paper`).
  - `piece` places a library item (paper, washi, stickers, labels, ribbons, frames, illustrations) with an optional die-cut outline and finish.
- **New fields on existing kinds:**
  - every element: `opacity`, `groupId`;
  - photos: border paint, corner `radius`, `outline` paint (die-cut edge), `finish`, a custom `shadowStyle`;
  - text: `family` (Google Fonts catalog), `weight`, `letterSpacing`, `lineHeight`, gradient `paint`, `stroke`, `shadowStyle`, `glow`;
  - doodles: `paint`, `shadowStyle`, `finish`.
- **Canvas size.** `size` can be `custom` with `canvas_w`/`canvas_h` (400–8000 board units). Canvas size and zoom are separate:
  - Adding space on a side never scales, moves or distorts anything. Space on the left or top shifts every piece's coordinates by the same amount, and the editor shifts the view back, so the art stays still on screen.
  - Setting exact dimensions keeps a chosen anchor fixed.
  - The area outside the board is a pasteboard: pieces can rest there, and exports leave them out.
- **Storage guard.** Migration `20261220000100_vision_boards_studio.sql`:
  - The `asset_paths` trigger now collects every `path`/`thumbnailPath` at any depth of `elements` and `background`, and runs when either changes. Files used only as pattern fills or backgrounds are protected from deletion like photos, and still must be the owner's own.
  - It adds `custom`, plus a check that a custom board always has valid dimensions and a preset never does.

**Rendering.** One paint engine (`paintCanvas.ts`) draws the editor, previews and exports identically. Fills, borders and outlines are paths generated at the element's real size (`lib/vision-boards/decor.ts`), so they follow the true geometry: rounded corners, scallops, notches and curves.
- **Patterns** keep their own scale whatever the zoom.
- **Die-cut edges** grow the art's alpha silhouette with a round brush, so the edge follows the shape without removing any background.
- **Sticker finishes** (Matte, Glossy and Holographic) apply at once from a "Sticker finish" section; the canvas is the preview. Each is a stack of layers confined to the silhouette (path or alpha), so it follows irregular cutouts:
  - **Matte paper:** grain and fibres, diffuse light, soft inner edge shading.
  - **Glossy vinyl:** depth, a crisp sheen band, a specular hotspot, a bright rim.
  - **Holographic foil:** pink, lavender, cyan, mint and peach bands that keep the art's own shading, diffraction lines, a sheen and a foil rim.
  - Each has an intensity slider (Texture, Gloss or Foil).
  - Optional shimmer for holographic runs in the editor only: never in exports, never with reduced motion.
  - Optional "lift": a soft shadow the finish casts when the piece has none of its own.
  - Finish layers are cached per silhouette, so redraws while dragging are cheap on phones.

**Editor.**
- **Inspector.** A contextual panel replaces the selection bar: beside the canvas on desktop, under it on narrow screens.
  - Nothing selected shows the board: size and added space, background, export.
  - Selected pieces show only their own controls.
  - A mixed selection shows what they share: opacity, shadow, finish, arrange.
- **Library.** One browser holds shapes, saved favorites, patterns, textures, paper, washi, stickers, labels, ribbons, frames, illustrations and the original doodles and Muse Marks. It has search and categories; favorites and recents are kept on this device.
- **Fonts.** The font picker has the three Muse fonts plus 151 Google Fonts. Families load lazily; previews fetch only the letters of each family's name. It has search, categories, favorites and recents.
- **Selection and arrangement:**
  - multi-select (Shift/⌘-click, the Select mode box, Shift-drag, ⌘A);
  - group and ungroup (⌘G / ⇧⌘G); double-click or the Layers list picks one piece inside a group;
  - align (to the selection, or to the board for one piece) and distribute;
  - snapping guides to edges and centres of pieces and the board (Alt drags freely; the Snap toggle turns it off);
  - copy and paste pieces (⌘C/⌘V, ⌘X); pieces with private photos only paste into their own board;
  - copy and paste style (⌥⌘C / ⌥⌘V);
  - duplicate, lock, layers, undo and redo, including canvas size.
- **Photos:** "Add a backing" puts a patterned scrapbook mat behind a photo, grouped with it. "Make it a sticker" adds a white die-cut edge, a glossy finish and a shadow.
- **Saved colors and gradients** are the person's Muse-wide palette, shared with Planner. A saved board gradient takes the nearest of Planner's four directions; the board keeps its exact angle.
- **Export.** PNG or JPEG at twice the board's size, capped at 16 million pixels for iPhone. It is rendered offscreen after every image and font has loaded. Phones offer the share sheet.
- **Pattern collection.** 70 original patterns plus the earlier 8 fills (78 in all), in 10 categories. One collection serves backgrounds, shape fills, backings and paper, borders, die-cut edges and doodles.
- **Pattern browser.** A category dropdown with ★ Favorites and Recently used, search over names, tags and categories, a thumbnail grid with the current choice ringed, and your own uploads.
- **Other assets.** See [VISION_ASSETS](VISION_ASSETS.md). The other kinds still ship 2–5 original test assets each.
- **Editing text with the panel hidden.** The toolbar shows a **Style** dropdown (the same controls) whenever a piece is selected. Adding text opens it at the words, and double-clicking any piece opens its controls.
- **Canvas area.** The editing area takes the board's own proportions at the available width, so a larger board gets a larger canvas. Phones keep it within the screen.

## Visions: Vision Boards and Books

Implemented on `feat/visions-books`. Staging acceptance is pending.

The feature is called **Visions** in the product (the Envision tab). Routes, tables and ids keep their `vision-boards` / `vision_boards` names, and existing boards are unchanged.

**Model.** One table, one editor. Migration `20261221000100_visions_books.sql`:
- `format` is `board` (the default) or `book`.
- A Book stores its **cover** (`cover` jsonb: preset, title, subtitle, caption, palette, title font, optional image and pattern) and **up to 8 content pages** (`pages` jsonb). Each page has an id, title, background and elements, in the same element model as boards.
- Pages share the book's size (`size`/`canvas_*`). A Book's `elements` stays empty, so nothing is stored twice.
- The `asset_paths` storage guard also covers `pages` and `cover`.
- Constraints: a book always has pages, a board never does, and there are 1–8 pages.

**Editing a Book** uses the same editor.
- **The current page.** The page being edited is mirrored into the editor's board. Every change syncs back into `pages`, and undo snapshots include the page order and which page is open.
- **Pages menu** (toolbar). The cover and the numbered pages, each with an editable title and a thumbnail. Pages can be opened, moved up or down, dragged to reorder, duplicated, or deleted with a confirmation. Add page is disabled at 8/8.
- **Cover.** Choosing Cover shows the cover on the canvas and switches the side panel to cover controls: style, palette, title, subtitle, caption, title font, image and pattern.
- **Spread.** On wide screens a Spread toggle shows the facing page (1–2, 3–4…) beside the editable one, with a soft spine. Clicking the facing page opens it.
- **Page size.** Changing the size shifts every page's pieces together, so nothing moves on its page.

**Covers.** There are five presets (Classic, Celestial, Romantic, Editorial, Whimsical), each with its own composition, type hierarchy, decoration and 3–4 palettes. They are generated in `lib/vision-boards/covers.ts` as locked board elements, so the library, editor, reader and PDF all draw the same cover.

**Reader** (Read):
- the cover first, then spreads on wide screens or single pages on narrow ones;
- a gentle page-turn (none with reduced motion or Quiet magic);
- Contents to jump to any named page;
- arrow keys, and swipe on touch.

**Library:**
- a "Show" filter (All Visions / Vision Boards / Books);
- Books appear as small physical books, with a spine, page edges and a shadow;
- "New Vision" asks Board or Book, and for a Book, the cover and page shape.

**Conversions:**
- Board → Book: the board becomes page 1, in place and reversible.
- One-page Book → Board: in place.
- Multi-page Book → "Combine pages into one board": always a **new copy**. Pages are laid out side by side, wrapping into rows, with each background as an editable paper shape. Every piece keeps its position on its page. If the result would exceed the largest board (8000×8000) or 300 pieces, it explains instead and changes nothing.

**Writing:**
- The Text menu adds a Heading (H1), Subheading (H2), Section title (H3), Paragraph or plain Words. Each is ordinary text with every control (`role` on the element). Text can be up to 4000 characters.
- Paragraphs wrap to their box; resizing changes the column width, never the type size.
- Double-click any text, or add new text, to type right on the canvas: a text box laid exactly over the words. Pressing outside or Escape finishes.

**Export:**
- Images: the current page or the cover.
- **Whole book (PDF):** the cover and every page in order, rendered at export resolution with images and fonts loaded first. It uses a tiny built-in PDF writer (`lib/vision-boards/pdf.ts`): one full-page JPEG per page, no dependency, no service.

**Also in this round:**
- **Right-click menu** on pieces: Style…, Edit words, copy, cut, paste, duplicate, copy and paste style, front and back, group, lock, delete. On empty space: paste, select all, and board size and background.
- **One Paste on a Mac.** Safari confirms every script clipboard read with its own Paste bubble. Mac uses ⌘V (or right-click → Paste in browsers that allow it); the Paste button shows on touch devices only.
- **Muse Marks** show in the Library again.
- **Washi tape:** 12 new tapes (girly, celestial and whimsical).
- **Journal & Stationery fills:** blank, wide-ruled, college-ruled, dot grid, square grid, graph, notebook, parchment, soft stationery and decorative writing paper.

## Tests

- `tests/vision-boards.test.mjs` (model, crop math, layers, history, migration, integrations) and `tests/vision-studio.test.mjs` and `tests/visions-books.test.mjs` (Books: pages, limit, conversions, combine, covers, PDF, storage) (#187: back-compat parsing, paints, new kinds, storage paths, shapes, canvas expansion, groups/align/distribute/snapping, copy and style paste, library registry, SVG sanitizing, fonts).
- `npm run test:vision-boards:db` (local Supabase: RLS, revisions, exact reopen, derived paths, own-folder rule, PNG, shared-file guard, period rules).
- `npm run test:vision-boards:ui` (local browser journey, 36 checks: desktop, iPhone with the cutout guide, dark theme, and the #187 studio: a patterned scalloped card with a gradient border, then board space added on the left without moving anything). Headless Chrome can't write to the clipboard, so the Paste button needs a check on a real iPhone.
- `scripts/verify-hosted-vision-boards.sql` (read-only, 12 checks) before and after the staging/production push.
