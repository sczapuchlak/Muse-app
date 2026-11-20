'use client';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import type {Book} from '@/lib/whimsy/models';
import {PLAN_STATUS_LABEL} from '@/lib/books/reading-plans';
import {RatingStars} from '@/components/collections/StarRating';
import './ReadingPlans.css';

/** The one visual language for a book's real reading status (icon + theme-aware colour); plans add no status of their own. */
export const statusIconName:Record<Book['status'],MuseIconName>={planned:'bookmark',reading:'eye',finished:'check',paused:'pause',dnf:'minus'};

export function StatusChip({status,compact=false}:{status:Book['status'];compact?:boolean}){
 return <span className="muse-plan-status" data-status={status} title={PLAN_STATUS_LABEL[status]}><MuseIcon name={statusIconName[status]} size={compact?13:14}/>{!compact&&<span>{PLAN_STATUS_LABEL[status]}</span>}</span>;
}

/** Display-only stars (the shared half-star display, in the plan colours). */
export function Stars({value}:{value:number|undefined}){return <RatingStars value={value} className="muse-plan-stars" emptyLabel="Not rated yet"/>;}

