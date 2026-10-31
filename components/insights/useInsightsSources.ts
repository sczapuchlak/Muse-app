"use client";
import {useMemo} from 'react';
import {usePlanner} from '../PlannerStore';
import {useNourish} from '../NourishStore';
import {useRituals} from '../rituals/RitualStore';
import {useMoney} from '../money/MoneyStore';
import {useMood} from '../mood/useMood';
import {useMuseRecords} from '../MuseSession';
import {sampleMovementTypes} from '@/lib/sample-taxonomies';
import type {MovementType} from '@/lib/models';
import {mockProfile} from '@/lib/mock-profile';
import {dailySessionRecords,normalizeInsights} from '@/lib/insights/normalize';
export function useInsightsSources(date:string,today:string){const {state:planner}=usePlanner(),{state:nourish}=useNourish(),{state:rituals}=useRituals(),{state:money}=useMoney(),{state:mood}=useMood(date),records=useMuseRecords();
 return useMemo(()=>normalizeInsights({planner,nourish,rituals,money,mood,...dailySessionRecords(records),movementTypes:(records['library/movement-types'] as MovementType[]|undefined)??sampleMovementTypes,timeZone:mockProfile.timeZone,today,source:{kind:'prototype-session',provider:'Muse local prototype'}}),[planner,nourish,rituals,money,mood,records,today]);}
