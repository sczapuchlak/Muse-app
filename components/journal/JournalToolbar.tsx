"use client";
import { useRef, useState, type ReactNode } from "react";
import { GlassPopover } from "../GlassPopover";
import { MuseIcon } from "../MuseIcon";
import { MuseMark, type MuseMarkIcon } from "../design/MuseHeading";
import { activeCompanions, activeJournals, useJournal } from "./useJournal";
import { useJournalUi } from "./ui";
import type { Companion, Journal } from "@/lib/journal/model";

/**
 * The compact Journal toolbar (daily-experience brief §6): the current journal, the current companion and
 * preferences, each behind one small control. Used on Today (choose for the next entry) and in a live conversation
 * (switch the companion from the next reply). Never a settings panel.
 */
export function JournalToolbar({ journal, companion, defaultCompanionId, onJournal, onCompanion, onMakeDefault, conversationNote, extra }: {
  journal: Journal | null; companion: Companion | null; defaultCompanionId: string | null;
  onJournal?: (id: string) => void; onCompanion?: (c: Companion) => void; onMakeDefault?: (c: Companion) => void;
  /** In a conversation: what an edit or switch means for the replies. */
  conversationNote?: ReactNode; extra?: ReactNode;
}) {
  const j = useJournal(), ui = useJournalUi();
  const journals = activeJournals(j.state), companions = activeCompanions(j.state);
  return <div className="mj-toolbar" role="toolbar" aria-label="Journal and companion">
    <Menu label="Journal" icon={journal?.icon ?? "journal"} tone={journal?.tone ?? 5} value={journal?.name ?? "Journal"} id="mj-tb-journal">
      {(close) => <>
        {onJournal && journals.length > 1 && <div className="mj-menu-list" role="group" aria-label="Write in">{journals.map((x) => <button key={x.id} type="button" className="popover-choice" aria-pressed={x.id === journal?.id} onClick={() => { onJournal(x.id); close(); }}><span className="mj-menu-item"><MuseMark icon={x.icon as MuseMarkIcon} tone={x.tone} size="sm" />{x.name}</span>{x.id === journal?.id && <MuseIcon name="check" size={14} />}</button>)}</div>}
        <div className="mj-menu-actions">
          <button type="button" className="popover-choice" onClick={() => { close(); ui.editJournal("new"); }}><span className="mj-menu-item"><MuseIcon name="plus" size={15} />New journal</span></button>
          {journal && <button type="button" className="popover-choice" onClick={() => { close(); ui.editJournal(journal); }}><span className="mj-menu-item"><MuseIcon name="edit" size={15} />Rename or edit “{journal.name}”</span></button>}
          <button type="button" className="popover-choice" onClick={() => { close(); ui.openManager(); }}><span className="mj-menu-item"><MuseIcon name="notes" size={15} />Manage journals &amp; companions</span></button>
        </div>
      </>}
    </Menu>
    {j.ai.enabled && companions.length > 0 && <Menu label="Companion" icon={companion?.icon ?? "sparkle"} tone={companion?.tone ?? 6} value={companion?.name ?? "Companion"} id="mj-tb-companion">
      {(close) => <>
        {onCompanion && <div className="mj-menu-list" role="group" aria-label="Talk with">{companions.map((c) => <button key={c.id} type="button" className="popover-choice" aria-pressed={c.id === companion?.id} onClick={() => { onCompanion(c); close(); }}>
          <span className="mj-menu-item"><MuseMark icon={c.icon as MuseMarkIcon} tone={c.tone} size="sm" /><span>{c.name}{c.id === defaultCompanionId && <small className="type-meta"> · default</small>}</span></span>{c.id === companion?.id && <MuseIcon name="check" size={14} />}</button>)}</div>}
        {conversationNote && <p className="mj-menu-note type-meta">{conversationNote}</p>}
        <button type="button" role="switch" aria-checked={j.state.prefs.greetOnNew} className="popover-choice mj-menu-switch" onClick={() => void j.savePrefs({ ...j.state.prefs, greetOnNew: !j.state.prefs.greetOnNew })}>
          <span className="mj-menu-item"><MuseIcon name="sparkle" size={15} />Start new entries with a greeting</span><span className="mj-switch" aria-hidden="true" />
        </button>
        <div className="mj-menu-actions">
          {companion && onMakeDefault && companion.id !== defaultCompanionId && <button type="button" className="popover-choice" onClick={() => { onMakeDefault(companion); close(); }}><span className="mj-menu-item"><MuseIcon name="favorite" size={15} />Make {companion.name} my default</span></button>}
          {companion && <button type="button" className="popover-choice" onClick={() => { close(); ui.openStudio(companion.id); }}><span className="mj-menu-item"><MuseIcon name="edit" size={15} />Customize &amp; test {companion.name}</span></button>}
          <button type="button" className="popover-choice" onClick={() => { close(); ui.openStudio("new"); }}><span className="mj-menu-item"><MuseIcon name="plus" size={15} />New companion</span></button>
        </div>
      </>}
    </Menu>}
    {extra}
    <button type="button" className="muse-button button-ghost mj-tb-settings" onClick={ui.openSettings} aria-label="Journal preferences" title="Preferences"><MuseIcon name="gear" size={17} /><span className="mj-tb-label">Preferences</span></button>
  </div>;
}

function Menu({ label, icon, tone, value, id, children }: { label: string; icon: string; tone: number; value: string; id: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false), anchor = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={anchor} type="button" className="mj-tb-button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label={`${label}: ${value}`} onClick={() => setOpen(!open)}>
      <MuseMark icon={icon as MuseMarkIcon} tone={tone as 1} size="sm" /><span className="mj-tb-text"><small className="type-meta">{label}</small><span className="mj-tb-value">{value}</span></span><MuseIcon name="chevron" size={13} />
    </button>
    <GlassPopover id={id} label={label} title={label} open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={300}>{children(() => setOpen(false))}</GlassPopover>
  </>;
}
