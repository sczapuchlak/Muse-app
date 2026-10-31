"use client";
import {useSyncExternalStore} from 'react';
import {parseCosmicPreferences} from '@/lib/cosmic-forecast';
import {readCosmicPreference,serverCosmicPreference,changeCosmicPreference,subscribeCosmicPreference} from '@/lib/cosmic-preference';
export function useCosmicPreferences(){const raw=useSyncExternalStore(subscribeCosmicPreference,readCosmicPreference,serverCosmicPreference);return {preferences:parseCosmicPreferences(raw),update:changeCosmicPreference};}
