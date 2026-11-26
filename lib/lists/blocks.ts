/**
 * Mindspace Spaces (Lists evolved): a space's sections hold content blocks. A block is one of a few generic kinds;
 * information cards are ONE reusable record shape (labelled, typed fields) with presets that only choose starting
 * fields, an icon and how the card reads (a route, a stay, a place…). Nothing here is a travel system: no live data.
 */
import type { JSONContent } from "@tiptap/react";

export const blockKinds = ["checklist", "note", "images", "link", "heading", "card"] as const;
export type BlockKind = typeof blockKinds[number];
export type BlockWidth = "full" | "half";

/** A private image in the shared board bucket (`<owner>/<block or space id>/<hash>.<ext>`). */
export type SpaceImage = { id: string; path: string; thumbnailPath: string; width: number; height: number; mime: string; caption?: string; alpha?: boolean };
export type CardFieldType = "text" | "longtext" | "date" | "time" | "number" | "money" | "url" | "choice";
export type CardField = { id: string; label: string; type: CardFieldType; value: string; options?: string[] };
export type CardShape = "route" | "stay" | "place" | "item" | "measure" | "event" | "info";
export type CardPreset = "flight" | "transit" | "stay" | "place" | "reservation" | "shopping" | "gift" | "measurement" | "info";

export type ChecklistData = { title?: string };
export type NoteData = { title?: string; doc?: JSONContent; text?: string };
export type ImagesData = { title?: string; images: SpaceImage[] };
export type LinkData = { url: string; title?: string; note?: string; image?: SpaceImage };
export type HeadingData = { text: string; style: "title" | "text" | "divider" };
export type CardData = { preset: CardPreset; title: string; fields: CardField[]; image?: SpaceImage };
export type BlockData = ChecklistData | NoteData | ImagesData | LinkData | HeadingData | CardData;

export type ListBlock = {
  id: string; listId: string; sectionId: string | null; kind: BlockKind; position: number; width: BlockWidth; data: BlockData;
  createdAt: string; updatedAt: string;
  /** A checklist shown for older items that were written before blocks existed; it becomes real when arranged. */
  virtual?: boolean;
};
export type SpaceCover = { image: SpaceImage; /** Vertical framing, 0 (top) to 100 (bottom). */ focus: number };

export const BLOCK_LIMITS = { noteJson: 200000, fieldValue: 1000, longValue: 4000, fieldLabel: 40, fields: 24, images: 40, caption: 300, url: 2048, title: 200, heading: 500 } as const;

type PresetField = { id: string; label: string; type: CardFieldType; placeholder?: string; options?: string[] };
export type PresetDef = { id: CardPreset; label: string; add: string; icon: string; tone: number; shape: CardShape; titleLabel: string; titlePlaceholder: string; fields: PresetField[]; width: BlockWidth; detail: string };

