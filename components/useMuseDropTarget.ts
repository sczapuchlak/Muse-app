"use client";
import { useEffect, useState, type DragEvent } from "react";

/** Shared HTML drag target behavior; domain-specific placement stays with its owner. */
export function useMuseDropTarget(type: string, receive: (id: string) => void) {
  const [active,setActive]=useState(false);
  useEffect(()=>{const reset=()=>setActive(false);document.addEventListener("dragend",reset);return()=>document.removeEventListener("dragend",reset);},[]);
  const accepts=(event:DragEvent<HTMLElement>)=>event.dataTransfer.types.includes(type);
  return {active,dropProps:{
    onDropCapture:()=>setActive(false),
    onDragOver:(event:DragEvent<HTMLElement>)=>{if(accepts(event)){event.preventDefault();event.dataTransfer.dropEffect="move";setActive(true);}},
    onDragLeave:(event:DragEvent<HTMLElement>)=>{if(!(event.relatedTarget instanceof Node)||!event.currentTarget.contains(event.relatedTarget))setActive(false);},
    onDrop:(event:DragEvent<HTMLElement>)=>{setActive(false);if(!accepts(event))return;event.preventDefault();receive(event.dataTransfer.getData(type));},
  }};
}
