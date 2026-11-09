"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { boardImageBucket } from "@/lib/data/constellation-images";
import { usedPaths, type VisionBoard } from "@/lib/vision-boards/model";
import { deleteBoard, loadBoards, missingTable, saveBoard } from "@/lib/vision-boards/persistence";

/**
 * The signed-in person's Vision Boards. Image files belong to boards: a duplicate shares its source's files rather
 * than copying them, so a file is only removed once no board uses it (storage enforces the same rule).
 */
export function useVisionBoards() {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [userId, setUserId] = useState("");
  const [boards, setBoards] = useState<VisionBoard[]>([]);
  const [status, setStatus] = useState<{ loaded: boolean; error: string; saving: boolean; unavailable: boolean }>({ loaded: false, error: "", saving: false, unavailable: false });
  const boardsRef = useRef<VisionBoard[]>([]);
  boardsRef.current = boards;

  const reload = useCallback(async () => {
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) throw error ?? Error("Sign in to see your vision boards.");
      setUserId(data.user.id);
      setBoards(await loadBoards(client));
      setStatus((s) => ({ ...s, loaded: true, error: "", unavailable: false }));
    } catch (e) {
      setStatus((s) => ({ ...s, loaded: true, unavailable: missingTable(e), error: missingTable(e) ? "Vision Boards aren’t available on this server yet. Your aspirations and bucket list are unaffected." : e instanceof Error ? e.message : "Your vision boards couldn’t load." }));
    }
  }, [client]);
  useEffect(() => { const t = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(t); }, [reload]);

  async function run<T>(work: () => Promise<T>): Promise<T | null> {
    setStatus((s) => ({ ...s, saving: true, error: "" }));
    try { const out = await work(); setStatus((s) => ({ ...s, saving: false })); return out; }
    catch (e) { setStatus((s) => ({ ...s, saving: false, error: e instanceof Error ? e.message : "That didn’t save. Try again." })); return null; }
  }
  /** Keeps the library in step with a board saved elsewhere (the editor). */
  const put = useCallback((b: VisionBoard) => setBoards((list) => [b, ...list.filter((x) => x.id !== b.id)]), []);
  const save = (b: VisionBoard) => run(async () => { const saved = await saveBoard(client, b); put(saved); return saved; });
  const duplicate = (b: VisionBoard) => run(async () => {
    const now = new Date().toISOString();
    const copy = await saveBoard(client, { ...b, id: crypto.randomUUID(), title: `${b.title} (copy)`.slice(0, 120), revision: 0, createdAt: now, updatedAt: now });
    put(copy);
    return copy;
  });
  const remove = (b: VisionBoard) => run(async () => {
    await deleteBoard(client, b);
    const rest = boardsRef.current.filter((x) => x.id !== b.id);
    setBoards(rest);
    await sweepFiles(b.id, usedPaths(rest)).catch(() => undefined); // files stay private; account deletion removes them
    try { localStorage.removeItem(draftKey(b.id)); } catch { /* this device only */ }
    return true;
  });

  /**
   * Removes a board's own files that no board uses any more: what the board itself dropped, and uploads that were
   * never saved (an interrupted upload). `keep` adds paths still needed, e.g. by the editor's undo history.
   */
  async function sweepFiles(boardId: string, keep: Set<string>) {
    if (!userId) return;
    const storage = client.storage.from(boardImageBucket), folder = `${userId}/${boardId}`;
    const { data, error } = await storage.list(folder, { limit: 1000 });
    if (error) throw error;
    const stale = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`).filter((p) => !keep.has(p));
    if (stale.length) await storage.remove(stale);
  }
  const sweep = (boardId: string, extra: Set<string> = new Set()) => sweepFiles(boardId, new Set([...usedPaths(boardsRef.current), ...extra])).catch(() => undefined);

  return { client, userId, boards, status, reload, save, put, duplicate, remove, sweep };
}
export const draftKey = (id: string) => `muse.vision.draft.${id}`;
