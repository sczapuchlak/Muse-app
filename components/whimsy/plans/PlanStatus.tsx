'use client';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import type {Book} from '@/lib/whimsy/models';
import {PLAN_STATUS_LABEL} from '@/lib/books/reading-plans';
import {RatingStars} from '@/components/collections/StarRating';
import './ReadingPlans.css';

/** The one visual language for a book's real reading status (icon + theme-aware colour); plans add no status of their own. */
export const statusIconName:Record<Book['status'],MuseIconName>={planned:'bookmark',reading:'eye',finished:'check',paused:'pause',dnf:'minus'};

/** Short names for tight places (plan tiles): the full name stays in the tooltip and for screen readers. */
export const STATUS_SHORT:Record<Book['status'],string>={planned:'TBR',reading:'Reading',finished:'Finished',paused:'Paused',dnf:'DNF'};

export function StatusChip({status,compact=false,short=false}:{status:Book['status'];compact?:boolean;short?:boolean}){
 return <span className="muse-plan-status" data-status={status} title={PLAN_STATUS_LABEL[status]}><MuseIcon name={statusIconName[status]} size={compact?13:14}/>{!compact&&(short?<span aria-label={PLAN_STATUS_LABEL[status]}>{STATUS_SHORT[status]}</span>:<span>{PLAN_STATUS_LABEL[status]}</span>)}</span>;
}

/** Display-only stars (the shared half-star display, in the plan colours). */
export function Stars({value}:{value:number|undefined}){return <RatingStars value={value} className="muse-plan-stars" emptyLabel="Not rated yet"/>;}

