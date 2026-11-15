/**
 * Inner Compass, Phase 2 persistence (#211): Chapters, Experiences, Collections, their links and modules. Owner-only
 * tables, revision checks on every record a person edits, and links that are only ever rows in join tables (removing
 * one never deletes the Chapter, Experience or Collection it joins).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { chapterFromRow, chapterToRow, collectionFromRow, collectionToRow, experienceFromRow, experienceToRow, moduleFromRow, moduleToRow, type Chapter, type Collection, type Experience, type Module } from "./stories";

type Client = SupabaseClient<Database>;
export const STALE = "This changed on another device. Reload to see the latest before saving again.";
function must<T>(r: { data: T | null; error: unknown }): T { if (r.error) throw r.error; return r.data as T; }
export type Join = { a: string; b: string; position: number };
export type AreaLink = { areaId: string; chapterId: string | null; experienceId: string | null };
export type Stories = { chapters: Chapter[]; experiences: Experience[]; collections: Collection[]; chapterExperiences: Join[]; collectionExperiences: Join[]; modules: Module[]; areas: AreaLink[] };

export async function loadStories(client: Client, userId: string): Promise<Stories> {
  const [c, e, k, ce, ke, m, a] = await Promise.all([
    client.from("inner_chapters").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(2000),
    client.from("inner_experiences").select("*").eq("user_id", userId).order("happened_on", { ascending: false, nullsFirst: false }).limit(5000),
    client.from("inner_experience_collections").select("*").eq("user_id", userId).order("created_at").limit(500),
    client.from("inner_chapter_experiences").select("chapter_id,experience_id,position").eq("user_id", userId).limit(20000),
    client.from("inner_collection_experiences").select("collection_id,experience_id,position").eq("user_id", userId).limit(20000),
    client.from("inner_modules").select("*").eq("user_id", userId).order("position").limit(20000),
    client.from("inner_area_links").select("area_id,chapter_id,experience_id").eq("user_id", userId).limit(20000),
  ]);
  return {
    chapters: must(c).map(chapterFromRow), experiences: must(e).map(experienceFromRow), collections: must(k).map(collectionFromRow),
    chapterExperiences: must(ce).map((x) => ({ a: x.chapter_id, b: x.experience_id, position: x.position })),
    collectionExperiences: must(ke).map((x) => ({ a: x.collection_id, b: x.experience_id, position: x.position })),
    modules: must(m).map(moduleFromRow).filter((x): x is Module => !!x),
    areas: must(a).map((x) => ({ areaId: x.area_id, chapterId: x.chapter_id, experienceId: x.experience_id })),
  };
}

async function upsertRevisioned<R>(insert: () => PromiseLike<{ data: R | null; error: { code?: string } | null }>, update: () => PromiseLike<{ data: R | null; error: { code?: string } | null }>, isNew: boolean, duplicate = STALE): Promise<R> {
  const r = isNew ? await insert() : await update();
  if (r.error) { if (r.error.code === "23505") throw Error(duplicate); throw r.error; }
  if (!r.data) throw Error(STALE);
  return r.data;
}
export async function saveChapter(client: Client, userId: string, c: Chapter): Promise<Chapter> {
  const row = chapterToRow(c) as unknown as Database["public"]["Tables"]["inner_chapters"]["Update"];
  return chapterFromRow(await upsertRevisioned(
    () => client.from("inner_chapters").insert({ ...row, title: row.title!, id: c.id, user_id: userId }).select("*").single(),
    () => client.from("inner_chapters").update(row).eq("id", c.id).eq("user_id", userId).eq("revision", c.revision).select("*").maybeSingle(), c.revision === 0, "Only one Chapter can be your primary Chapter at a time."));
}
/** Makes one Chapter primary, clearing any other first (the database allows only one). */
export async function setPrimary(client: Client, userId: string, c: Chapter | null, all: Chapter[]): Promise<Chapter[]> {
  const out: Chapter[] = [];
  for (const other of all.filter((x) => x.isPrimary && x.id !== c?.id)) out.push(await saveChapter(client, userId, { ...other, isPrimary: false }));
  if (c && !c.isPrimary) out.push(await saveChapter(client, userId, { ...c, isPrimary: true }));
  return out;
}
export async function deleteChapter(client: Client, userId: string, c: Pick<Chapter, "id" | "revision">) {
  const r = await client.from("inner_chapters").delete().eq("id", c.id).eq("user_id", userId).eq("revision", c.revision).select("id").maybeSingle();
  if (r.error) throw r.error; if (!r.data) throw Error("This Chapter changed on another device. Reload before deleting.");
}

