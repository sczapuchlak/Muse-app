// Explicit confirmed repository fixtures for presentation tests. Production never
// falls back to sample/local state when the authenticated owner is unavailable.
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';
export function renderWithWellness(element){const {WellnessContext}=load('components/WellnessStore'),{emptyWellness}=load('lib/wellness');const props=element?.props??{},state={...emptyWellness(),...(props.initialState?{assignments:props.initialState.assignments,savedMeals:props.initialState.savedMeals,groceryItems:props.initialState.groceryItems,grocerySections:props.initialState.grocerySections}:{}),...(props.initialDay?{water:[{...props.initialDay,goal:props.settings.goal,unit:props.settings.unit}]}:{})};const view={state,loaded:true,pending:false,saving:false,error:'',conflict:false,discarded:0};const store={subscribe:()=>()=>{},getSnapshot:()=>view,dispatch:()=>{},load:async()=>{},retry:()=>{},discard:async()=>{}};return renderToStaticMarkup(React.createElement(WellnessContext.Provider,{value:store},element));}
