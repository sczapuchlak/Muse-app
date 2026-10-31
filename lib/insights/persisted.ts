import type {PlannerState} from '../planner';
import type {RitualState} from '../rituals';
import type {WellnessState} from '../wellness';
import type {MoneyState} from '../money';
import type {DayData} from '../data/daily';
import type {ContextTag} from '../models';
import {emotionalRecords} from '../data/daily-store';
import {dayExpression,dayPulse} from '../data/daily-projections';
import {normalizeInsights} from './normalize';
/** Read-only adapter shared by browser subscriptions and local integration verification. */
export function persistedInsights({planner,rituals,wellness,money,days,influences,timeZone,today}:{planner:PlannerState;rituals:RitualState;wellness:WellnessState;money:MoneyState;days:Record<string,DayData>;influences:ContextTag[];timeZone:string;today:string}){
 return normalizeInsights({planner,rituals,money,nourish:wellness,mood:{records:emotionalRecords(days),influences,favoriteEmotionIds:[]},dailyPulse:Object.entries(days).map(([date,day])=>dayPulse(date,day)),dailyEntries:Object.entries(days).filter(([,day])=>day.record).map(([date,day])=>({date,id:day.record!.id,...dayExpression(day)})),movement:wellness.movement,activities:wellness.activities,water:wellness.water,movementTypes:wellness.types,timeZone,today,source:{kind:'manual',provider:'Authenticated Muse Supabase records'}});
}
