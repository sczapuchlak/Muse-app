"use client";
import {useSyncExternalStore,type CSSProperties} from 'react';
import {themes} from '@/lib/themes';
import {readThemePreference,serverThemePreference,subscribeThemePreference,selectTheme} from '@/lib/theme-preference';
import {materials,readMaterial,serverMaterial,subscribeMaterial,selectMaterial} from '@/lib/material-preference';
import {MuseIcon} from './MuseIcon';
import './AppearanceSettings.css';

/** The one theme picker: Appearance and first-run onboarding both use it, with the same per-browser preference. */
export function ThemeChoices(){
 const theme=useSyncExternalStore(subscribeThemePreference,readThemePreference,serverThemePreference);
 return <div className="muse-appearance-themes">{themes.map((option)=><button type="button" className="muse-appearance-theme muse-edge" key={option.id} aria-pressed={theme===option.id} onClick={()=>selectTheme(option.id)}><span className="muse-appearance-preview" style={{'--theme-preview':option.preview} as CSSProperties}/><strong>{option.name}</strong><small>{option.subtitle}</small>{theme===option.id&&<MuseIcon name="check" size={17}/>}</button>)}</div>;
}
/** Crystal or Frosted glass, stored in this browser like the theme. */
export function MaterialChoices({label='Glass material'}:{label?:string}){
 const material=useSyncExternalStore(subscribeMaterial,readMaterial,serverMaterial);
 return <div role="group" aria-label={label}>{materials.map((value)=><button className="choice-button" type="button" key={value} aria-pressed={material===value} onClick={()=>selectMaterial(value)}>{value==='crystal'?'Crystal':'Frosted'}</button>)}</div>;
}