/** Card presets: starting fields only. Every card can rename, remove or add fields afterwards. */
export const cardPresets: PresetDef[] = [
  { id: "flight", label: "Flight", add: "Flight", icon: "plane", tone: 2, shape: "route", width: "half", detail: "Route, times, airline, confirmation", titleLabel: "Label", titlePlaceholder: "Whose flight, or a nickname", fields: [
    { id: "from", label: "From", type: "text", placeholder: "LAX" }, { id: "fromPlace", label: "From city", type: "text", placeholder: "Los Angeles" },
    { id: "to", label: "To", type: "text", placeholder: "CDG" }, { id: "toPlace", label: "To city", type: "text", placeholder: "Paris" },
    { id: "date", label: "Date", type: "date" }, { id: "departs", label: "Departs", type: "time" }, { id: "arrives", label: "Arrives", type: "time" },
    { id: "carrier", label: "Airline & flight", type: "text", placeholder: "Delta DL 8725" }, { id: "confirmation", label: "Confirmation", type: "text" },
    { id: "seat", label: "Seat", type: "text" }, { id: "cost", label: "Cost", type: "money" }, { id: "notes", label: "Notes", type: "longtext" }] },
  { id: "transit", label: "Train, bus or car", add: "Train / bus", icon: "compass", tone: 5, shape: "route", width: "half", detail: "Any ride from A to B", titleLabel: "Label", titlePlaceholder: "Eurostar, the night bus…", fields: [
    { id: "from", label: "From", type: "text", placeholder: "London" }, { id: "fromPlace", label: "From detail", type: "text", placeholder: "Victoria Coach Station" },
    { id: "to", label: "To", type: "text", placeholder: "Cardiff" }, { id: "toPlace", label: "To detail", type: "text", placeholder: "Central Station" },
    { id: "date", label: "Date", type: "date" }, { id: "departs", label: "Departs", type: "time" }, { id: "arrives", label: "Arrives", type: "time" },
    { id: "carrier", label: "Carrier", type: "text", placeholder: "National Express" }, { id: "confirmation", label: "Confirmation", type: "text" },
    { id: "cost", label: "Cost", type: "money" }, { id: "notes", label: "Notes", type: "longtext" }] },
  { id: "stay", label: "Stay", add: "Stay", icon: "key", tone: 4, shape: "stay", width: "half", detail: "Hotel, hostel, rental, a friend's sofa", titleLabel: "Name", titlePlaceholder: "The Z Hotel Bath", fields: [
    { id: "address", label: "Address", type: "text" }, { id: "checkin", label: "Check-in", type: "date" }, { id: "checkout", label: "Check-out", type: "date" },
    { id: "confirmation", label: "Confirmation", type: "text" }, { id: "cost", label: "Cost", type: "money" }, { id: "link", label: "Link", type: "url" }, { id: "notes", label: "Notes", type: "longtext" }] },
  { id: "place", label: "Place", add: "Place", icon: "map-pin", tone: 1, shape: "place", width: "half", detail: "Somewhere to see, eat or wander", titleLabel: "Name", titlePlaceholder: "Sky Garden", fields: [
    { id: "about", label: "About", type: "longtext", placeholder: "Why it's on the list" }, { id: "address", label: "Address", type: "text" },
    { id: "when", label: "When", type: "date" }, { id: "link", label: "Link", type: "url" }] },
  { id: "reservation", label: "Reservation", add: "Reservation", icon: "calendar", tone: 3, shape: "event", width: "half", detail: "A table, tickets, a tour, an appointment", titleLabel: "What", titlePlaceholder: "Dinner at Dishoom", fields: [
    { id: "date", label: "Date", type: "date" }, { id: "time", label: "Time", type: "time" }, { id: "address", label: "Where", type: "text" },
    { id: "confirmation", label: "Confirmation", type: "text" }, { id: "cost", label: "Cost", type: "money" }, { id: "link", label: "Link", type: "url" }, { id: "notes", label: "Notes", type: "longtext" }] },
  { id: "shopping", label: "Shopping item", add: "Shopping item", icon: "shopping", tone: 6, shape: "item", width: "half", detail: "A product to buy, with price and status", titleLabel: "Product", titlePlaceholder: "Rattan floor lamp", fields: [
    { id: "price", label: "Price", type: "money" }, { id: "status", label: "Status", type: "choice", options: ["Idea", "To buy", "Ordered", "Bought"] },
    { id: "store", label: "Store", type: "text" }, { id: "link", label: "Link", type: "url" }, { id: "notes", label: "Notes", type: "longtext" }] },
  { id: "gift", label: "Gift idea", add: "Gift idea", icon: "gift", tone: 1, shape: "item", width: "half", detail: "Who it's for, price and status", titleLabel: "Gift", titlePlaceholder: "Silk pillowcase", fields: [
    { id: "for", label: "For", type: "text" }, { id: "price", label: "Price", type: "money" }, { id: "status", label: "Status", type: "choice", options: ["Idea", "Bought", "Wrapped", "Given"] },
    { id: "link", label: "Link", type: "url" }, { id: "notes", label: "Notes", type: "longtext" }] },
  { id: "measurement", label: "Measurement", add: "Measurement", icon: "columns", tone: 7, shape: "measure", width: "half", detail: "Room, wall or furniture sizes", titleLabel: "What", titlePlaceholder: "Living room window", fields: [
    { id: "width", label: "Width", type: "text", placeholder: "84 in" }, { id: "height", label: "Height", type: "text", placeholder: "60 in" },
    { id: "depth", label: "Depth", type: "text" }, { id: "notes", label: "Notes", type: "longtext" }] },
  { id: "info", label: "Info card", add: "Info card", icon: "info", tone: 8, shape: "info", width: "half", detail: "Any labelled details you want at a glance", titleLabel: "Title", titlePlaceholder: "Wi-Fi & door codes", fields: [
    { id: "detail", label: "Detail", type: "text" }, { id: "notes", label: "Notes", type: "longtext" }] },
];
export const presetOf = (id: string | undefined) => cardPresets.find((p) => p.id === id) ?? cardPresets[cardPresets.length - 1];

