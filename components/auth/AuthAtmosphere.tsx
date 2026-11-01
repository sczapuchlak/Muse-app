"use client";
import {useLayoutEffect,useSyncExternalStore,type ReactNode} from "react";
import {subscribeThemePreference} from "@/lib/theme-preference";
import {readLoginTheme,serverLoginTheme} from "@/lib/auth/login-appearance";
import {readMaterial,serverMaterial,subscribeMaterial} from "@/lib/material-preference";
import {MuseMagicBridge} from "../MuseMagic";
import {LoginAtmosphere} from "./LoginAtmosphere";
import "../AppShell.css";
import "../LoginPreview.css";
export function AuthAtmosphere({children}:{children:ReactNode}){
  const theme=useSyncExternalStore(subscribeThemePreference,readLoginTheme,serverLoginTheme);
  const material=useSyncExternalStore(subscribeMaterial,readMaterial,serverMaterial);
  useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.material=material;},[theme,material]);
  return <div className="muse-app-shell" data-module="login-preview" data-rail="expanded"><MuseMagicBridge/><LoginAtmosphere neon={theme==='disco-damage'}/><div className="muse-app-main"><div className="muse-app-content">{children}</div></div></div>;
}
