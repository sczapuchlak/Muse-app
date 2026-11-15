"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import * as P from "@/lib/inner-compass/persistence";
import type { Discovery, Link, Reflection, Response, Version, AreaLink } from "@/lib/inner-compass/model";
import { pair } from "@/lib/inner-compass/model";
import { emptyManifesto, type Manifesto, type ManifestoVersion } from "@/lib/inner-compass/manifesto";

export type LifeAreaLite = { id: string; label: string; color: string; position: number };
type Status = { loaded: boolean; error: string; saving: boolean };
const missing = (e: unknown) => { const c = (e as { code?: string })?.code; return c === "PGRST205" || c === "42P01"; };

/**
 * The signed-in person's Inner World (#210). Everything loads once; collections are filtered on the device. Every
 * write goes through ./persistence with a revision check; nothing here writes to another module. Life Areas are read
 * (never seeded) from Reflections, so visiting Inner Compass creates nothing.
 */
export function useInnerCompass() {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [userId, setUserId] = useState("");
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [areaLinks, setAreaLinks] = useState<AreaLink[]>([]);
  const [areas, setAreas] = useState<LifeAreaLite[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [manifesto, setManifesto] = useState<Manifesto>(emptyManifesto());
  const [manifestoVersions, setManifestoVersions] = useState<ManifestoVersion[]>([]);
  const [status, setStatus] = useState<Status>({ loaded: false, error: "", saving: false });
  const manifestoRef = useRef(manifesto); manifestoRef.current = manifesto;

  const reload = useCallback(async () => {
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) throw error ?? Error("Sign in to see your Inner World.");
      setUserId(data.user.id);
      const [w, a] = await Promise.all([
        P.loadInnerWorld(client, data.user.id),
        client.from("life_areas").select("id,label,color,position,archived_at").eq("user_id", data.user.id).is("archived_at", null).order("position"),
      ]);
      setDiscoveries(w.discoveries); setVersions(w.versions); setLinks(w.links); setAreaLinks(w.areas); setReflections(w.reflections); setResponses(w.responses);
      setManifesto(w.manifesto ?? emptyManifesto()); setManifestoVersions(w.manifestoVersions);
      setAreas(a.error ? [] : (a.data ?? []).map((x) => ({ id: x.id, label: x.label, color: x.color, position: x.position })));
      setStatus((s) => ({ ...s, loaded: true, error: "" }));
    } catch (e) {
      setStatus((s) => ({ ...s, loaded: true, error: missing(e) ? "Inner Compass isn’t available on this server yet. Everything else in Envision is unaffected." : e instanceof Error ? e.message : "Your Inner World couldn’t load." }));
    }
  }, [client]);
  useEffect(() => { const t = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(t); }, [reload]);

  async function run<T>(work: () => Promise<T>): Promise<T | null> {
    setStatus((s) => ({ ...s, saving: true, error: "" }));
    try { const out = await work(); setStatus((s) => ({ ...s, saving: false })); return out; }
    catch (e) { setStatus((s) => ({ ...s, saving: false, error: e instanceof Error ? e.message : "That didn’t save. Try again." })); return null; }
  }
  const put = (d: Discovery) => setDiscoveries((list) => [d, ...list.filter((x) => x.id !== d.id)]);

  const save = (d: Discovery) => run(async () => { const saved = await P.saveDiscovery(client, userId, d); put(saved); return saved; });
  /** Several new discoveries at once (an exploration or the word garden); stops at the first failure. */
  const saveMany = (list: Discovery[]) => run(async () => { const out: Discovery[] = []; for (const d of list) { const s = await P.saveDiscovery(client, userId, d); put(s); out.push(s); } return out; });
  const remove = (d: Discovery) => run(async () => {
    await P.deleteDiscovery(client, userId, d);
    setDiscoveries((list) => list.filter((x) => x.id !== d.id));
    setVersions((v) => v.filter((x) => x.discoveryId !== d.id));
    setLinks((l) => l.filter((x) => x.a !== d.id && x.b !== d.id));
    setAreaLinks((l) => l.filter((x) => x.discoveryId !== d.id));
    setReflections((r) => r.map((x) => x.discoveryId === d.id ? { ...x, discoveryId: null } : x));
    return true;
  });
  const evolve = (d: Discovery, e: P.Evolution) => run(async () => { const out = await P.recordEvolution(client, d, e); put(out.discovery); setVersions((v) => [...v, out.version]); return out.discovery; });
  const removeVersion = (id: string) => run(async () => { await P.deleteVersion(client, userId, id); setVersions((v) => v.filter((x) => x.id !== id)); return true; });
  const connect = (x: string, y: string) => run(async () => { const l = await P.connect(client, userId, x, y); setLinks((list) => [...list.filter((k) => !(k.a === l.a && k.b === l.b)), l]); return true; });
  const disconnect = (x: string, y: string) => run(async () => { await P.disconnect(client, userId, x, y); const [a, b] = pair(x, y); setLinks((list) => list.filter((k) => !(k.a === a && k.b === b))); return true; });
  const areasOf = useCallback((id: string) => areaLinks.filter((l) => l.discoveryId === id).map((l) => l.areaId), [areaLinks]);
  const setDiscoveryAreas = (id: string, next: string[]) => run(async () => {
    await P.setAreas(client, userId, id, next, areasOf(id));
    setAreaLinks((l) => [...l.filter((x) => x.discoveryId !== id), ...next.map((areaId) => ({ discoveryId: id, areaId }))]);
    return true;
  });
  const saveReflection = (r: Reflection) => run(async () => { const s = await P.saveReflection(client, userId, r); setReflections((list) => [s, ...list.filter((x) => x.id !== s.id)]); return s; });
  const removeReflection = (id: string) => run(async () => { await P.deleteReflection(client, userId, id); setReflections((list) => list.filter((x) => x.id !== id)); return true; });
  const saveResponse = (r: Response) => run(async () => { const s = await P.saveResponse(client, userId, r); setResponses((list) => [s, ...list.filter((x) => x.id !== s.id)]); return s; });
  const removeResponse = (id: string) => run(async () => { await P.deleteResponse(client, userId, id); setResponses((list) => list.filter((x) => x.id !== id)); setReflections((list) => list.map((x) => x.responseId === id ? { ...x, responseId: null } : x)); return true; });
  /** Saves the live manifesto (autosave); always builds on the latest revision this device holds. */
  // Saves run one after another, so a quick second autosave builds on the first one's revision instead of colliding.
  const manifestoQueue = useRef<Promise<unknown>>(Promise.resolve());
  const saveManifesto = (m: Pick<Manifesto, "title" | "blocks">) => {
    const next = manifestoQueue.current.then(() => run(async () => { const s = await P.saveManifesto(client, userId, { ...manifestoRef.current, ...m }); setManifesto(s); manifestoRef.current = s; return s; }));
    manifestoQueue.current = next;
    return next;
  };
  const keepVersion = (note: string) => run(async () => { const v = await P.keepManifestoVersion(client, userId, manifestoRef.current, note); setManifestoVersions((list) => [v, ...list]); return v; });
  const removeManifestoVersion = (id: string) => run(async () => { await P.deleteManifestoVersion(client, userId, id); setManifestoVersions((list) => list.filter((x) => x.id !== id)); return true; });

  return {
    status, reload, discoveries, versions, links, areas, areaLinks, areasOf, reflections, responses, manifesto, manifestoVersions,
    save, saveMany, remove, evolve, removeVersion, connect, disconnect, setDiscoveryAreas, saveReflection, removeReflection, saveResponse, removeResponse,
    saveManifesto, keepVersion, removeManifestoVersion,
  };
}
export type Compass = ReturnType<typeof useInnerCompass>;
