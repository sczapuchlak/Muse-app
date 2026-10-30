"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { DailyMovement, MovementType } from "@/lib/models";
import { MAX_QUICK_MOVEMENTS, promoteMovement, movementNameError, normalizeMovementName, toggleSelection } from "@/lib/selections";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";
import { InlineTextEditor } from "./InlineTextEditor";
import { MovementTypeManager } from "./MovementTypeManager";
import { GlassPopover } from "./GlassPopover";
import { useMuseState } from "./MuseSession";

type Props = { initialTypes: MovementType[]; initialDay: DailyMovement };
type Panel = { mode: "more" | "add" | "manage" } | { mode: "rename"; id: string } | null;

export function MovementCard({ initialTypes, initialDay }: Props) {
  const [types, setTypes] = useMuseState("movement-types", initialTypes, true);
  const [quickIds, setQuickIds] = useMuseState("movement-quick", () => initialTypes.filter((type) => type.source === "starter").slice(0, MAX_QUICK_MOVEMENTS).map((type) => type.id), true);
  const [recentIds, setRecentIds] = useMuseState<string[]>("movement-recent", [], true);
  const [day, setDay] = useMuseState("movement", initialDay);
  const [panel, setPanel] = useState<Panel>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const available = types.filter((type) => !type.archived);
  const quick = quickIds.map((id) => available.find((type) => type.id === id)).filter((type): type is MovementType => Boolean(type));
  const others = available.filter((type) => !quickIds.includes(type.id));
  const selectedNames = available.filter((type) => day.typeIds.includes(type.id)).map((type) => type.name).join(", ");
  const renaming = panel?.mode === "rename" ? types.find((type) => type.id === panel.id) : undefined;

  function close() { setPanel(null); anchorRef.current?.focus(); }
  function selectIntoShelf(id: string) {
    setQuickIds((ids) => promoteMovement(ids, id, recentIds, day.typeIds));
    setRecentIds((ids) => [id, ...ids.filter((value) => value !== id)]);
  }
  function toggleDay(id: string, fromOverflow = false) {
    if (!day.typeIds.includes(id)) {
      if (fromOverflow) selectIntoShelf(id);
      else setRecentIds((ids) => [id, ...ids.filter((value) => value !== id)]);
    }
    setDay((current) => ({ ...current, typeIds: toggleSelection(current.typeIds, id) }));
  }
  function saveName(name: string): string | null {
    const id = panel?.mode === "rename" ? panel.id : undefined;
    const error = movementNameError(name, types, id);
    if (error) return error;
    const normalized = normalizeMovementName(name);
    if (id) setTypes((items) => items.map((type) => type.id === id ? { ...type, name: normalized } : type));
    else {
      const newId = crypto.randomUUID();
      setTypes((items) => [...items, { id: newId, name: normalized, source: "custom", archived: false }]);
      setDay((current) => ({ ...current, typeIds: [...current.typeIds, newId] }));
      selectIntoShelf(newId);
    }
    close();
    return null;
  }
  function deleteType(id: string) {
    if (!available.some((type) => type.id === id && type.source === "custom")) return;
    setTypes((items) => items.map((type) => type.id === id ? { ...type, archived: true } : type));
    setQuickIds((ids) => ids.filter((value) => value !== id));
    setDay((current) => ({ ...current, typeIds: current.typeIds.filter((value) => value !== id) }));
  }

  return (
    <MuseCard id="movement" className="movement-card">
      <CardHeading id="movement" title="Movement" icon="movement">
        <button type="button" className="text-button" aria-expanded={panel?.mode === "manage"} aria-controls="movement-menu"
          onClick={(event) => { anchorRef.current = event.currentTarget; setPanel((current) => current?.mode === "manage" ? null : { mode: "manage" }); }}>Manage</button>
      </CardHeading>
      <p className="card-description movement-selection-summary" title={selectedNames || "Today’s intention · Select any"}>{selectedNames ? `Selected: ${selectedNames}` : "Today’s intention · Select any"}</p>
      <div className="movement-quick-row" role="group" aria-label="Quick movement types" style={{ "--quick-columns": quick.length + 1 } as CSSProperties}>
        {quick.map((type) => (
          <button type="button" className="choice-button movement-quick-chip" key={type.id} title={type.name} aria-pressed={day.typeIds.includes(type.id)} onClick={() => toggleDay(type.id)}>
            <span className="chip-label">{type.name}</span><span className="choice-mark"><MuseIcon name="check" size={12} /></span>
          </button>
        ))}
        <button type="button" className="choice-button movement-more" aria-expanded={panel?.mode === "more"} aria-controls="movement-menu"
          onClick={(event) => { anchorRef.current = event.currentTarget; setPanel((current) => current?.mode === "more" ? null : { mode: "more" }); }}>
          More<MuseIcon name="chevron" size={12} />
        </button>
      </div>
      <GlassPopover id="movement-menu" label="Saved movement types" open={panel !== null} anchorRef={anchorRef} onClose={() => setPanel(null)} width={panel?.mode === "manage" ? 420 : 340}>
        {panel?.mode === "more" && <>
          <p className="editor-label">Saved movement types</p>
          <div className="popover-choice-list">
            {others.map((type) => <button key={type.id} type="button" className="popover-choice" aria-pressed={day.typeIds.includes(type.id)} onClick={() => { toggleDay(type.id, true); requestAnimationFrame(() => document.getElementById("movement-menu")?.querySelector<HTMLButtonElement>("button")?.focus()); }}>
              <span>{type.name}</span>{day.typeIds.includes(type.id) && <MuseIcon name="check" size={15} />}
            </button>)}
            {!others.length && <p className="small-label">All saved types are in quick options.</p>}
          </div>
        </>}
        {panel?.mode === "manage" && <MovementTypeManager types={available} quickIds={quickIds}
          onToggleQuick={(id) => setQuickIds((ids) => toggleSelection(ids, id, MAX_QUICK_MOVEMENTS))}
          onRename={(id) => setPanel({ mode: "rename", id })} onDelete={deleteType} />}
        {(panel?.mode === "more" || panel?.mode === "manage") && <div className="popover-footer">
          <button type="button" className="text-button" onClick={() => setPanel({ mode: "add" })}>+ Add new movement</button>
          <button type="button" className="text-button" onClick={close}>Done</button>
        </div>}
        {(panel?.mode === "add" || renaming) && <InlineTextEditor key={renaming?.id ?? "new"} id="movement-name" label={renaming ? "Rename movement" : "New movement"}
          initialValue={renaming?.name ?? ""} maxLength={40} submitLabel={renaming ? "Save" : "Add"} onSave={saveName} onCancel={close} />}
      </GlassPopover>
    </MuseCard>
  );
}
