"use client";
import { useState } from "react";
import { MuseDrawer } from "../MuseDrawer";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import { ritualGradients, type RitualGradient, type RitualAccent } from "@/lib/rituals";
import { useRituals } from "./RitualStore";
const icons: MuseIconName[] = ["rituals", "movement", "moon", "home", "notes", "mood"];
export function RitualGroupManager({ returnFocus, onClose }: { returnFocus: HTMLElement; onClose: () => void }) {
  const { state, dispatch } = useRituals();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accent, setAccent] = useState<RitualAccent>("primary");
  const [gradient, setGradient] = useState<RitualGradient>("primary-secondary");
  const [icon, setIcon] = useState<MuseIconName>("rituals");
  function reset() { setEditing(null); setName(""); }
  return <MuseDrawer title="Your ritual groups" onClose={onClose} returnFocus={returnFocus}>
    <div className="muse-ritual-form"><ul className="muse-ritual-managed-groups">{state.groups.map((group) => {
      const occupied = state.rituals.some((ritual) => ritual.groupId === group.id) || state.groups.length <= 1;
      return <li key={group.id} data-accent={group.accent}><span className="muse-ritual-group-icon"><MuseIcon name={group.icon} /></span><span>{group.name}</span><button className="text-button" type="button" onClick={() => { setEditing(group.id); setName(group.name); setAccent(group.accent); setIcon(group.icon); setGradient(group.gradient ?? (group.accent === "primary" ? "primary-secondary" : group.accent === "secondary" ? "secondary-pop" : "pop-primary")); }}>Edit</button><button className="text-button" type="button" disabled={occupied} title={occupied ? "Move rituals first; keep at least one group" : undefined} onClick={() => { dispatch({ type: "group/delete", id: group.id }); if (editing === group.id) reset(); }}>Delete</button></li>;
    })}</ul><p className="small-label">Groups are yours to name. Only empty groups can be deleted; keep at least one.</p>
      <form className="muse-ritual-form" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; dispatch({ type: "group/save", group: { id: editing ?? crypto.randomUUID(), name, accent, gradient, icon, collapsed: state.groups.find((group) => group.id === editing)?.collapsed ?? false } }); reset(); }}>
        <label className="editor-label">{editing ? "Group name" : "New group"}<input data-drawer-autofocus type="text" required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <fieldset><legend>Accent</legend><div className="muse-form-choice-list">{(["primary", "secondary", "pop"] as const).map((value) => <button key={value} type="button" className="choice-button" data-accent={value} aria-pressed={accent === value} onClick={() => setAccent(value)}><span className="muse-workspace-dot" />{value === "primary" ? "Signature" : value === "secondary" ? "Companion" : "Contrast"}</button>)}</div></fieldset>
        <fieldset><legend>Banner gradient</legend><div className="muse-form-choice-list">{ritualGradients.map((value) => <button key={value} type="button" className="choice-button muse-gradient-choice" data-gradient={value} aria-pressed={gradient === value} onClick={() => setGradient(value)}><span className="muse-gradient-preview" aria-hidden="true" />{value === "primary-secondary" ? "Signature / companion" : value === "secondary-pop" ? "Companion / contrast" : "Contrast / signature"}</button>)}</div></fieldset>
        <fieldset><legend>Icon</legend><div className="muse-form-choice-list">{icons.map((value) => <button key={value} type="button" className="choice-button" aria-label={`${value} icon`} aria-pressed={icon === value} onClick={() => setIcon(value)}><MuseIcon name={value} size={19} /></button>)}</div></fieldset>
        <div className="editor-actions"><button className="muse-button button-primary" type="submit" disabled={!name.trim()}>{editing ? "Save group" : "Add group"}</button>{editing && <button className="text-button" type="button" onClick={reset}>Cancel edit</button>}</div>
      </form>
    </div>
  </MuseDrawer>;
}
