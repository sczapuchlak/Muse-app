"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { themes } from "@/lib/themes";
import { MuseStar } from "./MuseStar";
import { MuseIcon } from "./MuseIcon";
import { GlassPopover } from "./GlassPopover";
import "./ThemeSwitcher.css";

/** Arrow/Home/End roving focus across a theme list; Tab closes. Shared by every theme menu. */
export function themeListKeys(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === "Tab") { close(); return; }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
  options[next]?.focus();
}

/** The theme rows (orb, name, subtitle, check) used by the sidebar Themes menu and the profile theme picker. */
/** `applied` marks a custom Atelier theme as active, so no official theme shows as checked. */
export function ThemeOptions({ value, onSelect, applied = false }: { value: string; onSelect: (id: string) => void; applied?: boolean }) {
  return <>{themes.map((theme) => (
    <button key={theme.id} type="button" className="muse-theme-option muse-edge" role="menuitemradio" tabIndex={-1}
      data-popover-autofocus={theme.id === value ? "true" : undefined} aria-checked={!applied && value === theme.id}
      onClick={() => onSelect(theme.id)}>
      <span className="muse-theme-orb" style={{ "--theme-orb": theme.preview } as CSSProperties} aria-hidden="true" />
      <span className="muse-theme-name"><span>{theme.name}{"family" in theme && <MuseStar size={14} color="pink" />}</span><small>{theme.subtitle}</small></span>
      {!applied && value === theme.id && <MuseIcon name="check" size={16} />}
    </button>
  ))}</>;
}

/** A form field that picks a theme without applying it to the person's own Muse (e.g. a profile's theme). */
export function ThemeSelect({ value, onChange, label }: { value: string; onChange: (id: string) => void; label: string }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active = themes.find((theme) => theme.id === value) ?? themes[0];
  return (
    <div className="muse-theme-root muse-theme-select">
      <button ref={triggerRef} type="button" className="muse-theme-trigger muse-edge" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={`${label}: ${active.name}`}
        onClick={() => setOpen((v) => !v)} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}>
        <span className="muse-theme-orb" style={{ "--theme-orb": active.preview } as CSSProperties} aria-hidden="true" />
        <span className="muse-theme-active-name">{active.name}</span><MuseIcon name="chevron" size={14} />
      </button>
      <GlassPopover id={menuId} label={label} role="menu" open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} width={310}>
        <div className="muse-theme-list" onKeyDown={(event) => themeListKeys(event, () => setOpen(false))}>
          <ThemeOptions value={value} onSelect={(id) => { onChange(id); setOpen(false); triggerRef.current?.focus(); }} />
        </div>
      </GlassPopover>
    </div>
  );
}
