"use client";
import {useMemo} from 'react';
import {usePlanner} from '../PlannerStore';
import {useNourish} from '../NourishStore';
import {useRituals} from '../rituals/RitualStore';
import {useMoney} from '../money/MoneyStore';
import {useMood} from '../mood/useMood';
import {useWellness} from '../WellnessStore';
import {useDailyData} from '../daily/DailyData';
import {dayPulse} from '@/lib/data/daily-projections';
import {normalizeInsights} from '@/lib/insights/normalize';
export function useInsightsSources(date:string,today:string){const {state:planner}=usePlanner(),{state:nourish}=useNourish(),{state:rituals}=useRituals(),{state:money}=useMoney(),{state:mood}=useMood(date),{state:wellness}=useWellness(),{snapshot,profile}=useDailyData();
 return useMemo(()=>normalizeInsights({planner,nourish,rituals,money,mood,dailyPulse:Object.entries(snapshot.days).map(([date,day])=>dayPulse(date,day)),movement:wellness.movement,water:wellness.water,movementTypes:wellness.types,timeZone:profile.timeZone,today,source:{kind:'prototype-session',provider:'Muse local prototype'}}),[planner,nourish,rituals,money,mood,wellness,today,snapshot.days,profile.timeZone]);}
