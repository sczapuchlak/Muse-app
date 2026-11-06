"use client";

import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { defaultTheme, themes } from "@/lib/themes";
import { readThemePreference, selectTheme, serverThemePreference, subscribeThemePreference } from "@/lib/theme-preference";
import { readThemeOverride, serverThemeOverride, subscribeThemeOverride } from "@/lib/theme-override";
import { materials, readMaterial, selectMaterial, serverMaterial, subscribeMaterial } from "@/lib/material-preference";
import {readMagic,serverMagic,subscribeMagic,magicLevels,selectMagic} from "@/lib/magic-preference";
import { MuseStar } from "./MuseStar";
import { MuseIcon } from "./MuseIcon";
import { GlassPopover } from "./GlassPopover";
import "./ThemeSwitcher.css";

/** `variant="nav"` renders the sidebar "Themes" utility row; the default pill shows the active theme name. */
export function ThemeSwitcher({compact=false,variant="pill"}:{compact?:boolean;variant?:"pill"|"nav"}) {
  const menuId=useId();
  const [open, setOpen] = useState(false);
  const activeId = useSyncExternalStore(subscribeThemePreference, readThemePreference, serverThemePreference);
  const magic=useSyncExternalStore(subscribeMagic,readMagic,serverMagic);
  const material = useSyncExternalStore(subscribeMaterial, readMaterial, serverMaterial);
  useLayoutEffect(() => { document.documentElement.setAttribute("data-material", material); }, [material]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active = themes.find((theme) => theme.id === activeId) ?? defaultTheme;
  // A profile being viewed may lend the page its theme; the person's own choice returns when they leave.
  const override = useSyncExternalStore(subscribeThemeOverride, readThemeOverride, serverThemeOverride);
  useLayoutEffect(() => { document.documentElement.setAttribute("data-theme", override ?? activeId); }, [activeId, override]);
  function close() { setOpen(false); triggerRef.current?.focus(); }

  return (
    <div className="muse-theme-root" data-compact={compact} data-variant={variant}>
      <button ref={triggerRef} className="muse-theme-trigger muse-edge" type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={`Theme: ${active.name}. Change theme or material`} title={compact?(variant==="nav"?`Themes · ${active.name}`:active.name):undefined}
        onClick={() => setOpen((value) => !value)} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
        }}>
        {variant==="nav"?<><MuseIcon name="themes" size={20} treatment="prismatic" /><span className="muse-theme-active-name">Themes</span><span className="muse-theme-orb" style={{ "--theme-orb": active.preview } as CSSProperties} aria-hidden="true" /></>
          :<><span className="muse-theme-orb" style={{ "--theme-orb": active.preview } as CSSProperties} aria-hidden="true" /><span className="muse-theme-active-name">{active.name}</span></>}<MuseIcon name="chevron" size={14} />
      </button>
      <GlassPopover id={menuId} label="Muse themes" role="menu" open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} width={310} align="end">
        <div className="muse-theme-list" onKeyDown={(event) => {
          if (event.key === "Tab") { setOpen(false); return; }
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
          const index = options.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
          options[next]?.focus();
        }}>
          {themes.map((theme) => (
            <button key={theme.id} type="button" className="muse-theme-option muse-edge" role="menuitemradio" tabIndex={-1}
              data-popover-autofocus={theme.id === activeId ? "true" : undefined} aria-checked={activeId === theme.id}
              onClick={() => { selectTheme(theme.id); close(); }}>
              <span className="muse-theme-orb" style={{ "--theme-orb": theme.preview } as CSSProperties} aria-hidden="true" />
              <span className="muse-theme-name"><span>{theme.name}{"family" in theme&&<MuseStar size={14} color="pink"/>}</span><small>{theme.subtitle}</small></span>
              {activeId === theme.id && <MuseIcon name="check" size={16} />}
            </button>
          ))}
          <div className="muse-theme-materials" role="group" aria-label="Glass material"><p className="small-label">Glass material</p>{materials.map((value) => <button key={value} type="button" className="muse-theme-option muse-edge" role="menuitemradio" tabIndex={-1} aria-label={`${value === "crystal" ? "Crystal" : "Frosted"} glass`} aria-checked={material === value} onClick={() => selectMaterial(value)}><span className="muse-material-swatch" data-material={value} aria-hidden="true" /><span>{value === "crystal" ? "Crystal" : "Frosted"}</span>{material === value && <MuseIcon name="check" size={16} />}</button>)}</div>
        </div>
        <div className="muse-theme-materials"><p className="editor-label">Muse Magic</p><div role="group" aria-label="Muse Magic">{magicLevels.map(value=><button key={value} type="button" className="choice-button" aria-pressed={magic===value} onClick={()=>selectMagic(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div><p className="small-label">Your device’s reduced-motion preference takes priority.</p></div>
      </GlassPopover>
    </div>
  );
}
