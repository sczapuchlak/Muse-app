"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { DailyMovement, MovementType } from "@/lib/models";
import { MAX_QUICK_MOVEMENTS, promoteMovement, movementNameError, normalizeMovementName, toggleSelection } from "@/lib/selections";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";
import { InlineTextEditor } from "./InlineTextEditor";
import { MovementTypeManager } from "./MovementTypeManager";
import { GlassPopover } from "./GlassPopover";
import { MuseChoiceMenu } from "./MuseChoiceMenu";
import { movementRows, movementStatuses, type MovementStatus } from "@/lib/movement-status";
import {useWellness} from "./WellnessStore";

import {useMuseSpark} from "./MuseSpark";

type Props = { initialTypes: MovementType[]; initialDay: DailyMovement };
type Panel = { mode: "more" | "add" | "manage" } | { mode: "rename"; id: string } | null;

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
  const renaming = panel?.mode === "rename" ? types.find((type) => type.id === panel.id) : undefined;
  // Durations and categories need the server that stores them (it also reports goal support).
  const supportsDetails=state.goals!==undefined;

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

  // #112 Two rows: what you plan (chips + a multi-select picker), then what happened to each (one status each).
  const rows=movementRows(day,state.activities);
  const statusOptions=movementStatuses.filter(option=>state.movementOutcomes||option.id==='planned'||option.id==='completed').map(option=>({id:option.id,label:option.label}));
  const nameOf=(id:string)=>types.find(type=>type.id===id)?.name??'Movement';
  const locked=!status.loaded||!!status.error;
  function setStatus(typeId:string,next:MovementStatus){
    dispatch({kind:'movement/status',date:initialDay.date,typeId,status:next,id:crypto.randomUUID()});
    if(next==='completed')store.whenSaved(trigger);
  }
  return (
    <MuseCard id="movement" className="movement-card">
      <CardHeading id="movement" title="Movement" icon="movement">
        <button type="button" className="text-button" aria-expanded={panel?.mode === "manage"} aria-controls="movement-menu"
          onClick={(event) => { anchorRef.current = event.currentTarget; setPanel((current) => current?.mode === "manage" ? null : { mode: "manage" }); }}>Manage</button>
      </CardHeading>
      <span className="muse-movement-feedback">{spark}</span>
      <div className="movement-plan-row" role="group" aria-label="Planned movement">
        <span className="movement-row-label">Planned</span>
        <ul className="movement-plan-chips" aria-label="Planned movement types">
          {day.typeIds.map(id=><li key={id}><span className="movement-plan-chip"><span className="chip-label">{nameOf(id)}</span><button type="button" className="movement-chip-remove" aria-label={`Remove ${nameOf(id)} from today’s plan`} disabled={locked} onClick={()=>toggleDay(id)}><MuseIcon name="close" size={12}/></button></span></li>)}
        </ul>
        <button type="button" className="choice-button movement-plan-trigger" aria-haspopup="dialog" aria-expanded={panel?.mode === "more"} aria-controls="movement-menu" disabled={locked}
          onClick={(event) => { anchorRef.current = event.currentTarget; setPanel((current) => current?.mode === "more" ? null : { mode: "more" }); }}>
          {day.typeIds.length?'Edit plan':'Plan movement'}<MuseIcon name="chevron" size={12} />
        </button>
      </div>
      {rows.length>0?<ul className="movement-outcome-rows" aria-label="How it went">
        {rows.map(row=>{const record=state.activities.find(item=>item.date===initialDay.date&&item.typeId===row.typeId);return <li className="movement-outcome-row" key={row.typeId} data-status={row.status}>
          <span className="movement-outcome-name">{nameOf(row.typeId)}{!row.planned&&<span className="small-label"> · not planned</span>}</span>
          {record&&supportsDetails&&<DurationField key={`${record.id}/${record.durationMinutes??''}`} name={nameOf(row.typeId)} value={record.durationMinutes??null} disabled={locked} onSave={value=>dispatch({kind:'activity/duration',id:record.id,durationMinutes:value})}/>}
          <MuseChoiceMenu label={`Status for ${nameOf(row.typeId)}`} valueLabel={movementStatuses.find(option=>option.id===row.status)!.label} options={statusOptions} selectedIds={[row.status]} onSelect={id=>{if(!locked)setStatus(row.typeId,id as MovementStatus);}}/>
        </li>;})}
      </ul>:<p className="small-label movement-outcome-empty">Plan something, then mark how it went. Only Completed counts as movement done.</p>}
      <GlassPopover id="movement-menu" label={panel?.mode==='more'?'Plan movement':'Saved movement types'} open={panel !== null} anchorRef={anchorRef} onClose={() => setPanel(null)} width={panel?.mode === "manage" ? 420 : 340}>
        {panel?.mode === "more" && <>
          <p className="editor-label">Plan movement</p>
          <div className="popover-choice-list">
            {[...quick,...others].map((type) => <button key={type.id} type="button" className="popover-choice" aria-pressed={day.typeIds.includes(type.id)} onClick={() => toggleDay(type.id, !quickIds.includes(type.id))}>
              <span>{type.name}</span>{day.typeIds.includes(type.id) && <MuseIcon name="check" size={15} />}
            </button>)}
            {!available.length && <p className="small-label">Add a movement type to start.</p>}
          </div>
        </>}
        {panel?.mode === "manage" && <MovementTypeManager types={available} quickIds={quickIds}
          onToggleQuick={(id) => setQuickIds((ids) => toggleSelection(ids, id, MAX_QUICK_MOVEMENTS))}
          onRename={(id) => setPanel({ mode: "rename", id })} onDelete={deleteType}
          onCategory={supportsDetails&&state.types.length?(id,category)=>dispatch({kind:'type/category',id,category}):undefined} />}
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

/** Optional minutes for one completed activity. Blank means unknown, never zero. */
function DurationField({name,value,disabled,onSave}:{name:string;value:number|null;disabled:boolean;onSave:(value:number|null)=>void}){
  const [draft,setDraft]=useState(value===null?'':String(value));
  const parsed=draft.trim()===''?null:Number(draft),valid=parsed===null||(Number.isInteger(parsed)&&parsed>=1&&parsed<=1440);
  function commit(){if(valid&&parsed!==value)onSave(parsed);}
  return <label className="muse-movement-duration"><span className="sr-only">Minutes for {name}</span><input type="number" inputMode="numeric" min={1} max={1440} step={1} placeholder="min" value={draft} disabled={disabled} aria-invalid={!valid} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}}/><span aria-hidden="true">min</span></label>;
}
