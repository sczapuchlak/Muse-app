"use client";
import {useMemo} from 'react';
import type {NormalizedInsights} from '@/lib/insights/normalize';
import {rangeFor,previousRange,type RangePreset} from '@/lib/insights/ranges';
import {calculateInsights} from '@/lib/insights/metrics';
import {generateRevelations} from '@/lib/insights/revelations';
/** Memoize the complete pure analysis boundary, independently of hover/dialog/view state. */
export function useInsightAnalysis(input:NormalizedInsights,preset:RangePreset,date:string,customStart:string,customEnd:string){return useMemo(()=>{const range=preset==='custom'?{start:customStart,end:customEnd}:rangeFor(preset,date),metrics=calculateInsights(input,range),prior=calculateInsights(input,previousRange(range));return {range,metrics,prior,revelations:generateRevelations(metrics,prior)};},[input,preset,date,customStart,customEnd]);}
