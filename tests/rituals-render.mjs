import React from 'react';
import {load} from './helpers.mjs';
export function ritualTestTree(children,state={groups:[],rituals:[],entries:[],celebratedMilestones:[]}){const {RitualContext}=load('components/rituals/RitualStore');const view={state,loaded:true,pending:false,saving:false,error:'',conflict:false};return React.createElement(RitualContext.Provider,{value:{getSnapshot:()=>view,subscribe:()=>()=>{},dispatch:()=>{},whenSaved:()=>{}}},children);}
