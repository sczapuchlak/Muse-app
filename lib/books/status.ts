import type {Book} from '@/lib/whimsy/models';

/**
 * The five reading statuses, named once. `planned` is stored as before; only its label is "To Be Read".
 * Every dropdown, filter, badge and message reads its names and order from here.
 */
export type BookStatus=Book['status'];
export const BOOK_STATUS_ORDER:BookStatus[]=['reading','planned','finished','dnf','paused'];
export const BOOK_STATUS_LABEL:Record<BookStatus,string>={reading:'Currently Reading',planned:'To Be Read',finished:'Finished',dnf:'Did Not Finish',paused:'Paused'};
export const BOOK_STATUS_SHORT:Record<BookStatus,string>={reading:'Reading',planned:'TBR',finished:'Finished',dnf:'DNF',paused:'Paused'};
/** Dropdown options, in the fixed order. */
export const bookStatusOptions=()=>BOOK_STATUS_ORDER.map(id=>({id,label:BOOK_STATUS_LABEL[id]}));
export const isBookStatus=(value:string):value is BookStatus=>(BOOK_STATUS_ORDER as string[]).includes(value);
