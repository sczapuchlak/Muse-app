"use client";
import {MusePageHeader} from './MusePageHeader';
import {ThemeChoices,MaterialChoices} from './AppearanceChoices';
import {offeredMaterials} from '@/lib/material-preference';
import './AppearanceSettings.css';
import {MuseMagicSettings} from './MuseMagic';
import {MobileDensitySettings} from './MobileDensity';
import {AtelierEntry} from './atelier/AtelierEntry';
import Link from 'next/link';
export function AppearanceSettings(){
 return <main className="muse-page"><MusePageHeader title="Appearance" description="Make yourself quite at home."/><section aria-labelledby="appearance-themes"><h2 id="appearance-themes" className="editor-label">Your kind of atmosphere</h2><ThemeChoices/></section><section aria-labelledby="appearance-material" className="muse-appearance-material">{offeredMaterials.length>1&&<><h2 id="appearance-material" className="editor-label">Glass material</h2><MaterialChoices/></>}<p className="small-label" id={offeredMaterials.length>1?undefined:"appearance-material"}>Your theme {offeredMaterials.length>1?"and glass follow":"follows"} you to every device you sign in on. Your layout stays yours.</p></section><section aria-labelledby="appearance-review" className="muse-appearance-review"><h2 id="appearance-review" className="editor-label">Theme review</h2><p className="small-label">Compare the renovated and new themes, and the Lab palettes, on your real screens.</p><Link className="muse-button" href="/appearance/review">Open theme review</Link></section><AtelierEntry/><MuseMagicSettings/><MobileDensitySettings/></main>;
}
