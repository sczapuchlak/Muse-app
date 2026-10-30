"use client";

import { useEffect, useRef, useState } from "react";

type EditableTextProps = {
  value: string;
  label: string;
  onSave: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  allowEmpty?: boolean;
  className?: string;
};

/** Shared direct editing for priority titles and daily meal assignments. */
export function EditableText({ value, label, onSave, placeholder = "Add a value", maxLength = 120, allowEmpty = false, className = "" }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const finished = useRef(false);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (restoreFocus.current) {
      triggerRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [editing]);

  function finish(save: boolean, focusTrigger: boolean) {
    if (finished.current) return;
    finished.current = true;
    const trimmed = draft.trim();
    if (save && (allowEmpty || trimmed) && trimmed !== value) onSave(trimmed);
    restoreFocus.current = focusTrigger;
    setEditing(false);
  }

  return (
    <span className={`editable-text ${className}`}>
      {editing ? <input
        ref={inputRef} className="inline-edit-input" type="text" value={draft} maxLength={maxLength}
        aria-label={label} onChange={(event) => setDraft(event.target.value)} onBlur={() => finish(true, false)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finish(event.key === "Enter", true);
          }
        }}
      /> : <button ref={triggerRef} type="button" className="inline-edit-value" aria-label={`${label}: ${value || "not assigned"}`}
        onClick={() => { setDraft(value); finished.current = false; setEditing(true); }}>
        {value || <span className="inline-edit-placeholder">{placeholder}</span>}
      </button>}
    </span>
  );
}
