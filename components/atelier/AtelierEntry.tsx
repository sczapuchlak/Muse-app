"use client";
import Link from 'next/link';
import {useSyncExternalStore} from 'react';
import {readApplied,serverApplied,subscribeApplied} from '@/lib/atelier/applied';
import {selectTheme} from '@/lib/theme-preference';
import {themeName} from '@/lib/atelier/model';
import {MuseIcon} from '../MuseIcon';
import './Atelier.css';

/** Settings → Appearance → Theme Atelier. The quick theme picker above stays the fast way to switch. */
export function AtelierEntry(){
 const applied=useSyncExternalStore(subscribeApplied,readApplied,serverApplied);
 return <section className="muse-hero muse-atelier-entry" aria-labelledby="atelier-entry-title">
  <p className="muse-kicker">Theme Atelier</p>
  <h2 id="atelier-entry-title">Remix the atmosphere</h2>
  <p>Play with gradients, glow, stars, glass and colour on a live Muse, then keep the versions you love. Nothing changes here until you apply one.</p>
  {applied&&<p className="muse-accent-note">You are wearing <strong>{applied.name}</strong>, a remix of {themeName(applied.definition.base)}.</p>}
  <div className="muse-atelier-entry-actions">
   <Link className="muse-button button-primary muse-edge" href="/appearance/atelier"><MuseIcon name="sparkle" size={16}/>Open Theme Atelier</Link>
   {applied&&<button type="button" className="muse-button muse-edge" onClick={()=>selectTheme(applied.definition.base)}>Return to {themeName(applied.definition.base)}</button>}
  </div>
 </section>;
}
