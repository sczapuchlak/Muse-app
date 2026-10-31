"use client";
import {useSyncExternalStore,type CSSProperties} from 'react';
import {themes} from '@/lib/themes';
import {readThemePreference,serverThemePreference,subscribeThemePreference,selectTheme} from '@/lib/theme-preference';
import {materials,readMaterial,serverMaterial,subscribeMaterial,selectMaterial} from '@/lib/material-preference';
import {MusePageHeader} from './MusePageHeader';
import {MuseIcon} from './MuseIcon';
import './AppearanceSettings.css';
import {MuseMagicSettings} from './MuseMagic';
export function AppearanceSettings(){const theme=useSyncExternalStore(subscribeThemePreference,readThemePreference,serverThemePreference),material=useSyncExternalStore(subscribeMaterial,readMaterial,serverMaterial);
 return <main className="muse-page"><MusePageHeader title="Appearance" description="Make yourself quite at home."/><section aria-labelledby="appearance-themes"><h2 id="appearance-themes" className="editor-label">Your kind of atmosphere</h2><div className="muse-appearance-themes">{themes.map((option)=><button type="button" className="muse-appearance-theme muse-edge" key={option.id} aria-pressed={theme===option.id} onClick={()=>selectTheme(option.id)}><span className="muse-appearance-preview" style={{'--theme-preview':option.preview} as CSSProperties}/><strong>{option.name}</strong><small>{option.subtitle}</small>{theme===option.id&&<MuseIcon name="check" size={17}/>}</button>)}</div></section><section aria-labelledby="appearance-material" className="muse-appearance-material"><h2 id="appearance-material" className="editor-label">Glass material</h2><div>{materials.map((value)=><button className="choice-button" type="button" key={value} aria-pressed={material===value} onClick={()=>selectMaterial(value)}>{value==='crystal'?'Crystal':'Frosted'}</button>)}</div><p className="small-label">Theme and glass preferences are stored in this browser. Your layout stays yours.</p></section><MuseMagicSettings/></main>;
}
