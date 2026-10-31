"use client";
import {useEffect,useLayoutEffect,useRef} from 'react';
import {useMuseState} from '../MuseSession';
import {notesSample} from '@/lib/notes-sample';
import {useMuseSpark} from '../MuseSpark';
import {notesReducer,type NotesAction} from '@/lib/notes';
/** Drafts are shared immediately; commits debounce edits, not unrelated UI rerenders. */
export function useNotes(){const {trigger,spark}=useMuseSpark();const [state,setState]=useMuseState('notes-library',notesSample,true),latestSetState=useRef(setState);
 useLayoutEffect(()=>{latestSetState.current=setState;},[setState]);
 useEffect(()=>{const pending=Object.entries(state.drafts).map(([id,draft])=>({id,revision:draft.revision}));if(!pending.length)return;const timer=setTimeout(()=>latestSetState.current((current)=>pending.reduce((next,item)=>notesReducer(next,{type:'note/commit',...item}),current)),500);return ()=>clearTimeout(timer);},[state.drafts]);
 return {state,spark,dispatch:(action:NotesAction)=>{if(action.type==='note/create'||action.type==='note/pin'||action.type==='note/status')trigger();setState((current)=>notesReducer(current,action));}};}
