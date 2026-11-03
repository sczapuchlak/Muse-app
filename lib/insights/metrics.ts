import {astrologyMetrics} from '../astrology/insights';
import {whimsyMetrics} from '../whimsy/integrations';
import {plannerMetrics,ritualMetrics} from './plans';
import {moodMetrics} from './feelings';
import {moneyMetrics,nourishMetrics,dailyMetrics} from './life';
import type {NormalizedInsights} from './normalize';
import type {InsightRange} from './ranges';
export function calculateInsights(input:NormalizedInsights,range:InsightRange){return {range,astrology:astrologyMetrics(input.astrology,range),whimsy:input.whimsy?whimsyMetrics(input.whimsy.sources,range,input.whimsy.status):{ready:false as const},planner:plannerMetrics(input,range),rituals:ritualMetrics(input,range),mood:moodMetrics(input,range),money:moneyMetrics(input,range),nourish:nourishMetrics(input,range),daily:dailyMetrics(input,range)};}
export type ReturnTypeOfMetrics=ReturnType<typeof calculateInsights>;
