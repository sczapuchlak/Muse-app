"use client";
import './MuseMagic.css';
import {useEffect,useSyncExternalStore} from 'react';
import {readMagic,serverMagic,subscribeMagic,magicLevels,selectMagic} from '@/lib/magic-preference';
import {readSound,serverSound,subscribeSound,selectSound} from '@/lib/sound-preference';
import {playSound} from '@/lib/muse-sound';
export function MuseMagicBridge(){const level=useSyncExternalStore(subscribeMagic,readMagic,serverMagic);useEffect(()=>{document.documentElement.dataset.magic=level;},[level]);return null;}
export function MuseMagicSettings(){const level=useSyncExternalStore(subscribeMagic,readMagic,serverMagic);return <section className="muse-appearance-material" aria-labelledby="muse-magic-title"><h2 className="editor-label" id="muse-magic-title">Muse Magic ✦</h2><p>How much sparkle belongs in your day?</p><div role="group" aria-label="Muse Magic">{magicLevels.map(value=><button className="choice-button" key={value} type="button" aria-pressed={value===level} onClick={()=>selectMagic(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div><p className="small-label">{level==='quiet'?'Quiet keeps color and state feedback, with fewer flourishes.':level==='extra'?'A little more light for meaningful milestones.':'Small sparks, with room to breathe.'} Your device’s reduced-motion preference always takes priority.</p><SoundToggle/></section>;}
/** Sound effects: separate from sparkle and from reduced motion. Off until the person turns it on. */
export function SoundToggle(){const on=useSyncExternalStore(subscribeSound,readSound,serverSound);return <label className="muse-atelier-check muse-sound-toggle"><input type="checkbox" checked={on} onChange={e=>{selectSound(e.target.checked);if(e.target.checked)playSound('complete');}}/>Sound effects <span className="small-label">{on?'Soft chimes for meaningful moments.':'Off'}</span></label>;}
