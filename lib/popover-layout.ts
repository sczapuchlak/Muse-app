export type PopoverRect={left:number;right:number;top:number;bottom:number};
/** Visible-viewport and optional modal intersection; never impose a minimum larger than the space. */
export function popoverBounds(viewport:PopoverRect,host?:PopoverRect,gutter=12):PopoverRect {
 return {left:Math.max(viewport.left,host?.left??viewport.left)+gutter,right:Math.min(viewport.right,host?.right??viewport.right)-gutter,top:Math.max(viewport.top,host?.top??viewport.top)+gutter,bottom:Math.min(viewport.bottom,host?.bottom??viewport.bottom)-gutter};
}
/** A popover that would be squeezed beside its anchor (under this height) uses the whole visible area instead. */
export const MIN_POPOVER_SPACE=320;
export function placePopover(anchor:PopoverRect,bounds:PopoverRect,width:number,height:number,align:'start'|'end'='start') {
 const availableWidth=Math.max(1,bounds.right-bounds.left),availableHeight=Math.max(1,bounds.bottom-bounds.top),panelWidth=Math.min(width,availableWidth),below=Math.max(0,bounds.bottom-anchor.bottom-8),above=Math.max(0,anchor.top-bounds.top-8),up=below<Math.min(height,MIN_POPOVER_SPACE)&&above>below;
 const sideSpace=up?above:below,usableSpace=sideSpace<Math.min(height,MIN_POPOVER_SPACE,availableHeight)?availableHeight:sideSpace;
 const maxHeight=Math.min(560,availableHeight,usableSpace||availableHeight),panelHeight=Math.min(height,maxHeight);
 const left=Math.max(bounds.left,Math.min(align==='end'?anchor.right-panelWidth:anchor.left,bounds.right-panelWidth));
 const top=Math.max(bounds.top,Math.min(up?anchor.top-panelHeight-8:anchor.bottom+8,bounds.bottom-panelHeight));
 return {left,top,maxWidth:availableWidth,maxHeight};
}
