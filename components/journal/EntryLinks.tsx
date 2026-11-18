"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { useJournal } from "./useJournal";
import type { Conversation, LinkKind } from "@/lib/journal/model";

type Option = { id: string; label: string };
const kinds: { kind: LinkKind; title: string; href: (id: string) => string }[] = [
  { kind: "chapter", title: "Chapters", href: (id) => `/envision?view=inner-compass&realm=chapters&chapter=${id}` },
  { kind: "experience", title: "Experiences", href: (id) => `/envision?view=inner-compass&realm=experiences&experience=${id}` },
  { kind: "area", title: "Life Atlas areas", href: (id) => `/envision#atlas-area-${id}` },
];

/**
 * Optional connections to My Chapters, My Experiences and Life Atlas areas (Journal V1 §20): an id plus a name
 * snapshot. Nothing in those modules is created or changed, and no Life Atlas score moves.
 */
export function EntryLinks({ conversation }: { conversation: Conversation }) {
  const j = useJournal();
  const [options, setOptions] = useState<Record<LinkKind, Option[]> | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([
      j.client.from("inner_chapters").select("id,title").eq("user_id", j.userId).is("archived_at", null).order("created_at", { ascending: false }).limit(200),
      j.client.from("inner_experiences").select("id,title").eq("user_id", j.userId).is("archived_at", null).order("created_at", { ascending: false }).limit(500),
      j.client.from("life_areas").select("id,label").eq("user_id", j.userId).is("archived_at", null).order("position").limit(50),
    ]).then(([c, e, a]) => { if (live) setOptions({ chapter: (c.data ?? []).map((x) => ({ id: x.id, label: x.title })), experience: (e.data ?? []).map((x) => ({ id: x.id, label: x.title })), area: (a.data ?? []).map((x) => ({ id: x.id, label: x.label })) }); });
    return () => { live = false; };
  }, [j.client, j.userId]);
  const links = j.state.links.filter((l) => l.conversationId === conversation.id);
  return <div className="mj-links">
    <h3 className="mj-section-title">Connections</h3>
    <p className="mj-note">Link this entry to a season of your life, something you lived, or a Life Atlas area. Optional; nothing there changes.</p>
    <div className="mj-links-grid">{kinds.map(({ kind, title, href }) => {
      const mine = links.filter((l) => l.kind === kind), live = options?.[kind] ?? [];
      return <div key={kind}>
        <b className="mj-links-kind">{title}</b>
        <ul className="mj-chip-list">{mine.map((l) => { const now = live.find((o) => o.id === l.targetId); return <li key={l.targetId} className="mj-tag">
          {now ? <Link href={href(l.targetId)}>{now.label}</Link> : <span title="No longer there">{l.label} <small>(no longer there)</small></span>}
          <button type="button" className="mj-x" aria-label={`Unlink ${l.label}`} onClick={() => void j.removeLink(l)}>×</button></li>; })}</ul>
        {live.length > 0 ? <MuseChoiceMenu label={`Link ${title.toLowerCase()}`} valueLabel="Link…" searchable selectedIds={mine.map((l) => l.targetId)} options={live} icon="link"
          onSelect={(id) => { const o = live.find((x) => x.id === id)!; const had = mine.find((l) => l.targetId === id); void (had ? j.removeLink(had) : j.addLink({ conversationId: conversation.id, kind, targetId: id, label: o.label })); }} />
          : <small className="mj-note">{options ? `No ${title.toLowerCase()} yet.` : "Loading…"}</small>}
      </div>;
    })}</div>
  </div>;
}
