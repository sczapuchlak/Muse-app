"use client";

import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { themeEntry, type ThemeId } from "@/lib/themes";
import { readThemePreference, selectTheme, serverThemePreference, subscribeThemePreference } from "@/lib/theme-preference";
import { readThemeOverride, serverThemeOverride, subscribeThemeOverride } from "@/lib/theme-override";
import { materials, readMaterial, selectMaterial, serverMaterial, subscribeMaterial } from "@/lib/material-preference";
import {readMagic,serverMagic,subscribeMagic,magicLevels,selectMagic} from "@/lib/magic-preference";
import { readApplied, serverApplied, subscribeApplied } from "@/lib/atelier/applied";
import { MuseIcon } from "./MuseIcon";
import { GlassPopover } from "./GlassPopover";
import { SoundToggle } from "./MuseMagic";
import { ThemeOptions, themeListKeys } from "./ThemeOptions";
import "./ThemeSwitcher.css";

/** `variant="nav"` renders the sidebar "Themes" utility row; the default pill shows the active theme name. */
export function ThemeSwitcher({compact=false,variant="pill"}:{compact?:boolean;variant?:"pill"|"nav"|"dock"}) {
  const menuId=useId();
  const [open, setOpen] = useState(false);
  const activeId = useSyncExternalStore(subscribeThemePreference, readThemePreference, serverThemePreference);
  const magic=useSyncExternalStore(subscribeMagic,readMagic,serverMagic);
  const material = useSyncExternalStore(subscribeMaterial, readMaterial, serverMaterial);
  // Effects write the live stored values: during hydration the hooks briefly hold the server default, which would flash.
  useLayoutEffect(() => { document.documentElement.setAttribute("data-material", readMaterial()); }, [material]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const applied = useSyncExternalStore(subscribeApplied, readApplied, serverApplied);
  const official = themeEntry(activeId);
  const active = applied ? { ...official, name: applied.name } : official;
  // A profile being viewed may lend the page its theme; the person's own choice returns when they leave.
  const override = useSyncExternalStore(subscribeThemeOverride, readThemeOverride, serverThemeOverride);
  useLayoutEffect(() => { document.documentElement.setAttribute("data-theme", readThemeOverride() ?? readThemePreference()); }, [activeId, override]);
  function close() { setOpen(false); triggerRef.current?.focus(); }

  return (
    <div className="muse-theme-root" data-compact={compact} data-variant={variant}>
      <button ref={triggerRef} className="muse-theme-trigger muse-edge" type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={`Theme: ${active.name}. Change theme or material`} title={variant==="dock"?`Themes · ${active.name}`:compact?(variant==="nav"?`Themes · ${active.name}`:active.name):undefined}
        onClick={() => setOpen((value) => !value)} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
        }}>
        {variant==="dock"?<><MuseIcon name="themes" size={19} treatment="prismatic" /><span className="muse-theme-orb muse-dock-orb" style={{ "--theme-orb": active.preview } as CSSProperties} aria-hidden="true" /></>:variant==="nav"?<><MuseIcon name="themes" size={20} treatment="prismatic" /><span className="muse-theme-active-name">Themes</span><span className="muse-theme-orb" style={{ "--theme-orb": active.preview } as CSSProperties} aria-hidden="true" /></>
          :<><span className="muse-theme-orb" style={{ "--theme-orb": active.preview } as CSSProperties} aria-hidden="true" /><span className="muse-theme-active-name">{active.name}</span></>}<MuseIcon name="chevron" size={14} />
      </button>
      <GlassPopover id={menuId} label="Muse themes" role="menu" open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} width={310} align="end">
        <div className="muse-theme-list" onKeyDown={(event) => themeListKeys(event, () => setOpen(false))}>
          <ThemeOptions value={activeId} applied={!!applied} onSelect={(id) => { selectTheme(id as ThemeId); close(); }} />
          <div className="muse-theme-materials" role="group" aria-label="Glass material"><p className="small-label">Glass material</p>{materials.map((value) => <button key={value} type="button" className="muse-theme-option muse-edge" role="menuitemradio" tabIndex={-1} aria-label={`${value === "crystal" ? "Crystal" : "Frosted"} glass`} aria-checked={material === value} onClick={() => selectMaterial(value)}><span className="muse-material-swatch" data-material={value} aria-hidden="true" /><span>{value === "crystal" ? "Crystal" : "Frosted"}</span>{material === value && <MuseIcon name="check" size={16} />}</button>)}</div>
        </div>
        <div className="muse-theme-materials"><p className="editor-label">Muse Magic</p><div role="group" aria-label="Muse Magic">{magicLevels.map(value=><button key={value} type="button" className="choice-button" aria-pressed={magic===value} onClick={()=>selectMagic(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div><p className="small-label">Your device’s reduced-motion preference takes priority.</p><SoundToggle/></div>
      </GlassPopover>
    </div>
  );
}
