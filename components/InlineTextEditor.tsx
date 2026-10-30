"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type InlineTextEditorProps = {
  id: string;
  label: string;
  initialValue: string;
  maxLength: number;
  submitLabel?: string;
  onSave: (value: string) => string | null;
  onCancel: () => void;
};

export function InlineTextEditor({ id, label, initialValue, maxLength, submitLabel = "Save", onSave, onCancel }: InlineTextEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(onSave(value.trim()));
  }

  return (
    <form className="inline-text-editor" onSubmit={submit} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
    }}>
      <label htmlFor={id} className="editor-label">{label}</label>
      <div className="inline-editor-controls">
        <input ref={inputRef} type="text" id={id} value={value} maxLength={maxLength}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => { setValue(event.target.value); setError(null); }} />
        <button type="submit" className="muse-button button-primary">{submitLabel}</button>
        <button type="button" className="text-button" onClick={onCancel}>Cancel</button>
      </div>
      {error && <p className="input-error" id={`${id}-error`} role="alert">{error}</p>}
    </form>
  );
}