export function newCard(preset: CardPreset, title = ""): CardData {
  const p = presetOf(preset);
  return { preset: p.id, title, fields: p.fields.map((f) => ({ id: f.id, label: f.label, type: f.type, value: "", ...(f.options ? { options: f.options } : {}) })) };
}
export const placeholderFor = (preset: CardPreset, fieldId: string) => presetOf(preset).fields.find((f) => f.id === fieldId)?.placeholder;
export const fieldValue = (card: CardData, id: string) => card.fields.find((f) => f.id === id)?.value?.trim() ?? "";
/** A card that has nothing written in it yet reads as an invitation to fill it in. */
export const cardIsEmpty = (card: CardData) => !card.title.trim() && card.fields.every((f) => !f.value.trim()) && !card.image;

export function blockFromRow(r: Record<string, unknown>): ListBlock {
  const kind = (blockKinds as readonly string[]).includes(String(r.kind)) ? r.kind as BlockKind : "note";
  return { id: String(r.id), listId: String(r.list_id), sectionId: (r.section_id as string) ?? null, kind, position: Number(r.position ?? 0), width: r.width === "half" ? "half" : "full",
    data: normalizeData(kind, r.data), createdAt: String(r.created_at ?? ""), updatedAt: String(r.updated_at ?? "") };
}
/** Defensive: whatever is stored, the screen gets a well-formed payload for the kind. */
export function normalizeData(kind: BlockKind, raw: unknown): BlockData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";
  const img = (v: unknown): SpaceImage | undefined => { const o = v as SpaceImage; return o && typeof o === "object" && typeof o.path === "string" && typeof o.thumbnailPath === "string" ? o : undefined; };
  switch (kind) {
    case "checklist": return { title: str(d.title, BLOCK_LIMITS.title) || undefined };
    case "note": return { title: str(d.title, BLOCK_LIMITS.title) || undefined, doc: d.doc && typeof d.doc === "object" && (d.doc as JSONContent).type === "doc" ? d.doc as JSONContent : undefined, text: str(d.text, 20000) };
    case "images": return { title: str(d.title, BLOCK_LIMITS.title) || undefined, images: Array.isArray(d.images) ? d.images.map(img).filter((x): x is SpaceImage => !!x).slice(0, BLOCK_LIMITS.images) : [] };
    case "link": return { url: safeHref(str(d.url, BLOCK_LIMITS.url)) ?? "", title: str(d.title, BLOCK_LIMITS.title) || undefined, note: str(d.note, BLOCK_LIMITS.longValue) || undefined, image: img(d.image) };
    case "heading": return { text: str(d.text, BLOCK_LIMITS.heading), style: d.style === "text" || d.style === "divider" ? d.style : "title" };
    case "card": {
      const preset = presetOf(typeof d.preset === "string" ? d.preset : "info").id;
      const fields = Array.isArray(d.fields) ? (d.fields as CardField[]).filter((f) => f && typeof f.id === "string").slice(0, BLOCK_LIMITS.fields).map((f) => ({ id: f.id.slice(0, 40), label: str(f.label, BLOCK_LIMITS.fieldLabel) || "Detail",
        type: (["text", "longtext", "date", "time", "number", "money", "url", "choice"].includes(f.type) ? f.type : "text") as CardFieldType, value: str(f.value, f.type === "longtext" ? BLOCK_LIMITS.longValue : BLOCK_LIMITS.fieldValue),
        ...(Array.isArray(f.options) ? { options: f.options.filter((o) => typeof o === "string").slice(0, 12).map((o) => o.slice(0, 40)) } : {}) })) : newCard(preset).fields;
      return { preset, title: str(d.title, BLOCK_LIMITS.title), fields, image: img(d.image) };
    }
  }
}

