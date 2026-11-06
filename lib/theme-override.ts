"use client";
/**
 * A temporary, page-scoped theme: while someone's profile is on screen the whole page wears that profile's theme,
 * and leaving restores the visitor's own theme. Nothing is saved; the person's own theme and Crystal/Frosted
 * preference are never touched.
 */
import {useLayoutEffect} from 'react';
import {isThemeId,type ThemeId} from './themes';

let current:ThemeId|null=null;const listeners=new Set<()=>void>();
export const readThemeOverride=()=>current;
export const serverThemeOverride=():ThemeId|null=>null;
export function subscribeThemeOverride(update:()=>void){listeners.add(update);return()=>{listeners.delete(update);};}
function set(value:ThemeId|null){if(value===current)return;current=value;listeners.forEach(update=>update());}
/** Wear `theme` while the calling component is mounted. Pass null to wear the person's own theme. */
export function useThemeOverride(theme:string|null|undefined){
 useLayoutEffect(()=>{const value=theme&&isThemeId(theme)?theme:null;set(value);return()=>set(null);},[theme]);
}
