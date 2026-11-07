"use client";
import {useLayoutEffect,type RefObject} from 'react';

/** Surrounding chrome determines height. Task content/workspace selection never does. */
/** `key` re-attaches when the measured element is swapped (e.g. Agenda switching views). */
export function usePlannerHeight(ref:RefObject<HTMLDivElement|null>,key:unknown=null){
 useLayoutEffect(()=>{
  const board=ref.current,page=board?.closest('main');
  if(!board||!page)return;
  const viewport=window.visualViewport;
  function measure(){
   if(!board||!page)return;
   const box=board.getBoundingClientRect();
   if(!box.width)return; // Next may retain an inactive route's DOM.
   const styles=getComputedStyle(page),gap=parseFloat(styles.getPropertyValue('--space-5'))||20;
   const minimum=parseFloat(styles.getPropertyValue('--planner-min-height'))||420;
   const padding=parseFloat(styles.paddingBottom)||gap;
   // Measure from the top of the document, so a scrolled page never yields a short or tall board.
   const top=box.top+window.scrollY-(viewport?.offsetTop??0),bottom=viewport?.height??window.innerHeight;
   const footer=Array.from(page.children)
    .filter(node=>node.tagName==='FOOTER'&&(node.compareDocumentPosition(board)&Node.DOCUMENT_POSITION_PRECEDING))
    .reduce((sum,node)=>sum+node.getBoundingClientRect().height,0);
   const available=Math.floor(bottom-top-padding-footer-(footer?gap:0));
   board.dataset.heightMode=available>=minimum?'fit':'natural';
   board.style.setProperty('--planner-surface-height',`${Math.max(minimum,available)}px`);
  }
  const resize=new ResizeObserver(measure);
  function observeChrome(){
   Array.from(page!.children).filter(node=>node.tagName==='HEADER'||node.classList.contains('muse-module-toolbar')||node.classList.contains('muse-planner-timer-status')||node.tagName==='FOOTER').forEach(node=>resize.observe(node));
   // Anything above the board (tabs, toolbars, banners, the layout editor) can move it; re-measure when it does.
   for(let node:Element|null=board!;node&&node!==page;node=node.parentElement){if(node!==board)resize.observe(node);for(let sib=node.previousElementSibling;sib;sib=sib.previousElementSibling)resize.observe(sib);}
   measure();
  }
  observeChrome();
  const mutation=new MutationObserver(observeChrome);
  mutation.observe(page,{childList:true});
  window.addEventListener('resize',measure);viewport?.addEventListener('resize',measure);
  return()=>{resize.disconnect();mutation.disconnect();window.removeEventListener('resize',measure);viewport?.removeEventListener('resize',measure);};
 },[ref,key]);
}
