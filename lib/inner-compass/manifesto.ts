/**
 * The Personal Manifesto (#210): a living declaration the person writes. It is optional and authored entirely by
 * them: Muse offers their own discoveries as starting lines and never invents wording.
 *
 * A line drawn from a discovery keeps the discovery's id plus the words the person chose for the manifesto. Editing
 * or deleting the discovery later never rewrites the manifesto; the line can show "now …" or "no longer there".
 * Autosaved edits change the live manifesto; "Keep this version" stores a dated copy the person can return to.
 */
import type { Tables } from "@/lib/database.types";
import { isCategory, type Category } from "./categories";

export type ManifestoRef = { id: string; category: Category; label: string };
export type Block =
  | { id: string; kind: "heading"; text: string }
  | { id: string; kind: "line"; text: string; ref?: ManifestoRef };
export type Manifesto = { title: string; blocks: Block[]; revision: number; updatedAt: string | null };
export type ManifestoVersion = { id: string; title: string; blocks: Block[]; note: string; savedAt: string };

export const MAX_BLOCKS = 120;
const idOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{1,64}$/.test(v);
const str = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";

export function parseBlocks(v: unknown): Block[] {
  const seen = new Set<string>(), out: Block[] = [];
  for (const raw of Array.isArray(v) ? v : []) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (!idOk(o.id) || seen.has(o.id)) continue;
    seen.add(o.id);
    if (o.kind === "heading") out.push({ id: o.id, kind: "heading", text: str(o.text, 120) });
    else if (o.kind === "line") {
      const r = o.ref && typeof o.ref === "object" ? o.ref as Record<string, unknown> : null;
      const ref = r && idOk(r.id) && isCategory(r.category) ? { id: r.id, category: r.category, label: str(r.label, 300) || "Untitled" } : undefined;
      out.push({ id: o.id, kind: "line", text: str(o.text, 1200), ...(ref ? { ref } : {}) });
    }
    if (out.length >= MAX_BLOCKS) break;
  }
  return out;
}
export const emptyManifesto = (): Manifesto => ({ title: "My Manifesto", blocks: [], revision: 0, updatedAt: null });
export function manifestoFromRow(r: Tables<"inner_manifestos">): Manifesto {
  return { title: r.title, blocks: parseBlocks(r.blocks), revision: r.revision, updatedAt: r.updated_at };
}
export function versionFromRow(r: Tables<"inner_manifesto_versions">): ManifestoVersion {
  return { id: r.id, title: r.title, blocks: parseBlocks(r.blocks), note: r.note, savedAt: r.saved_at };
}
/** Blank lines are kept while editing but never saved as content. */
export const hasWords = (blocks: Block[]) => blocks.some((b) => b.text.trim());
export function move(blocks: Block[], id: string, by: -1 | 1): Block[] {
  const i = blocks.findIndex((b) => b.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= blocks.length) return blocks;
  const next = [...blocks];[next[i], next[j]] = [next[j], next[i]];
  return next;
}
/** The line a discovery offers as a starting point: the person's own statement, unchanged. */
export const lineFrom = (d: { id: string; category: Category; title: string }, id: string = crypto.randomUUID()): Block =>
  ({ id, kind: "line", text: d.title.trim(), ref: { id: d.id, category: d.category, label: d.title.trim() } });
/** Default section headings, offered (never inserted) when the person starts. */
export const suggestedHeadings = ["What I value", "Who I am becoming", "What I believe", "How I want to live", "What I protect"];
export const sameContent = (a: Pick<Manifesto, "title" | "blocks">, b: Pick<Manifesto, "title" | "blocks">) => a.title === b.title && JSON.stringify(a.blocks) === JSON.stringify(b.blocks);
