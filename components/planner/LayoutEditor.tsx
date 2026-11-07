"use client";
import { useState } from "react";
import { isPermanent, newSectionId, overlappingTaskSections, readingMetrics, repeatable, sectionSizes, sectionTypes, sectionWorkspaces, type AgendaSection, type CompletedChoice, type ReadingMetric, type SectionSize, type SectionType } from "@/lib/agenda-layout";
import { usePlanner } from "../PlannerStore";
import { useAgendaData } from "./AgendaData";

const typeLabel = (t: SectionType) => sectionTypes.find((x) => x.id === t)!.label;

/**
 * Customize layout (#79 §3.7–3.9, Workstream A §5): one template for all seven days. Reorder by dragging or with the
 * Move up/down buttons, choose a size preset, rename, configure, add or remove. Events and the first Tasks section
 * stay. Removing a section never touches the records it showed.
 */
export function LayoutEditor({ onClose }: { onClose: () => void }) {
  const { layout, changeLayout, status } = useAgendaData();
  const { state } = usePlanner();
  const [dragId, setDragId] = useState<string | null>(null), [over, setOver] = useState<number | null>(null), [confirmReset, setConfirmReset] = useState(false);
  const [addType, setAddType] = useState<SectionType | "">(""), [announce, setAnnounce] = useState("");
  const sections = layout.sections, workspaceIds = state.workspaces.map((w) => w.id);
  const available = sectionTypes.filter((t) => repeatable(t.id) || !sections.some((s) => s.type === t.id));
  const overlaps = overlappingTaskSections(sections, workspaceIds);
  const move = (s: AgendaSection, to: number) => { changeLayout({ type: "move", id: s.id, to }); setAnnounce(`${s.title} moved to position ${Math.max(1, Math.min(sections.length, to + 1))} of ${sections.length}, in every day.`); };

  return <section className="muse-layout-editor" aria-label="Customize weekly layout">
    <header><div><h3>Weekly layout</h3><p className="small-label">One layout for every day. Changes apply to Monday through Sunday at once.</p></div>
      <button type="button" className="muse-button button-primary" onClick={onClose}>Done</button></header>
    <ol className="muse-layout-list" onDragOver={(e) => { if (dragId) e.preventDefault(); }}>
      {sections.map((s, i) => {
        const scope = s.type === "tasks" ? sectionWorkspaces(s, workspaceIds) : null;
        return <li key={s.id} className="muse-layout-row" draggable data-dragging={dragId === s.id || undefined} data-over={over === i || undefined}
          onDragStart={(e) => { if ((e.target as Element).closest("input,select,button:not(.muse-layout-grip)")) { e.preventDefault(); return; } setDragId(s.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); }}
          onDragEnd={() => { setDragId(null); setOver(null); }}
          onDragOver={(e) => { if (dragId) { e.preventDefault(); setOver(i); } }}
          onDrop={(e) => { e.preventDefault(); const moved = sections.find((x) => x.id === dragId); if (moved) move(moved, i); setDragId(null); setOver(null); }}>
          <span className="muse-layout-grip" aria-hidden="true">⋮⋮</span>
          <div className="muse-layout-main">
            <div className="muse-layout-line">
              <label className="muse-layout-title"><span className="sr-only">Title of section {i + 1}</span>
                <input value={s.title} maxLength={32} onChange={(e) => changeLayout({ type: "update", id: s.id, patch: { title: e.target.value || typeLabel(s.type) } })} /></label>
              <span className="small-label">{typeLabel(s.type)}{isPermanent(s) ? " · always shown" : ""}</span>
            </div>
            <div className="muse-layout-line">
              <label>Height <select value={s.size} onChange={(e) => changeLayout({ type: "update", id: s.id, patch: { size: e.target.value as SectionSize } })}>
                {sectionSizes.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}</select></label>
              {s.type === "reading" && <label>Show <select value={s.metric} onChange={(e) => changeLayout({ type: "update", id: s.id, patch: { metric: e.target.value as ReadingMetric } })}>
                {readingMetrics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>}
              {s.type === "tasks" && <label>Completed <select value={s.completed} onChange={(e) => changeLayout({ type: "update", id: s.id, patch: { completed: e.target.value as CompletedChoice } })}>
                <option value="inherit">Follow the Agenda setting</option><option value="show">Always show</option><option value="hide">Always hide</option></select></label>}
            </div>
            {scope && <fieldset className="muse-layout-workspaces"><legend>Workspaces</legend>
              <label><input type="checkbox" checked={!s.workspaceIds?.length} onChange={(e) => changeLayout({ type: "update", id: s.id, patch: { workspaceIds: e.target.checked ? [] : [workspaceIds[0]].filter(Boolean) } })} /> All workspaces</label>
              {state.workspaces.map((w) => { const chosen = s.workspaceIds ?? [], on = chosen.includes(w.id), last = on && scope.ids.length === 1;
                // Unchecking the last chosen workspace would silently mean "all"; choose All explicitly instead.
                return <label key={w.id} title={last ? "Keep at least one, or choose All workspaces" : undefined}><input type="checkbox" disabled={!chosen.length || last} checked={on}
                  onChange={(e) => changeLayout({ type: "update", id: s.id, patch: { workspaceIds: e.target.checked ? [...chosen, w.id] : chosen.filter((x) => x !== w.id) } })} /> {w.name}</label>; })}
              {scope.missing.length > 0 && <p className="muse-agenda-warning" role="note">{scope.missing.length === 1 ? "One workspace" : `${scope.missing.length} workspaces`} chosen here no longer exist. Pick again, or choose All.</p>}
            </fieldset>}
          </div>
          <div className="muse-layout-actions">
            <button type="button" className="muse-button button-ghost" disabled={i === 0} aria-label={`Move ${s.title} up`} onClick={() => move(s, i - 1)}>↑</button>
            <button type="button" className="muse-button button-ghost" disabled={i === sections.length - 1} aria-label={`Move ${s.title} down`} onClick={() => move(s, i + 1)}>↓</button>
            {!isPermanent(s) && <button type="button" className="text-button" aria-label={`Remove ${s.title} (its records stay)`} onClick={() => { changeLayout({ type: "remove", id: s.id }); setAnnounce(`${s.title} removed from the layout. Nothing it showed was deleted.`); }}>Remove</button>}
          </div>
        </li>;
      })}
    </ol>
    {overlaps.length > 0 && <p className="small-label" role="note">Heads up: {overlaps.map(([a, b]) => `“${a}” and “${b}”`).join(", ")} share a workspace, so some tasks show in both. They’re still one task.</p>}
    <form className="muse-layout-add" onSubmit={(e) => { e.preventDefault(); if (!addType) return; changeLayout({ type: "add", section: { id: newSectionId(addType), type: addType, ...(addType === "tasks" ? { workspaceIds: [], completed: "inherit" } : {}) } }); setAnnounce(`${typeLabel(addType)} added to every day.`); setAddType(""); }}>
      <label>Add a section <select value={addType} onChange={(e) => setAddType(e.target.value as SectionType | "")}>
        <option value="">Choose…</option>{available.map((t) => <option key={t.id} value={t.id}>{t.label} — {t.hint}</option>)}</select></label>
      <button type="submit" className="muse-button" disabled={!addType || sections.length >= 16}>Add</button>
    </form>
    <div className="muse-layout-reset">{confirmReset
      ? <span role="group" aria-label="Confirm reset">Go back to just Events and Tasks? Your notes, Marks and records stay. <button type="button" className="text-button" onClick={() => { changeLayout({ type: "reset" }); setConfirmReset(false); setAnnounce("Layout reset to Events and Tasks."); }}>Reset layout</button><button type="button" className="text-button" onClick={() => setConfirmReset(false)}>Keep mine</button></span>
      : <button type="button" className="text-button" onClick={() => setConfirmReset(true)}>Reset to default…</button>}</div>
    <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    {status && <p className="small-label" role="status">{status}</p>}
  </section>;
}
