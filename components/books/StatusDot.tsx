import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import {BOOK_STATUS_LABEL,type BookStatus} from '@/lib/books/status';
import '@/components/whimsy/plans/ReadingPlans.css';

export const statusIcon:Record<BookStatus,MuseIconName>={planned:'bookmark',reading:'eye',finished:'check',paused:'pause',dnf:'minus'};

/** The small vivid status icon used in menus and filters: solid colour, dark outline, contrasting icon. */
export function StatusDot({status,size=14}:{status:BookStatus;size?:number}){
 return <span className="muse-status-dot" data-status={status} role="img" aria-label={BOOK_STATUS_LABEL[status]} title={BOOK_STATUS_LABEL[status]}><MuseIcon name={statusIcon[status]} size={size}/></span>;
}
