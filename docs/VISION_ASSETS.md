# Vision Boards: adding or replacing library assets

Muse's built-in creative library holds patterns, textures, paper, washi tape, stickers, labels, ribbons, frames and illustrations. It is built from source files in `assets-src/vision`. You don't change any editor code to add a collection: drop the files in, run one command and commit.

The person's own uploads are separate. They stay in private storage, belong to one board, and appear under **Your uploads** in the pattern picker. Nothing in this guide touches them.

## Quick start

```bash
# 1. Copy a folder of files in (as patterns, in a category named after the folder)
npm run vision:assets -- --from ~/Downloads/Gingham --kind pattern --category gingham

# …or place files by hand under assets-src/vision/<kind>/<category>/, then:
npm run vision:assets

# 2. Read docs/VISION_ASSETS_REVIEW.md, fix anything it flags, and run again if needed
# 3. Commit assets-src/vision, public/vision-assets and lib/vision-boards/library.generated.ts together
```

## Folder layout

```
assets-src/vision/<kind>/<category>/<name>.(svg|png|jpg|jpeg|webp)
assets-src/vision/<kind>/<category>/<name>.json      (optional sidecar)
```

- **kind**: one of `pattern`, `texture`, `paper`, `sticker`, `washi`, `label`, `ribbon`, `frame`, `illustration`.
  - Patterns and textures are **fills**: they paint shapes, photo borders, die-cut edges, doodles and the board background.
  - Everything else is a **piece**: it's placed on the board as its own object.
- **category**: any lowercase name. It becomes a filter chip in the browser, for example `gingham` or `celestial`.
- **name**: the file name. It becomes the item's display name ("pink-gingham" shows as "Pink Gingham") unless the sidecar gives a `label`.

Each item's **stable id** is `kind/category/name`, for example `pattern/gingham/pink-gingham`. Boards store this id, never a URL.

## Sidecar options

```json
{ "label": "Pink gingham", "tileable": false, "tags": ["pink", "picnic", "check"] }
```

| Field | What it does |
| --- | --- |
| `label` | The name shown in the library (defaults to the file name in title case). |
| `tileable` | Fills only. `true` repeats the image edge to edge; `false` covers the shape once. SVGs default to `true`. Raster patterns are checked automatically by comparing opposite edges. Set this field when the guess is wrong. |
| `tags` | Extra search words (up to 12). |

## What the importer does

The importer runs offline and fetches nothing from the internet. For each file it:

1. **Sanitizes SVGs.** It removes scripts, event handlers, `foreignObject`, iframes and embeds, external links, external `url()` references and `@import`. Internal `#id` references and embedded raster data are kept. SVGs stay vector.
2. **Optimizes rasters.** It converts them to WebP (long side at most 2400px, EXIF rotation applied) and keeps transparency.
3. **Makes a thumbnail.** Each item gets a 240px WebP thumbnail for the browser.
4. **Detects properties.** It records size, transparency (`alpha`, used for die-cut edges) and, for fills, whether the image tiles.
5. **Writes the outputs:**
   - `public/vision-assets/<kind>/<category>/…`, the served files. This folder is rebuilt from scratch on every run.
   - `lib/vision-boards/library.generated.ts`, the registry. Don't edit it by hand.
   - `docs/VISION_ASSETS_REVIEW.md`, anything that needs a human look: resized files, SVGs that lost unsafe parts, patterns that won't repeat, wrong folders and duplicate names.

## Replacing an asset

Keep the **same kind, category and file name**, replace the file, and run `npm run vision:assets`. The id doesn't change, so every board that uses the item shows the new art the next time it opens. Pieces keep their size on the board, so if the new art has different proportions, check a board that uses it.

## Renaming or removing an asset

Renaming or removing changes or drops an id that boards may already use. The board data is left alone, so nothing is lost:

- **A removed fill** shows its base color, or a soft lilac placeholder when it has none.
- **A removed piece** shows a labelled “Piece unavailable” placeholder until it's restored.

To retire an asset safely, keep it in place and leave it out of new collections. To rename one, change its `label` in a sidecar instead of the file name.

## Guidelines for good assets

- **Licensing:** use only art that Muse owns or is licensed to ship. The current set is 2–5 original test assets per category, made for Muse.
- **Patterns:** a square tile of 300–1200px that repeats seamlessly. SVG is best for flat, graphic patterns.
- **Stickers, illustrations and frames:** transparent PNG or SVG, trimmed close to the art, so die-cut outlines follow the silhouette. Frames need a transparent window.
- **Washi and ribbons:** wide, transparent-edged strips. Slightly ragged ends look more real.
- **Size:** keep each file under about 1 MB after import. iPhone performance depends on it.

## Checks

`npm test` (tests/vision-studio.test.mjs) checks the following:

- every registry item has files on disk and a valid stable id;
- each kind has between 2 and 6 items;
- the SVG sanitizer strips executable and external content.

Update the count check when a real collection replaces the test set.