/** Only web and mail links ever become clickable; anything else is shown as plain text. */
export function safeHref(raw: string | undefined | null): string | null {
  const v = (raw ?? "").trim(); if (!v) return null;
  try { const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`); return ["http:", "https:"].includes(u.protocol) && u.hostname.includes(".") ? u.href : null; } catch { return null; }
}
export const siteOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
/** A friendly name for well-known sites, so a saved Instagram or Pinterest link reads as such. */
export function siteName(url: string) {
  const host = siteOf(url), known: Record<string, string> = { "instagram.com": "Instagram", "pinterest.com": "Pinterest", "pin.it": "Pinterest", "tiktok.com": "TikTok", "youtube.com": "YouTube", "youtu.be": "YouTube",
    "airbnb.com": "Airbnb", "booking.com": "Booking.com", "amazon.com": "Amazon", "etsy.com": "Etsy", "google.com": "Google", "maps.google.com": "Google Maps", "tripadvisor.com": "Tripadvisor", "opentable.com": "OpenTable", "substack.com": "Substack" };
  const hit = Object.keys(known).find((k) => host === k || host.endsWith(`.${k}`));
  return hit ? known[hit] : host;
}

export function money(value: string) {
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!value.trim() || !Number.isFinite(n)) return value;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
}
export const moneyNumber = (value: string) => { const n = Number(String(value).replace(/[^0-9.-]/g, "")); return value.trim() && Number.isFinite(n) ? n : 0; };
/** Every amount written on the space's cards (a sum to glance at; Money keeps the real records). */
export function cardCosts(blocks: ListBlock[]) {
  let total = 0, count = 0;
  for (const b of blocks) if (b.kind === "card") for (const f of (b.data as CardData).fields) if (f.type === "money" && f.value.trim()) { total += moneyNumber(f.value); count++; }
  return { total, count };
}

/** "3:15 PM"; "+1" when an arrival is earlier than its departure (it lands the next day). */
export function clock(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t); if (!m) return t;
  const h = Number(m[1]); return `${(h % 12) || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
export const nextDay = (departs: string, arrives: string) => !!departs && !!arrives && arrives < departs;
export const nightsBetween = (a: string, b: string) => a && b ? Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000) : 0;
export const dayLabel = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)) : d;

/**
 * Grid placement inside a section: full blocks take the row; half blocks pair up. A half block left without a partner
 * (an odd one at the end of a run) fills its row, so the grid never leaves a hole.
 */
export function placeBlocks<T extends { width: BlockWidth }>(blocks: T[]): (T & { span: 1 | 2 })[] {
  const out: (T & { span: 1 | 2 })[] = [];
  let run: T[] = [];
  const flush = () => { run.forEach((b, i) => out.push({ ...b, span: run.length % 2 === 1 && i === run.length - 1 ? 2 : 1 })); run = []; };
  for (const b of blocks) { if (b.width === "half") run.push(b); else { flush(); out.push({ ...b, span: 2 }); } }
  flush();
  return out;
}

/** The glyph a section is known by in the section tiles: what it mostly holds. */
export function sectionGlyph(blocks: ListBlock[], itemCount: number): string {
  const tally = new Map<string, number>();
  const bump = (k: string, n = 1) => tally.set(k, (tally.get(k) ?? 0) + n);
  for (const b of blocks) {
    if (b.kind === "card") bump(presetOf((b.data as CardData).preset).icon, 2);
    else if (b.kind === "note") bump("quill"); else if (b.kind === "images") bump("photo", 2); else if (b.kind === "link") bump("link");
  }
  if (itemCount) bump("checklist", Math.min(3, itemCount));
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "sparkle";
}

/** Plain words of a note (for search and previews). */
export function docText(doc: JSONContent | undefined): string {
  if (!doc) return "";
  const out: string[] = [];
  const walk = (n: JSONContent) => { if (n.text) out.push(n.text); n.content?.forEach(walk); if (n.type && /paragraph|heading|listItem|taskItem|tableCell|tableHeader/.test(n.type)) out.push("\n"); };
  walk(doc);
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}

/** Images referenced anywhere (blocks and covers), so a file is only removed once nothing uses it. */
export function imagesOfBlock(b: ListBlock): SpaceImage[] {
  const d = b.data as Partial<ImagesData & LinkData & CardData>;
  return b.kind === "images" ? d.images ?? [] : (b.kind === "link" || b.kind === "card") && d.image ? [d.image] : [];
}
