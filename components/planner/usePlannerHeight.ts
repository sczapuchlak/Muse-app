"use client";
import {useLayoutEffect,type RefObject} from 'react';

/** Surrounding chrome determines height. Task content/workspace selection never does. */
export function usePlannerHeight(ref:RefObject<HTMLDivElement|null>){
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
   const top=box.top-(viewport?.offsetTop??0),bottom=viewport?.height??window.innerHeight;
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
   measure();
  }
  observeChrome();
  const mutation=new MutationObserver(observeChrome);
  mutation.observe(page,{childList:true});
  window.addEventListener('resize',measure);viewport?.addEventListener('resize',measure);
  return()=>{resize.disconnect();mutation.disconnect();window.removeEventListener('resize',measure);viewport?.removeEventListener('resize',measure);};
 },[ref]);
}
