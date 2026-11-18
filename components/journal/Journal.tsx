"use client";
import { Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MusePageHeader } from "../MusePageHeader";
import { MuseSectionNav } from "../MuseSectionNav";
import { JournalProvider, useJournal } from "./useJournal";
import { Workspace } from "./Workspace";
import { EntryView } from "./EntryView";
import { JournalEditor, JournalManager, blankJournal } from "./JournalsView";
import { CompanionStudio } from "./CompanionStudio";
import { HistoryView } from "./HistoryView";
import { InsightsView } from "./InsightsView";
import { JournalSettings } from "./JournalSettings";
import { MuseIcon } from "../MuseIcon";
import { Sheet } from "./Sheet";
import type { Guide, Journal as JournalRecord } from "@/lib/journal/model";
import { GuideEditor, blankGuide } from "./Guides";
import { JournalUiContext, type JournalUi } from "./ui";
import "./Journal.css";

export const journalTabs = [{ id: "today", label: "Journal" }, { id: "history", label: "History" }, { id: "insights", label: "Insights" }] as const;
type Tab = (typeof journalTabs)[number]["id"];
const parseTab = (v: string | null | undefined): Tab => (journalTabs.some((t) => t.id === v) ? v as Tab : "today");


/**
 * Everyday → Journal: Journal | History | Insights (`?view=`). The Journal tab is the writing workspace. A finished
 * entry opens with `?entry=<id>`; an unfinished one opens in the workspace. Journals, companions, the Companion
 * Studio (`?companion=<id|new>`, a full-screen sheet) and preferences open over the page from the workspace toolbar;
 * there is no separate management page. The old `?view=journals` link opens the workspace with the manager.
 */
const narrowQuery = "(max-width: 1023px)";
const subscribeNarrow = (cb: () => void) => { const m = window.matchMedia(narrowQuery); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
function JournalView() {
  const params = useSearchParams(), router = useRouter();
  const view = parseTab(params?.get("view")), entry = params?.get("entry") ?? null, studio = params?.get("companion") ?? null;
  const j = useJournal();
  const [settings, setSettings] = useState(false);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);
  // Phones and tablets: the toolbar sits under Journal | History | Insights (navigation first, then this page's tools).
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);
  const [manager, setManager] = useState(params?.get("view") === "journals");
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [editing, setEditing] = useState<JournalRecord | null>(() => (params?.get("new") === "journal" ? blankJournal(0) : null));
  const go = useCallback((q: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params?.toString() ?? "");
    for (const [k, v] of Object.entries(q)) { if (v === null) next.delete(k); else next.set(k, v); }
    const s = next.toString(), url = s ? `/journal?${s}` : "/journal";
    if (replace) router.replace(url, { scroll: false }); else router.push(url, { scroll: true });
  }, [params, router]);
  // Bookmarked management links land safely in the workspace (with the manager open).
  useEffect(() => { if (params?.get("view") === "journals") go({ view: null, new: null }, true); }, [params, go]);
  const open = useCallback((id: string) => go({ entry: id, companion: null, view: null }), [go]);
  const conversation = entry ? j.state.conversations.find((c) => c.id === entry) : null;
  const ui = useMemo<JournalUi>(() => ({
    openSettings: () => setSettings(true), openManager: () => setManager(true),
    editJournal: (x) => setEditing(x === "new" ? blankJournal(j.state.journals.length) : x),
    openStudio: (id) => { setManager(false); go({ companion: id }); },
    editGuide: (g) => setEditingGuide(g === "new" ? blankGuide() : g),
    toolbarSlot,
  }), [go, j.state.journals.length, toolbarSlot]);

  // The workspace's toolbar lives in the header; elsewhere (History, Insights, a finished entry) the header keeps
  // just Preferences.
  const inWorkspace = j.status.loaded && !j.status.missing && (entry ? Boolean(conversation && conversation.status !== "completed") : view !== "history" && view !== "insights");
  let body: React.ReactNode;
  if (!j.status.loaded) body = <p className="small-label" role="status">Opening your journal…</p>;
  else if (j.status.missing) body = <p className="mj-error" role="alert">The journal isn’t set up in this database yet. (Its migration hasn’t been applied.)</p>;
  else if (entry && conversation?.status === "completed") body = <EntryView key={conversation.id} conversation={conversation} focusHighlight={params?.get("hl") ?? null} onClose={() => go({ entry: null, hl: null })} />;
  else if (entry && conversation) body = <Workspace initialId={conversation.id} onRouteClear={() => go({ entry: null, view: null })} />;
  else if (entry) body = <p className="mj-note" role="status">That entry isn’t here. It may have been deleted.</p>;
  else if (view === "history") body = <HistoryView open={open} initialTag={params?.get("tag")} initialJournal={params?.get("journal")} onThisDay={params?.get("onthisday") === "1"} />;
  else if (view === "insights") body = <InsightsView key={params?.get("week") ?? "now"} open={open} initialWeek={params?.get("week")} />;
  else body = <Workspace initialId={null} continueFrom={params?.get("continue") ?? null} onRouteClear={() => { if (params?.get("continue")) go({ continue: null }, true); }} onCreated={(id) => go({ continue: null, entry: id }, true)} />;

  const tools = <div className="mj-header-tools" key="tools">
    <div className="mj-header-slot" ref={setToolbarSlot} />
    {!inWorkspace && <button type="button" className="muse-button button-ghost mj-tb-settings" onClick={() => setSettings(true)} aria-label="Journal preferences" title="Preferences"><MuseIcon name="gear" size={17} /><span className="mj-tb-label">Preferences</span></button>}
  </div>;
  return <JournalUiContext.Provider value={ui}><main className="muse-page mj-page" data-focused={Boolean(entry && conversation?.status === "completed") || undefined}>
    <MusePageHeader title="Journal">
      {!narrow && tools}
    </MusePageHeader>
    <MuseSectionNav label="Journal views" current={entry && conversation?.status === "completed" ? "" : entry ? "today" : view} items={journalTabs.map((t) => ({ id: t.id, label: t.label, href: t.id === "today" ? "/journal" : `/journal?view=${t.id}` }))} />
    {narrow && inWorkspace && tools}
    {j.status.error && <p className="mj-error" role="alert"><span>{j.status.error}</span><button type="button" className="muse-button button-ghost" onClick={j.clearError}>Dismiss</button></p>}
    {body}
    {studio && j.status.loaded && <Sheet label="Companion Studio" onClose={() => go({ companion: null })}>
      <CompanionStudio key={studio} companionId={studio === "new" ? "new" : studio} onClose={() => go({ companion: null })} />
    </Sheet>}
    {manager && <JournalManager onClose={() => setManager(false)} />}
    {editing && <JournalEditor journal={editing} onClose={() => setEditing(null)} />}
    {editingGuide && <GuideEditor guide={editingGuide} onClose={() => setEditingGuide(null)} />}
    {settings && <JournalSettings onClose={() => setSettings(false)} />}
    <footer className="muse-footer">Your journal is private to your account. Conversations save as you go.</footer>
  </main></JournalUiContext.Provider>;
}

export function Journal() {
  return <Suspense fallback={<main className="muse-page mj-page" aria-busy="true"><h1>Journal</h1></main>}><JournalProvider><JournalView /></JournalProvider></Suspense>;
}
