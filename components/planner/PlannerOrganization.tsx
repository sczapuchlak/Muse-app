"use client";
import { useState, type FormEvent } from "react";
import { plannerAccentIds, type PlannerAccent } from "@/lib/planner";
import { usePlanner } from "../PlannerStore";

type Kind = "workspace" | "group" | "tag";
export function PlannerOrganizationPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = usePlanner();
  const [kind, setKind] = useState<Kind>("workspace");
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accent, setAccent] = useState<PlannerAccent>("primary");
  const [workspaceId, setWorkspace] = useState(state.workspaces[0].id);
  const entries = kind === "workspace" ? state.workspaces : kind === "group" ? state.groups : state.tags;
  function reset() { setEditing(null); setName(""); setAccent("primary"); }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const id = editing ?? crypto.randomUUID();
    if (kind === "workspace") dispatch({ type: "workspace/save", workspace: { id, name: name.trim(), accent } });
    if (kind === "group") dispatch({ type: "group/save", group: { id, name: name.trim(), workspaceId } });
    if (kind === "tag") dispatch({ type: "tag/save", tag: { id, name: name.trim().replace(/^#/, ""), accent } });
    reset();
  }
  return <div>
      <div className="muse-organize-tabs" role="group" aria-label="Organization type">{(["workspace", "group", "tag"] as const).map((value) => <button type="button" className="choice-button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); reset(); }}>{value === "workspace" ? "Workspaces" : value === "group" ? "Groups" : "Tags"}</button>)}</div>
      <ul className="muse-organize-list">{entries.map((entry) => {
        const blocked = kind === "workspace" && (state.workspaces.length <= 1 || state.tasks.some((task) => task.workspaceId === entry.id) || state.groups.some((group) => group.workspaceId === entry.id));
        return <li key={entry.id}><span>{entry.name}{"workspaceId" in entry && <small> · {state.workspaces.find((workspace) => workspace.id === entry.workspaceId)?.name}</small>}</span>
          <button type="button" className="text-button" onClick={() => { setEditing(entry.id); setName(entry.name); if ("accent" in entry) setAccent(entry.accent); if ("workspaceId" in entry) setWorkspace(entry.workspaceId); }}>Edit</button>
          <button className="text-button" type="button" disabled={blocked} title={blocked ? "Move tasks and remove groups first; keep at least one workspace" : undefined} onClick={() => { dispatch({ type: `${kind}/delete`, id: entry.id }); if (editing === entry.id) reset(); }}>Delete</button></li>;
      })}</ul>
      {kind === "workspace" && <p className="small-label">Only empty workspaces without groups can be deleted. Keep at least one.</p>}
      <form className="muse-organize-form" onSubmit={save}>
        <label className="editor-label">{editing ? "Rename" : "New"} {kind}<input type="text" required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></label>
        {kind === "group" ? <fieldset className="muse-filter-section"><legend>Workspace</legend><div className="muse-filter-options">{state.workspaces.map((workspace) => <button key={workspace.id} className="choice-button" type="button" aria-pressed={workspaceId === workspace.id} onClick={() => setWorkspace(workspace.id)}>{workspace.name}</button>)}</div></fieldset> : <fieldset className="muse-accent-choices"><legend>Accent</legend>{plannerAccentIds.map((value) => <label data-accent={value} key={value}><input type="radio" name="organization-accent" checked={accent === value} onChange={() => setAccent(value)} /><span className="muse-workspace-dot" />{value === "primary" ? "Signature" : value === "secondary" ? "Companion" : "Contrast"}</label>)}</fieldset>}
        <div className="editor-actions"><button className="muse-button button-primary" type="submit">{editing ? "Save changes" : `Add ${kind}`}</button>{editing && <button className="text-button" type="button" onClick={reset}>Cancel edit</button>}<button className="text-button" type="button" onClick={onClose}>Done</button></div>
      </form>
  </div>;
}
