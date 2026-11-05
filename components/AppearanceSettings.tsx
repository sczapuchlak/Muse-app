"use client";
import {MusePageHeader} from './MusePageHeader';
import {ThemeChoices,MaterialChoices} from './AppearanceChoices';
import './AppearanceSettings.css';
import {MuseMagicSettings} from './MuseMagic';
export function AppearanceSettings(){
 return <main className="muse-page"><MusePageHeader title="Appearance" description="Make yourself quite at home."/><section aria-labelledby="appearance-themes"><h2 id="appearance-themes" className="editor-label">Your kind of atmosphere</h2><ThemeChoices/></section><section aria-labelledby="appearance-material" className="muse-appearance-material"><h2 id="appearance-material" className="editor-label">Glass material</h2><MaterialChoices/><p className="small-label">Theme and glass preferences are stored in this browser. Your layout stays yours.</p></section><MuseMagicSettings/></main>;
}
