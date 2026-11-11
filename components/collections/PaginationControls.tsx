'use client';
import {memo,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {PAGE_SIZES,pageButtons,type PageSize,type PageWindow} from '@/lib/collections/pagination';
import './PaginationControls.css';

/**
 * Shared page controls for large Library collections. Rendered above and below the list: the top bar
 * announces the range to assistive technology, the bottom bar repeats the controls so the reader never has to
 * scroll back up. Muse's page-size menu, ghost buttons and selected marker are reused rather than imitated.
 */
function PaginationControlsBase({window:w,noun,position,label,onPage,onSize,leading}:{window:PageWindow;noun:string;position:'top'|'bottom';label:string;onPage:(page:number)=>void;onSize:(size:PageSize)=>void;leading?:ReactNode}){
 if(!w.total)return null;
 const single=w.total===1?noun.replace(/s$/,''):noun,buttons=pageButtons(w.page,w.pages);
 return <nav className="muse-pagination" data-position={position} aria-label={`${label} pages, ${position}`}>
  <p className="muse-pagination-summary" role={position==='top'?'status':undefined} aria-live={position==='top'?'polite':undefined}><strong>{w.from.toLocaleString()}–{w.to.toLocaleString()}</strong> of {w.total.toLocaleString()} {single}<span className="muse-pagination-page"><span className="muse-pagination-dot" aria-hidden="true"> · </span>Page {w.page.toLocaleString()} of {w.pages.toLocaleString()}</span></p>
  <div className="muse-pagination-controls">
   {leading&&<div className="muse-pagination-leading">{leading}</div>}
   <div className="muse-pagination-size"><span className="small-label" aria-hidden="true">Per page</span><MuseChoiceMenu label={`${label} per page, ${position}`} valueLabel={String(w.size)} options={PAGE_SIZES.map(size=>({id:String(size),label:`${size} per page`}))} selectedIds={[String(w.size)]} onSelect={id=>onSize(Number(id) as PageSize)}/></div>
   {w.pages>1&&<div className="muse-pagination-pages">
    <button type="button" className="muse-button button-ghost muse-pagination-step" data-direction="previous" aria-label="Previous page" title="Previous page" disabled={w.page<=1} onClick={()=>onPage(w.page-1)}><MuseIcon name="chevron" size={17}/></button>
    <ol className="muse-pagination-numbers">{buttons.map((n,index)=>n===null?<li key={`gap-${index}`} aria-hidden="true" className="muse-pagination-gap">…</li>:<li key={n}><button type="button" className="muse-button button-ghost muse-pagination-number" aria-label={`Page ${n}`} aria-current={n===w.page?'page':undefined} onClick={()=>n!==w.page&&onPage(n)}>{n}</button></li>)}</ol>
    <button type="button" className="muse-button button-ghost muse-pagination-step" data-direction="next" aria-label="Next page" title="Next page" disabled={w.page>=w.pages} onClick={()=>onPage(w.page+1)}><MuseIcon name="chevron" size={17}/></button>
   </div>}
  </div>
 </nav>;
}
export const PaginationControls=memo(PaginationControlsBase);
