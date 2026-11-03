"use client";
import type {ForecastCategory} from '@/lib/astrology/forecast';
import {useAccountPreferences} from './AccountPreferences';
import {defaultCosmicPreferences,type CosmicPreferences,type ZodiacSign} from '@/lib/cosmic-forecast';
export function useCosmicPreferences(){const {store,status}=useAccountPreferences();const p=status.saved?.profile;return {forecastCategory:(p?.daily_forecast_category??'overview') as ForecastCategory,preferences:p?{enabled:status.draft.cosmic_enabled??p.cosmic_enabled,sign:(Object.hasOwn(status.draft,'zodiac_sign')?status.draft.zodiac_sign:p.zodiac_sign) as ZodiacSign|null}:defaultCosmicPreferences,ready:status.loaded&&!status.error,pending:status.pending,update:(patch:Partial<CosmicPreferences>)=>store?.edit({...('enabled'in patch?{cosmic_enabled:patch.enabled}:{}),...('sign'in patch?{zodiac_sign:patch.sign}:{})})};}
