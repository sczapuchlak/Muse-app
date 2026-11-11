/**
 * One cohesive feelings library (#130). The shared vocabulary and a person's own feelings are the same kind of thing:
 * a name in a quadrant (pleasantness × energy). This module holds the pure rules: how the two choices become a quadrant,
 * how names are matched without duplicates, and how a recorded entry resolves a feeling.
 *
 * A recorded check-in keeps a snapshot of each feeling it holds (name + the quadrant chosen at the time). History is read
 * from that snapshot, so changing or deleting a custom feeling, or interpreting a word differently later, never rewrites
 * an entry. Entries recorded before this existed have no snapshot and fall back to the shared vocabulary.
 */
import type { Emotion, EmotionQuadrant } from "./models";

export type FeelingSnapshot = { id: string; name: string; quadrant: EmotionQuadrant; emoji?: string; custom?: boolean };
export type CustomFeeling = { id: string; name: string; quadrant: EmotionQuadrant; emoji: string | null; favorite: boolean };

export const quadrantKeys: EmotionQuadrant[] = ["red", "yellow", "blue", "green"];
export const MAX_FEELING_NAME = 40;
export const MAX_CUSTOM_FEELINGS = 100;
export const quadrantEmoji: Record<EmotionQuadrant, string> = { red: "😖", yellow: "😊", blue: "😔", green: "😌" };

// ---------- Pleasantness × energy → quadrant (the Mood Meter's own layout) ----------
export const quadrantFor = (pleasant: boolean, highEnergy: boolean): EmotionQuadrant => highEnergy ? (pleasant ? "yellow" : "red") : (pleasant ? "green" : "blue");
export const traitsOf = (quadrant: EmotionQuadrant) => ({ pleasant: quadrant === "yellow" || quadrant === "green", highEnergy: quadrant === "yellow" || quadrant === "red" });
export const isQuadrant = (v: unknown): v is EmotionQuadrant => quadrantKeys.includes(v as EmotionQuadrant);

// ---------- Ids ----------
export const CUSTOM_PREFIX = "custom:";
export const customId = (uuid: string) => `${CUSTOM_PREFIX}${uuid}`;
export const isCustomId = (id: string) => id.startsWith(CUSTOM_PREFIX);
export const customUuid = (id: string) => id.slice(CUSTOM_PREFIX.length);

// ---------- Names ----------
/** What the person typed, tidied: single spaces, first letter capitalized, bounded. */
export function cleanFeelingName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_FEELING_NAME).trim();
  return name ? name[0].toLocaleUpperCase("en-US") + name.slice(1) : "";
}
/** Case-, accent- and punctuation-insensitive form used to find duplicates. */
export function normalizeFeelingName(raw: string): string {
  return raw.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
export function findFeelingByName<T extends { name: string }>(name: string, list: readonly T[], except?: (item: T) => boolean): T | undefined {
  const key = normalizeFeelingName(name);
  return key ? list.find((item) => normalizeFeelingName(item.name) === key && !except?.(item)) : undefined;
}

// ---------- Custom feelings join the same list ----------
export function customAsEmotion(c: CustomFeeling): Emotion {
  return { id: customId(c.id), name: c.name, emoji: c.emoji || quadrantEmoji[c.quadrant], quadrant: c.quadrant };
}
/** The one searchable library: shared vocabulary and personal feelings together, in name order. */
export function unifiedFeelings(catalog: readonly Emotion[], custom: readonly CustomFeeling[]): Emotion[] {
  return [...catalog, ...custom.map(customAsEmotion)].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

// ---------- Resolving a recorded feeling ----------
type Recorded = { emotionIds: string[]; feelings?: FeelingSnapshot[] };
/** A feeling as it was recorded in an entry: the snapshot wins; older entries use the shared vocabulary. */
export function recordedFeeling(id: string, feelings: readonly FeelingSnapshot[] | undefined, catalog: readonly Emotion[]): Emotion | null {
  const snap = feelings?.find((f) => f.id === id), base = catalog.find((e) => e.id === id);
  if (snap) return { id, name: snap.name, quadrant: snap.quadrant, emoji: snap.emoji || base?.emoji || quadrantEmoji[snap.quadrant], definition: base?.definition, ambiguous: base?.ambiguous };
  return base ?? null;
}
export const recordedFeelings = (record: Recorded, catalog: readonly Emotion[]): Emotion[] => record.emotionIds.flatMap((id) => recordedFeeling(id, record.feelings, catalog) ?? []);
export const snapshotOf = (e: Emotion, quadrant: EmotionQuadrant = e.quadrant): FeelingSnapshot => ({ id: e.id, name: e.name, quadrant, ...(isCustomId(e.id) ? { custom: true } : {}), emoji: e.emoji });
/** True when the person chose a different quadrant than the vocabulary's default for this word. */
export const isPersonalInterpretation = (snap: FeelingSnapshot | undefined, catalog: readonly Emotion[]) => { const base = snap && catalog.find((e) => e.id === snap.id); return !!base && base.quadrant !== snap!.quadrant; };

// ---------- Selecting into an entry ----------
export type FeelingSelection = { emotionIds: string[]; feelings: FeelingSnapshot[] };
/** Adds a feeling (with the quadrant the person chose, or its default), or sets that quadrant if it is already there. */
export function selectFeeling(current: Recorded, emotion: Emotion, quadrant: EmotionQuadrant = emotion.quadrant, catalog: readonly Emotion[] = []): FeelingSelection {
  const have = current.emotionIds.includes(emotion.id);
  const ids = have ? current.emotionIds : [...current.emotionIds, emotion.id];
  // Earlier entries without snapshots are frozen as they currently read, so this edit can't change how they look.
  const frozen = ids.flatMap((id) => { const s = current.feelings?.find((f) => f.id === id); if (s) return [s]; const e = id === emotion.id ? emotion : catalog.find((x) => x.id === id); return e ? [snapshotOf(e)] : []; });
  return { emotionIds: ids, feelings: frozen.map((s) => s.id === emotion.id ? snapshotOf(emotion, quadrant) : s) };
}
export function deselectFeeling(current: Recorded, id: string): FeelingSelection {
  return { emotionIds: current.emotionIds.filter((x) => x !== id), feelings: (current.feelings ?? []).filter((f) => f.id !== id) };
}

// ---------- Snapshots from the database ----------
export function parseFeelings(v: unknown): FeelingSnapshot[] {
  const seen = new Set<string>(), out: FeelingSnapshot[] = [];
  for (const raw of Array.isArray(v) ? v : []) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id || o.id.length > 64 || seen.has(o.id) || typeof o.name !== "string" || !o.name.trim() || !isQuadrant(o.quadrant)) continue;
    seen.add(o.id);
    out.push({ id: o.id, name: o.name.slice(0, MAX_FEELING_NAME), quadrant: o.quadrant, ...(typeof o.emoji === "string" && o.emoji ? { emoji: o.emoji.slice(0, 16) } : {}), ...(o.custom === true || isCustomId(o.id) ? { custom: true } : {}) });
  }
  return out;
}
/** Which ids go to the shared-vocabulary join table (custom feelings live only in the snapshot). */
export const catalogIdsOf = (ids: readonly string[]) => ids.filter((id) => !isCustomId(id));
/** The ids an entry reads back as: its shared-vocabulary joins plus any custom feelings in its snapshot. */
export function readBackIds(catalogIds: readonly string[], feelings: readonly FeelingSnapshot[]): string[] {
  return [...new Set([...catalogIds, ...feelings.filter((f) => f.custom || isCustomId(f.id)).map((f) => f.id)])];
}
