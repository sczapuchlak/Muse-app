"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ContextTag } from "@/lib/models";
import { MAX_CONTEXT_TAGS, toggleSelection } from "@/lib/selections";
import { MuseIcon } from "./MuseIcon";
import { GlassPopover } from "./GlassPopover";

type Props = { label: string; tags: ContextTag[]; selectedIds: string[]; onChange: (ids: string[]) => void };
export function TagSelector({ label, tags, selectedIds, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [quickCount, setQuickCount] = useState(5);
  const fieldRef = useRef<HTMLFieldSetElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const quick = tags.slice(0, quickCount);
  const others = tags.slice(quickCount);
  useLayoutEffect(() => {
    if (!fieldRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setQuickCount(width >= 520 ? 5 : width >= 430 ? 4 : 3);
    });
    observer.observe(fieldRef.current);
    return () => observer.disconnect();
  }, []);
  function tagButton(tag: ContextTag, menu = false) {
    const selected = selectedIds.includes(tag.id);
    return <button type="button" key={tag.id} className={menu ? "popover-choice" : "choice-button tag-chip"} aria-pressed={selected}
      disabled={selectedIds.length >= MAX_CONTEXT_TAGS && !selected} onClick={() => onChange(toggleSelection(selectedIds, tag.id, MAX_CONTEXT_TAGS))}>
      <span>{tag.name}</span>{selected && <MuseIcon name="check" size={12} />}
    </button>;
  }
  return (
    <fieldset ref={fieldRef} className="tag-selector">
      <legend>{label}<span className="selection-count" aria-live="polite" aria-label={`${selectedIds.length} of ${MAX_CONTEXT_TAGS} tags selected`}>{selectedIds.length}/{MAX_CONTEXT_TAGS}</span></legend>
      <div className="tag-options">{quick.map((tag) => tagButton(tag))}
        {others.length > 0 && <button ref={anchorRef} type="button" className="choice-button tag-chip" aria-expanded={open} aria-controls="influence-menu" onClick={() => setOpen((value) => !value)}>
          More{others.some((tag) => selectedIds.includes(tag.id)) && <span className="more-count">{others.filter((tag) => selectedIds.includes(tag.id)).length}</span>}<MuseIcon name="chevron" size={12} />
        </button>}
      </div>
      <GlassPopover id="influence-menu" label="More influences" open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} width={260} align="end">
        <p className="editor-label">More influences</p><div className="popover-choice-list">{others.map((tag) => tagButton(tag, true))}</div>
        <button type="button" className="text-button" onClick={() => { setOpen(false); anchorRef.current?.focus(); }}>Done</button>
      </GlassPopover>
    </fieldset>
  );
}
