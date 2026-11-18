"use client";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MusePageHeader } from "../MusePageHeader";
import { MuseSectionNav } from "../MuseSectionNav";
import { JournalProvider, useJournal } from "./useJournal";
import { Today } from "./Today";
import { ActiveConversation } from "./ActiveConversation";
import { EntryView } from "./EntryView";
import { JournalsView } from "./JournalsView";
import { CompanionStudio } from "./CompanionStudio";
import { HistoryView } from "./HistoryView";
import { InsightsView } from "./InsightsView";
import { JournalSettings } from "./JournalSettings";
import "./Journal.css";

export const journalTabs = [{ id: "today", label: "Today" }, { id: "journals", label: "Journals" }, { id: "history", label: "History" }, { id: "insights", label: "Insights" }] as const;
type Tab = (typeof journalTabs)[number]["id"];
const parseTab = (v: string | null | undefined): Tab => (journalTabs.some((t) => t.id === v) ? v as Tab : "today");

/**
 * Everyday → Journal (Journal V1). Views: Today | Journals | History | Insights (`?view=`). An entry opens over any
 * view with `?entry=<id>` (a live conversation while active, the reading view once finished); the Companion Studio
 * opens with `?companion=<id|new>`. All of it is private to the signed-in person.
 */
function JournalView() {
  const params = useSearchParams(), router = useRouter();
  const view = parseTab(params?.get("view")), entry = params?.get("entry") ?? null, studio = params?.get("companion") ?? null;
  const j = useJournal();
  const [opening, setOpening] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const go = useCallback((q: Record<string, string | null>) => {
    const next = new URLSearchParams(params?.toString() ?? "");
    for (const [k, v] of Object.entries(q)) { if (v === null) next.delete(k); else next.set(k, v); }
    const s = next.toString(); router.push(s ? `/journal?${s}` : "/journal", { scroll: true });
  }, [params, router]);
  const open = useCallback((id: string, opts?: { opening?: boolean }) => { setOpening(opts?.opening ? id : null); go({ entry: id, companion: null }); }, [go]);
  const conversation = entry ? j.state.conversations.find((c) => c.id === entry) : null;

  let body: React.ReactNode;
  if (!j.status.loaded) body = <p className="small-label" role="status">Opening your journal…</p>;
  else if (j.status.missing) body = <p className="mj-error" role="alert">The journal isn’t set up in this database yet. (Its migration hasn’t been applied.)</p>;
  else if (studio) body = <CompanionStudio key={studio} companionId={studio === "new" ? "new" : studio} onClose={() => go({ companion: null, view: "journals" })} />;
  else if (entry && conversation) body = conversation.status === "completed"
    ? <EntryView key={conversation.id} conversation={conversation} onClose={() => go({ entry: null })} />
    : <ActiveConversation key={conversation.id} conversation={conversation} requestOpening={opening === conversation.id} onClose={() => go({ entry: null, view: null })} onFinished={(c) => { setOpening(null); go({ entry: c.id }); }} />;
  else if (entry) body = <p className="mj-note" role="status">That entry isn’t here. It may have been deleted.</p>;
  else if (view === "journals") body = <JournalsView openStudio={(id) => go({ companion: id })} />;
  else if (view === "history") body = <HistoryView open={open} initialTag={params?.get("tag")} initialJournal={params?.get("journal")} />;
  else if (view === "insights") body = <InsightsView open={open} />;
  else body = <Today open={open} />;

  return <main className="muse-page mj-page" data-focused={Boolean(entry || studio) || undefined}>
    <MusePageHeader title="Journal">
      <button type="button" className="muse-button button-ghost" onClick={() => setSettings(true)}>Settings</button>
    </MusePageHeader>
    <MuseSectionNav label="Journal views" current={entry || studio ? "" : view} items={journalTabs.map((t) => ({ id: t.id, label: t.label, href: t.id === "today" ? "/journal" : `/journal?view=${t.id}` }))} />
    {j.status.error && <p className="mj-error" role="alert"><span>{j.status.error}</span><button type="button" className="muse-button button-ghost" onClick={j.clearError}>Dismiss</button></p>}
    {body}
    {settings && <JournalSettings onClose={() => setSettings(false)} />}
    <footer className="muse-footer">Your journal is private to your account. Conversations save as you go.</footer>
  </main>;
}

export function Journal() {
  return <Suspense fallback={<main className="muse-page mj-page" aria-busy="true"><h1>Journal</h1></main>}><JournalProvider><JournalView /></JournalProvider></Suspense>;
}
