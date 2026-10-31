"use client";
import {DateNavigator} from './DateNavigator';
import {useMuseDate} from './MuseSession';
import {dailyEditSample} from '@/lib/daily-edit-data';
export function SharedDateNavigator(){const [date,setDate]=useMuseDate(dailyEditSample.date.iso);return <DateNavigator date={date} onChange={setDate}/>;}
