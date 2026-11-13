#!/usr/bin/env node
/**
 * Vision Boards 2.0 (#187): the developer-side importer for Muse's built-in creative library.
 *
 *   npm run vision:assets                         rebuild public/vision-assets + the registry from assets-src/vision
 *   npm run vision:assets -- --from ~/Patterns    first copy a folder in (as patterns), then rebuild
 *   npm run vision:assets -- --from ~/Washi --kind washi --category gold
 *
 * Source layout: assets-src/vision/<kind>/<category>/<name>.(svg|png|jpg|jpeg|webp), plus an optional <name>.json
 * sidecar: { "label": "Pink gingham", "tileable": false, "tags": ["pink"] }.
 *
 * What it does, per file: sanitises SVG (no scripts, event handlers, foreignObject or external references) and keeps
 * it vector; converts rasters to WebP (max 2400px long side, alpha preserved); writes a 240px WebP thumbnail; detects
 * size and transparency; guesses whether a raster pattern tiles seamlessly by comparing opposite edges; and writes
 * lib/vision-boards/library.generated.ts with stable ids (`kind/category/name`). Anything needing a human look goes into
 * docs/VISION_ASSETS_REVIEW.md. Nothing is fetched from the internet.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join, extname, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(root, "assets-src/vision"), OUT = join(root, "public/vision-assets");
export const KINDS = ["pattern", "texture", "paper", "sticker", "washi", "label", "ribbon", "frame", "illustration"];
const EXT = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp"]);
const args = process.argv.slice(2), flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
export const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "asset";
const titleCase = (s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Removes anything executable or external from an SVG. Returns null when nothing safe remains. */
export function sanitizeSvg(text) {
  let s = String(text).replace(/<\?xml[^>]*>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|foreignObject|iframe|object|embed|audio|video)[\s\S]*?<\/\1\s*>/gi, "").replace(/<(script|foreignObject|iframe|object|embed)[^>]*\/>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Only same-document references (#id) and embedded raster data are allowed in href/xlink:href.
  s = s.replace(/\s(?:xlink:)?href\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, _q, a, b) => { const v = (a ?? b ?? "").trim(); return /^#|^data:image\/(png|jpe?g|webp|gif);/i.test(v) ? m : ""; });
  s = s.replace(/url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi, "none").replace(/@import[^;]*;/gi, "").replace(/javascript:/gi, "");
  return /<svg[\s>]/i.test(s) ? s.trim() : null;
}
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
}
/** Mean absolute difference between opposite edges (0 = perfectly continuous). */
async function edgeMismatch(input) {
  const { data, info } = await sharp(input).resize(128, 128, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y, c) => data[(y * info.width + x) * info.channels + c];
  let d = 0, n = 0;
  for (let i = 0; i < 128; i++) for (let c = 0; c < 3; c++) { d += Math.abs(px(0, i, c) - px(127, i, c)) + Math.abs(px(i, 0, c) - px(i, 127, c)); n += 2; }
  return d / n / 255;
}

function importFolder(from, kind = "pattern", category) {
  const files = walk(resolve(from)).filter((f) => EXT.has(extname(f).toLowerCase()));
  for (const f of files) {
    const cat = slug(category ?? (basename(dirname(f)) === basename(resolve(from)) ? "imported" : basename(dirname(f))));
    const dir = join(SRC, kind, cat); mkdirSync(dir, { recursive: true });
    copyFileSync(f, join(dir, slug(basename(f, extname(f))) + extname(f).toLowerCase()));
  }
  console.log(`Copied ${files.length} file(s) into assets-src/vision/${kind}/`);
}

async function build() {
  rmSync(OUT, { recursive: true, force: true });
  const entries = [], review = [], seen = new Set();
  for (const file of walk(SRC).sort()) {
    const ext = extname(file).toLowerCase();
    if (!EXT.has(ext)) continue;
    const rel = file.slice(SRC.length + 1).split(/[\\/]/);
    if (rel.length !== 3 || !KINDS.includes(rel[0])) { review.push(`- \`${rel.join("/")}\`: expected <kind>/<category>/<file> with kind one of ${KINDS.join(", ")}; skipped.`); continue; }
    const [kind, category] = [rel[0], slug(rel[1])], name = slug(basename(file, ext)), id = `${kind}/${category}/${name}`;
    if (seen.has(id)) { review.push(`- \`${id}\`: duplicate name in this category; kept the first.`); continue; }
    seen.add(id);
    const sidecarPath = file.slice(0, -ext.length) + ".json";
    const meta = existsSync(sidecarPath) ? JSON.parse(readFileSync(sidecarPath, "utf8")) : {};
    const dir = join(OUT, kind, category); mkdirSync(dir, { recursive: true });
    let format, w, h, alpha, input;
    try {
      if (ext === ".svg") {
        const clean = sanitizeSvg(readFileSync(file, "utf8"));
        if (!clean) { review.push(`- \`${id}\`: the SVG had no safe content left after sanitising; skipped.`); continue; }
        if (clean.length !== readFileSync(file, "utf8").trim().length) review.push(`- \`${id}\`: unsafe or external parts were removed from the SVG; check it still looks right.`);
        writeFileSync(join(dir, `${name}.svg`), clean);
        input = Buffer.from(clean); const m = await sharp(input).metadata();
        w = m.width; h = m.height; format = "svg";
        const stats = await sharp(input).ensureAlpha().stats();
        alpha = stats.channels[3] ? stats.channels[3].min < 250 : false;
      } else {
        input = file; const m = await sharp(file).metadata();
        const big = Math.max(m.width, m.height) > 2400;
        await sharp(file).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 }).toFile(join(dir, `${name}.webp`));
        const out = await sharp(join(dir, `${name}.webp`)).metadata();
        w = out.width; h = out.height; format = "webp";
        alpha = !!m.hasAlpha && (await sharp(file).stats()).channels[3]?.min < 250;
        if (big) review.push(`- \`${id}\`: resized from ${m.width}×${m.height} to ${w}×${h} (2400px long side).`);
      }
      await sharp(input).resize({ width: 240, height: 240, fit: "inside" }).webp({ quality: 80 }).toFile(join(dir, `${name}.thumb.webp`));
    } catch (err) { review.push(`- \`${id}\`: couldn't be processed (${err.message}); skipped.`); continue; }
    let tileable = meta.tileable;
    if (tileable === undefined && (kind === "pattern" || kind === "texture")) {
      tileable = format === "svg" ? true : (await edgeMismatch(input)) < 0.08;
      if (format !== "svg" && !tileable) review.push(`- \`${id}\`: the edges don't line up, so it fills without repeating (cover). Add \`{"tileable": true}\` in a sidecar if it does tile.`);
    }
    entries.push({ id, kind, category, name: meta.label ?? titleCase(name), src: `/vision-assets/${kind}/${category}/${name}.${format}`, thumb: `/vision-assets/${kind}/${category}/${name}.thumb.webp`, w, h, alpha: !!alpha, tileable: !!tileable, tags: Array.isArray(meta.tags) ? meta.tags.map(String).slice(0, 12) : [] });
  }
  const ts = `// Generated by scripts/vision-assets/import.mjs. Do not edit by hand: change assets-src/vision and run \`npm run vision:assets\`.\nimport type { LibraryItem } from "./library";\n\nexport const libraryItems: LibraryItem[] = ${JSON.stringify(entries, null, 1)};\n`;
  writeFileSync(join(root, "lib/vision-boards/library.generated.ts"), ts);
  const counts = KINDS.map((k) => `${k} ${entries.filter((e) => e.kind === k).length}`).join(" · ");
  writeFileSync(join(root, "docs/VISION_ASSETS_REVIEW.md"), `# Vision assets: review notes\n\nGenerated by \`npm run vision:assets\` on ${new Date().toISOString().slice(0, 10)}. ${entries.length} assets (${counts}).\n\n${review.length ? review.join("\n") : "Nothing needs review."}\n`);
  console.log(`Built ${entries.length} assets (${counts}). ${review.length} note(s) in docs/VISION_ASSETS_REVIEW.md.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const from = flag("from");
  if (from) importFolder(from, KINDS.includes(flag("kind")) ? flag("kind") : "pattern", flag("category"));
  await build();
}
