"use client";
import { useId,useRef,useState } from "react";
import { GlassPopover } from "../GlassPopover";
import { MuseIcon } from "../MuseIcon";
import { usePlanner } from "../PlannerStore";
import { PlannerOrganizationPanel } from "./PlannerOrganization";

export function PlannerWorkspaceMenu({workspaceId,onChange}:{workspaceId:string;onChange:(id:string)=>void}) {
  const {state}=usePlanner();
  const [open,setOpen]=useState(false),[manage,setManage]=useState(false);
  const anchor=useRef<HTMLButtonElement>(null),id=useId();
  const label=state.workspaces.find((workspace)=>workspace.id===workspaceId)?.name??"All workspaces";
  function close(){setOpen(false);anchor.current?.focus();}
  const options=[{id:"",name:"All workspaces"},...state.workspaces];
  return <div className="muse-planner-workspaces">
    <button className="muse-button muse-workspace-trigger" type="button" ref={anchor} aria-label={`Workspace: ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>{setManage(false);setOpen((value)=>!value);}}>{label}<MuseIcon name="chevron" size={14}/></button>
    <button className="text-button muse-new-workspace" type="button" onClick={()=>{setManage(true);setOpen(true);}}>+ New workspace</button>
    <GlassPopover id={id} label={manage?"Organize Planner":"Choose a workspace"} open={open} anchorRef={anchor} onClose={()=>setOpen(false)} width={360}>
      {manage?<PlannerOrganizationPanel onClose={close}/>:<><p className="editor-label">Plan from a workspace</p><div className="popover-choice-list" role="group" aria-label="Workspaces">{options.map((option)=><button className="popover-choice" key={option.id} type="button" aria-pressed={option.id===workspaceId} onClick={()=>{onChange(option.id);close();}}><span>{option.name}<small className="small-label"> · {state.tasks.filter((task)=>!task.plannedDate&&(!option.id||task.workspaceId===option.id)).length} unscheduled</small></span>{option.id===workspaceId&&<MuseIcon name="check" size={15}/>}</button>)}</div><div className="popover-footer"><button type="button" className="text-button" onClick={()=>setManage(true)}>+ New workspace</button><button type="button" className="text-button" onClick={()=>setManage(true)}>Manage organization</button></div></>}
    </GlassPopover>
  </div>;
}
