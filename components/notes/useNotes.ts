'use client';
import {useEffect} from 'react';
import {useMuseSpark} from '../MuseSpark';
import type {NotesAction} from '@/lib/notes';
import {useNotesPersistence} from './NotesStore';
export function useNotes(){const {store,status,profile}=useNotesPersistence(),{trigger,spark}=useMuseSpark();useEffect(()=>{void store.load();return()=>store.flush();},[store]);return {state:status.state,status,profile,spark,dispatch:(action:NotesAction)=>{if(!status.loaded||status.error)return;if(action.type==='note/create'||action.type==='note/pin'||action.type==='note/status')trigger();store.dispatch(action);}};}
