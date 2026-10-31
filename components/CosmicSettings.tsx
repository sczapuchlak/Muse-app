"use client";
import { zodiacSigns,zodiacLabel } from '@/lib/cosmic-forecast';
import { useCosmicPreferences } from './useCosmicPreferences';
import { MuseCard } from './MuseCard';
import { CardHeading } from './CardHeading';
import { MuseChoiceMenu } from './MuseChoiceMenu';
export function CosmicSettings(){const {preferences,update}=useCosmicPreferences();return <MuseCard id="cosmic-forecast-settings"><CardHeading id="cosmic-forecast-settings" title="Cosmic Forecast" icon="moon"/><p className="card-description">An optional daily astrology moment. No birth date, time or location needed.</p><div className="muse-cosmic-forecast-actions"><button type="button" className="choice-button" role="switch" aria-checked={preferences.enabled} onClick={()=>update({enabled:!preferences.enabled})}>Cosmic Forecast · {preferences.enabled?'On':'Off'}</button><MuseChoiceMenu label="Zodiac sign" valueLabel={preferences.sign?zodiacLabel(preferences.sign):'Choose a sign'} options={zodiacSigns.map((sign)=>({id:sign,label:zodiacLabel(sign)}))} selectedIds={preferences.sign?[preferences.sign]:[]} onSelect={(sign)=>update({sign:zodiacSigns.find((value)=>value===sign)??null})}/></div><p className="small-label">Preferences are saved in this browser when storage is available. No live horoscope source is connected; the card shows an explicitly labeled preview.</p></MuseCard>;}