export async function saveExperience(client: Client, userId: string, e: Experience): Promise<Experience> {
  const row = experienceToRow(e) as unknown as Database["public"]["Tables"]["inner_experiences"]["Update"];
  return experienceFromRow(await upsertRevisioned(
    () => client.from("inner_experiences").insert({ ...row, title: row.title!, id: e.id, user_id: userId }).select("*").single(),
    () => client.from("inner_experiences").update(row).eq("id", e.id).eq("user_id", userId).eq("revision", e.revision).select("*").maybeSingle(), e.revision === 0));
}
export async function deleteExperience(client: Client, userId: string, e: Pick<Experience, "id" | "revision">) {
  const r = await client.from("inner_experiences").delete().eq("id", e.id).eq("user_id", userId).eq("revision", e.revision).select("id").maybeSingle();
  if (r.error) throw r.error; if (!r.data) throw Error("This Experience changed on another device. Reload before deleting.");
}

export async function saveCollection(client: Client, userId: string, c: Collection): Promise<Collection> {
  const row = collectionToRow(c);
  return collectionFromRow(await upsertRevisioned(
    () => client.from("inner_experience_collections").insert({ ...row, cover: row.cover as unknown as Json, id: c.id, user_id: userId }).select("*").single(),
    () => client.from("inner_experience_collections").update({ ...row, cover: row.cover as unknown as Json }).eq("id", c.id).eq("user_id", userId).eq("revision", c.revision).select("*").maybeSingle(), c.revision === 0));
}
export async function deleteCollection(client: Client, userId: string, id: string) {
  must(await client.from("inner_experience_collections").delete().eq("id", id).eq("user_id", userId).select("id"));
}

// ---------- Links: rows only ----------
export async function linkChapterExperience(client: Client, userId: string, chapterId: string, experienceId: string, position: number) {
  must(await client.from("inner_chapter_experiences").upsert({ user_id: userId, chapter_id: chapterId, experience_id: experienceId, position }, { onConflict: "user_id,chapter_id,experience_id" }).select("chapter_id"));
}
export async function unlinkChapterExperience(client: Client, userId: string, chapterId: string, experienceId: string) {
  must(await client.from("inner_chapter_experiences").delete().eq("user_id", userId).eq("chapter_id", chapterId).eq("experience_id", experienceId).select("chapter_id"));
}
export async function linkCollectionExperience(client: Client, userId: string, collectionId: string, experienceId: string, position: number) {
  must(await client.from("inner_collection_experiences").upsert({ user_id: userId, collection_id: collectionId, experience_id: experienceId, position }, { onConflict: "user_id,collection_id,experience_id" }).select("collection_id"));
}
export async function unlinkCollectionExperience(client: Client, userId: string, collectionId: string, experienceId: string) {
  must(await client.from("inner_collection_experiences").delete().eq("user_id", userId).eq("collection_id", collectionId).eq("experience_id", experienceId).select("collection_id"));
}
export async function setAreaLinks(client: Client, userId: string, owner: { chapterId?: string; experienceId?: string }, next: string[], before: string[]) {
  const add = next.filter((x) => !before.includes(x)), drop = before.filter((x) => !next.includes(x));
  if (drop.length) {
    let q = client.from("inner_area_links").delete().eq("user_id", userId).in("area_id", drop);
    q = owner.chapterId ? q.eq("chapter_id", owner.chapterId) : q.eq("experience_id", owner.experienceId!);
    must(await q.select("id"));
  }
  if (add.length) must(await client.from("inner_area_links").insert(add.map((area_id) => ({ user_id: userId, area_id, chapter_id: owner.chapterId ?? null, experience_id: owner.experienceId ?? null }))).select("id"));
}

// ---------- Modules ----------
export async function saveModule(client: Client, userId: string, m: Module): Promise<Module> {
  const row = { ...moduleToRow(m), content: m.content as unknown as Json };
  const out = await upsertRevisioned<Database["public"]["Tables"]["inner_modules"]["Row"]>(
    () => client.from("inner_modules").insert({ ...row, id: m.id, user_id: userId }).select("*").single(),
    () => client.from("inner_modules").update(row).eq("id", m.id).eq("user_id", userId).eq("revision", m.revision).select("*").maybeSingle(), m.revision === 0);
  const parsed = moduleFromRow(out); if (!parsed) throw Error("That module couldn’t be read back.");
  return parsed;
}
export async function deleteModule(client: Client, userId: string, id: string) {
  must(await client.from("inner_modules").delete().eq("id", id).eq("user_id", userId).select("id"));
}
