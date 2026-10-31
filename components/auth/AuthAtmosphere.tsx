"use client";
import {useLayoutEffect,useSyncExternalStore,type ReactNode} from "react";
import {readThemePreference,serverThemePreference,subscribeThemePreference} from "@/lib/theme-preference";
import {readMaterial,serverMaterial,subscribeMaterial} from "@/lib/material-preference";
import {MuseMagicBridge} from "../MuseMagic";
import {MuseAtmosphere} from "../MuseAtmosphere";
import "../AppShell.css";
import "../LoginPreview.css";
export function AuthAtmosphere({children}:{children:ReactNode}){
  const theme=useSyncExternalStore(subscribeThemePreference,readThemePreference,serverThemePreference);
  const material=useSyncExternalStore(subscribeMaterial,readMaterial,serverMaterial);
  useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.material=material;},[theme,material]);
  return <div className="muse-app-shell" data-module="login-preview" data-rail="expanded"><MuseMagicBridge/><MuseAtmosphere/><div className="muse-app-main"><div className="muse-app-content">{children}</div></div></div>;
}
