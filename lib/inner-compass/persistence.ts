/**
 * Inner Compass persistence (#210): owner-only tables (RLS), revision checks so two devices never overwrite each
 * other, and one atomic database function for "Record evolution". Nothing here touches another module's tables
 * except reading the person's Life Areas through their ids.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { pair, discoveryFromRow, discoveryToRow, reflectionFromRow, responseFromRow, versionFromRow, detailsFor, type Answer, type Details, type Discovery, type Link, type AreaLink, type Reflection, type Response, type Version } from "./model";
import { manifestoFromRow, versionFromRow as manifestoVersionFromRow, type Manifesto, type ManifestoVersion } from "./manifesto";

type Client = SupabaseClient<Database>;
export const STALE = "This changed on another device. Reload to see the latest before saving again.";
function must<T>(r: { data: T | null; error: unknown }): T { if (r.error) throw r.error; return r.data as T; }

export type InnerWorld = { discoveries: Discovery[]; versions: Version[]; links: Link[]; areas: AreaLink[]; reflections: Reflection[]; responses: Response[]; manifesto: Manifesto | null; manifestoVersions: ManifestoVersion[] };

/** Everything in one round trip of parallel reads. Collections stay small enough to filter on the device. */
export async function loadInnerWorld(client: Client, userId: string): Promise<InnerWorld> {
  const [d, v, l, a, r, x, m, mv] = await Promise.all([
    client.from("inner_discoveries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5000),
    client.from("inner_discovery_versions").select("*").eq("user_id", userId).order("evolved_on").order("created_at").limit(10000),
    client.from("inner_discovery_links").select("*").eq("user_id", userId).limit(10000),
    client.from("inner_discovery_areas").select("discovery_id,area_id").eq("user_id", userId).limit(10000),
    client.from("inner_reflections").select("*").eq("user_id", userId).order("written_on", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    client.from("inner_exploration_responses").select("*").eq("user_id", userId).order("completed_on", { ascending: false }).order("created_at", { ascending: false }).limit(2000),
    client.from("inner_manifestos").select("*").eq("user_id", userId).maybeSingle(),
    client.from("inner_manifesto_versions").select("*").eq("user_id", userId).order("saved_at", { ascending: false }).limit(200),
  ]);
  return {
    discoveries: must(d).map(discoveryFromRow), versions: must(v).map(versionFromRow),
    links: must(l).map((x) => ({ a: x.a_id, b: x.b_id, createdAt: x.created_at })), areas: must(a).map((x) => ({ discoveryId: x.discovery_id, areaId: x.area_id })),
    reflections: must(r).map(reflectionFromRow), responses: must(x).map(responseFromRow),
    manifesto: m.error ? (() => { throw m.error; })() : m.data ? manifestoFromRow(m.data) : null, manifestoVersions: must(mv).map(manifestoVersionFromRow),
  };
}

/** Insert (revision 0) or update only if nobody else changed it since. An ordinary edit never creates a version. */
export async function saveDiscovery(client: Client, userId: string, d: Discovery): Promise<Discovery> {
  const row = discoveryToRow(d);
  const result = d.revision === 0
    ? await client.from("inner_discoveries").insert({ ...row, id: d.id, user_id: userId }).select("*").single()
    : await client.from("inner_discoveries").update(row).eq("id", d.id).eq("user_id", userId).eq("revision", d.revision).select("*").maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw Error(STALE);
  return discoveryFromRow(result.data);
}
export async function deleteDiscovery(client: Client, userId: string, d: Pick<Discovery, "id" | "revision">) {
  const r = await client.from("inner_discoveries").delete().eq("id", d.id).eq("user_id", userId).eq("revision", d.revision).select("id").maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw Error("This discovery changed on another device. Reload before deleting.");
}

export type Evolution = { title: string; meaning: string; details: Details; reason: string; reflection: string; evolvedOn: string };
/** Keeps the earlier words (copied by the database from the row itself), then saves the new ones. */
export async function recordEvolution(client: Client, d: Discovery, e: Evolution): Promise<{ discovery: Discovery; version: Version }> {
  const r = await client.rpc("record_inner_evolution", {
    p_id: d.id, p_revision: d.revision, p_title: e.title.trim(), p_meaning: e.meaning, p_details: detailsFor(d.category, e.details) as Json,
    p_reason: e.reason.trim(), p_reflection: e.reflection.trim(), p_evolved_on: e.evolvedOn,
  });
  if (r.error) { if (r.error.code === "P0001" && /another device/.test(r.error.message)) throw Error(STALE); throw r.error; }
  const row = (r.data as Database["public"]["Tables"]["inner_discoveries"]["Row"][] | null)?.[0];
  if (!row) throw Error(STALE);
  const v = await client.from("inner_discovery_versions").select("*").eq("discovery_id", d.id).order("created_at", { ascending: false }).limit(1).single();
  if (v.error) throw v.error;
  return { discovery: discoveryFromRow(row), version: versionFromRow(v.data) };
}
export async function deleteVersion(client: Client, userId: string, id: string) {
  must(await client.from("inner_discovery_versions").delete().eq("id", id).eq("user_id", userId).select("id"));
}

export async function connect(client: Client, userId: string, x: string, y: string): Promise<Link> {
  const [a, b] = pair(x, y);
  const r = await client.from("inner_discovery_links").upsert({ user_id: userId, a_id: a, b_id: b }, { onConflict: "user_id,a_id,b_id", ignoreDuplicates: true }).select("*").maybeSingle();
  if (r.error) throw r.error;
  return { a, b, createdAt: r.data?.created_at ?? new Date().toISOString() };
}
export async function disconnect(client: Client, userId: string, x: string, y: string) {
  const [a, b] = pair(x, y);
  must(await client.from("inner_discovery_links").delete().eq("user_id", userId).eq("a_id", a).eq("b_id", b).select("a_id"));
}
/** Replaces the Life Areas a discovery is associated with. */
export async function setAreas(client: Client, userId: string, discoveryId: string, areaIds: string[], before: string[]) {
  const add = areaIds.filter((id) => !before.includes(id)), drop = before.filter((id) => !areaIds.includes(id));
  if (drop.length) must(await client.from("inner_discovery_areas").delete().eq("user_id", userId).eq("discovery_id", discoveryId).in("area_id", drop).select("area_id"));
  if (add.length) must(await client.from("inner_discovery_areas").insert(add.map((area_id) => ({ user_id: userId, discovery_id: discoveryId, area_id }))).select("area_id"));
}

export async function saveReflection(client: Client, userId: string, r: Reflection): Promise<Reflection> {
  const row = { discovery_id: r.discoveryId, discovery_title: r.discoveryTitle?.slice(0, 300) ?? null, response_id: r.responseId, body: r.body.slice(0, 20000), feeling: r.feeling?.trim().slice(0, 40) || null, written_on: r.writtenOn,
    chapter_id: r.chapterId ?? null, chapter_title: r.chapterTitle?.slice(0, 160) ?? null, experience_id: r.experienceId ?? null, experience_title: r.experienceTitle?.slice(0, 200) ?? null, images: (r.images ?? []) as unknown as Json };
  const result = r.revision === 0
    ? await client.from("inner_reflections").insert({ ...row, id: r.id, user_id: userId }).select("*").single()
    : await client.from("inner_reflections").update(row).eq("id", r.id).eq("user_id", userId).eq("revision", r.revision).select("*").maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw Error(STALE);
  return reflectionFromRow(result.data);
}
export async function deleteReflection(client: Client, userId: string, id: string) {
  must(await client.from("inner_reflections").delete().eq("id", id).eq("user_id", userId).select("id"));
}

export async function saveResponse(client: Client, userId: string, r: Response): Promise<Response> {
  const row = { exploration_key: r.explorationKey, exploration_title: r.explorationTitle.slice(0, 200), answers: r.answers.filter((a) => a.text.trim()) as unknown as Json, reflection: r.reflection.slice(0, 20000), completed_on: r.completedOn };
  const result = r.revision === 0
    ? await client.from("inner_exploration_responses").insert({ ...row, id: r.id, user_id: userId }).select("*").single()
    : await client.from("inner_exploration_responses").update(row).eq("id", r.id).eq("user_id", userId).eq("revision", r.revision).select("*").maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw Error(STALE);
  return responseFromRow(result.data);
}
export async function deleteResponse(client: Client, userId: string, id: string) {
  must(await client.from("inner_exploration_responses").delete().eq("id", id).eq("user_id", userId).select("id"));
}
export type { Answer };

export async function saveManifesto(client: Client, userId: string, m: Manifesto): Promise<Manifesto> {
  const row = { title: m.title.trim().slice(0, 120) || "My Manifesto", blocks: m.blocks as unknown as Json };
  const result = m.revision === 0
    ? await client.from("inner_manifestos").insert({ ...row, user_id: userId }).select("*").single()
    : await client.from("inner_manifestos").update(row).eq("user_id", userId).eq("revision", m.revision).select("*").maybeSingle();
  if (result.error) { if (result.error.code === "23505") throw Error(STALE); throw result.error; }
  if (!result.data) throw Error(STALE);
  return manifestoFromRow(result.data);
}
export async function keepManifestoVersion(client: Client, userId: string, m: Manifesto, note: string): Promise<ManifestoVersion> {
  const r = await client.from("inner_manifesto_versions").insert({ user_id: userId, title: m.title, blocks: m.blocks as unknown as Json, note: note.trim().slice(0, 300) }).select("*").single();
  if (r.error) throw r.error;
  return manifestoVersionFromRow(r.data);
}
export async function deleteManifestoVersion(client: Client, userId: string, id: string) {
  must(await client.from("inner_manifesto_versions").delete().eq("id", id).eq("user_id", userId).select("id"));
}
