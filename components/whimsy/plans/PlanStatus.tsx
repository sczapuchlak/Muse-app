'use client';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import type {Book} from '@/lib/whimsy/models';
import {PLAN_STATUS_LABEL} from '@/lib/books/reading-plans';

/** The one visual language for a book's real reading status (icon + theme-aware colour); plans add no status of their own. */
export const statusIconName:Record<Book['status'],MuseIconName>={planned:'bookmark',reading:'eye',finished:'check',paused:'pause',dnf:'minus'};

export function StatusChip({status,compact=false}:{status:Book['status'];compact?:boolean}){
 return <span className="muse-plan-status" data-status={status} title={PLAN_STATUS_LABEL[status]}><MuseIcon name={statusIconName[status]} size={compact?13:14}/>{!compact&&<span>{PLAN_STATUS_LABEL[status]}</span>}</span>;
}

/** Display-only stars; half stars show as a half-filled star. */
export function Stars({value}:{value:number|undefined}){
 if(!value)return <span className="muse-plan-stars" data-empty aria-label="Not rated yet">{'☆'.repeat(5)}</span>;
 return <span className="muse-plan-stars" role="img" aria-label={`${value} of 5`}>{[1,2,3,4,5].map(n=><span key={n} data-fill={value>=n?'full':value>=n-.5?'half':'none'}>★</span>)}</span>;
}
