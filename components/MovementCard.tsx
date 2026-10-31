"use client";

import { useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import type { DailyMovement, MovementType } from "@/lib/models";
import { MAX_QUICK_MOVEMENTS, promoteMovement, movementNameError, normalizeMovementName, toggleSelection } from "@/lib/selections";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";
import { InlineTextEditor } from "./InlineTextEditor";
import { MovementTypeManager } from "./MovementTypeManager";
import { GlassPopover } from "./GlassPopover";
import {useWellness} from "./WellnessStore";

import {useMuseSpark} from "./MuseSpark";

type Props = { initialTypes: MovementType[]; initialDay: DailyMovement };
type Panel = { mode: "more" | "add" | "manage" | "completion" } | { mode: "rename"; id: string } | null;

export function MovementCard({ initialTypes, initialDay }: Props) {
  const {trigger,spark}=useMuseSpark();
  const {state,dispatch,status}=useWellness();
  const types=state.types.length?state.types:initialTypes;
  const quickIds=state.types.length?state.quickIds:initialTypes.filter(type=>type.source==='starter').slice(0,MAX_QUICK_MOVEMENTS).map(type=>type.id);
  const recentIds=state.recentIds;
  const day=state.movement.find(day=>day.date===initialDay.date)??{date:initialDay.date,typeIds:[]};
  // Compose all parts against the latest optimistic state, not stale render closures.
  const {store}=useWellness();
  function updatePart<K extends 'types'|'quickIds'|'recentIds'|'day'>(key:K,next:SetStateAction<{types:MovementType[];quickIds:string[];recentIds:string[];day:DailyMovement}[K]>){
    const current=store.getSnapshot().state;
    const value={types:current.types.length?current.types:initialTypes,quickIds:current.types.length?current.quickIds:quickIds,recentIds:current.recentIds,day:current.movement.find(d=>d.date===initialDay.date)??{date:initialDay.date,typeIds:[]}};
    const previous=value[key];
    const updated=typeof next==='function'?(next as (v:typeof previous)=>typeof previous)(previous):next;
    dispatch({kind:'movement',...value,day:undefined,[key]:updated});
  }
  const setTypes:Dispatch<SetStateAction<MovementType[]>>=next=>updatePart('types',next);
  const setQuickIds:Dispatch<SetStateAction<string[]>>=next=>updatePart('quickIds',next);
  const setRecentIds:Dispatch<SetStateAction<string[]>>=next=>updatePart('recentIds',next);
  const setDay:Dispatch<SetStateAction<DailyMovement>>=next=>updatePart('day',next);
  const [panel, setPanel] = useState<Panel>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const available = types.filter((type) => !type.archived);
  const quick = quickIds.map((id) => available.find((type) => type.id === id)).filter((type): type is MovementType => Boolean(type));
  const others = available.filter((type) => !quickIds.includes(type.id));
  const selectedNames = types.filter((type) => day.typeIds.includes(type.id)).map((type) => type.name).join(", ");
  const recorded=state.activities.filter(item=>item.date===initialDay.date);
  const completionIds=[...new Set([...day.typeIds,...recorded.map(item=>item.typeId)])];
  const completedNames=recorded.map(item=>types.find(type=>type.id===item.typeId)?.name).filter(Boolean).join(', ');
  function setCompleted(typeId:string,complete:boolean){
    dispatch({kind:'movement/complete',date:initialDay.date,typeId,complete,id:crypto.randomUUID()});
    if(complete)store.whenSaved(trigger);
  }
  const renaming = panel?.mode === "rename" ? types.find((type) => type.id === panel.id) : undefined;

  function close() { setPanel(null); anchorRef.current?.focus(); }
  function selectIntoShelf(id: string) {
    setQuickIds((ids) => promoteMovement(ids, id, recentIds, day.typeIds));
    setRecentIds((ids) => [id, ...ids.filter((value) => value !== id)]);
  }
  function toggleDay(id: string, fromOverflow = false) {
    if (!day.typeIds.includes(id)) {
      trigger();
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
      <span className="muse-movement-feedback">{spark}</span><div className="movement-selection-status"><p className="card-description movement-selection-summary" title={selectedNames || "Today’s intention · Select any"}>{selectedNames ? `Selected: ${selectedNames}` : "Today’s intention · Select any"}{completedNames&&<span className="small-label"> · Completed: {completedNames}</span>}</p><button type="button" className="text-button" disabled={!completionIds.length||!status.loaded||!!status.error} aria-expanded={panel?.mode==='completion'} aria-controls="movement-menu" onClick={event=>{anchorRef.current=event.currentTarget;setPanel({mode:'completion'});}}>{recorded.length?'Review done':'Mark Done'}</button></div>
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
      <GlassPopover id="movement-menu" label={panel?.mode==='completion'?'Movement completion':'Saved movement types'} open={panel !== null} anchorRef={anchorRef} onClose={() => setPanel(null)} width={panel?.mode === "manage" ? 420 : 340}>
        {panel?.mode==='completion'&&<><p className="editor-label">Movement · {initialDay.date}</p><p className="small-label">Selection is an intention. Mark what you actually did.</p><div className="popover-choice-list">{completionIds.map(id=>{const done=recorded.some(item=>item.typeId===id);return <div className="popover-footer" key={id}><span>{types.find(type=>type.id===id)?.name??'Movement'}{done&&<span className="small-label"> · Done</span>}</span><button type="button" className="text-button" disabled={!status.loaded||!!status.error} aria-label={`${done?'Undo completion for':'Mark done:'} ${types.find(type=>type.id===id)?.name??'movement'}`} onClick={()=>setCompleted(id,!done)}>{done?'Undo':'Mark Done'}</button></div>;})}</div><div className="popover-footer"><button type="button" className="text-button" onClick={close}>Close</button></div></>}
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
