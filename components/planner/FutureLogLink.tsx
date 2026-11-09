"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { deleteFutureEntry, monthKey, readFutureReferences, saveFutureEntry, sourceKey, type FutureSource } from "@/lib/future-log";
import { MuseIcon } from "../MuseIcon";
import { refreshFutureLog } from "./FutureLog";
import "./FutureLogLink.css";

/**
 * #112 "Show in Future Log": explicit inclusion of a record that lives elsewhere. The Future Log keeps a reference
 * (kind, id and a name snapshot) — never a copy and never a second done state. Removing it never touches the source.
 * One shared read of which records are referenced serves every toggle on the page.
 */
type Ref = { entryId: string; year: string };
let refs: Map<string, Ref> | null = null, supported = true, loading: Promise<void> | null = null, error = "", version = 0;
const listeners = new Set<() => void>();
let client: ReturnType<typeof createMuseBrowserClient> | null = null;
const db = () => client ??= createMuseBrowserClient();
const emit = () => { version++; listeners.forEach((l) => l()); };
function load() {
  if (refs || loading) return loading;
  loading = readFutureReferences(db()).then((list) => { supported = list !== null; refs = new Map((list ?? []).map((r) => [r.key, { entryId: r.entryId, year: r.year }])); error = ""; },
    (e) => { error = e instanceof Error ? e.message : "The Future Log couldn’t load."; }).finally(() => { loading = null; emit(); });
  return loading;
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const thisMonth = () => new Date().toISOString().slice(0, 7);

export function useFutureReferences() {
  useSyncExternalStore(subscribe, () => version, () => 0);
  useEffect(() => { void load(); }, []);
  return {
    // Ready only when the server supports references, so nothing offers a link it can't save.
    ready: !!refs && supported, error,
    has: (source: FutureSource) => !!refs?.has(sourceKey(source)),
    /** Adds a reference in the source's month; undated sources use a later horizon month if given, else this month. */
    async add(source: FutureSource, title: string, date: string | null, endDate: string | null = null, horizon?: string) {
      const month = date ? monthKey(date) : horizon && horizon > thisMonth() ? horizon : thisMonth();
      const saved = await saveFutureEntry(db(), { id: crypto.randomUUID(), month, date, endDate: date && endDate && monthKey(endDate) >= month ? endDate : null, title: title.trim().slice(0, 160) || "Untitled", note: null, icon: null, color: "primary", done: false, position: 0, revision: 1, source }, true);
      refs?.set(sourceKey(source), { entryId: saved.id, year: saved.month.slice(0, 4) }); emit(); refreshFutureLog(saved.month.slice(0, 4));
    },
    async remove(source: FutureSource) {
      const ref = refs?.get(sourceKey(source)); if (!ref) return;
      await deleteFutureEntry(db(), ref.entryId); refs?.delete(sourceKey(source)); emit(); refreshFutureLog(ref.year);
    },
  };
}
/** Lets the Future Log tell the toggles when a reference is removed from inside the Future Log itself. */
export function forgetFutureReference(source: FutureSource) { if (refs?.delete(sourceKey(source))) emit(); }

/** A quiet button for record details: "Show in Future Log" / "In Future Log · Remove". */
export function FutureLogToggle({ source, title, date, endDate, className = "text-button", compact = false }: { source: FutureSource; title: string; date: string | null; endDate?: string | null; className?: string; compact?: boolean }) {
  const links = useFutureReferences(), on = links.has(source), [busy, setBusy] = useState(false), [failed, setFailed] = useState("");
  if (!links.ready) return null;
  const label = on ? `Remove ${title} from the Future Log` : `Show ${title} in the Future Log`;
  async function toggle() {
    setBusy(true); setFailed("");
    try { await (on ? links.remove(source) : links.add(source, title, date, endDate)); }
    catch (e) { setFailed(e instanceof Error ? e.message : "That didn’t save. Try again."); }
    finally { setBusy(false); }
  }
  return <span className="muse-future-toggle-wrap">
    <button type="button" className={`${className} muse-future-toggle`} aria-pressed={on} disabled={busy} aria-label={compact ? label : undefined}
      title={on ? "In your Future Log. Removing it there never changes this record." : "Adds a reference to Planner → Agenda → Future Log. Nothing is copied."}
      onClick={() => void toggle()}>
      <MuseIcon name={on ? "check" : "calendar"} size={14} />{!compact && (on ? "In Future Log · Remove" : "Show in Future Log")}
    </button>
    {failed && <span className="small-label muse-future-toggle-error" role="alert">{failed}</span>}
  </span>;
}
