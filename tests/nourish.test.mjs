import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load,root } from './helpers.mjs';
const domain=load('lib/nourish');
const {nourishSample}=load('lib/nourish-sample');
const fresh=()=>structuredClone(nourishSample);

test('quick-text meal assignment needs no saved meal and multiple snacks retain distinct IDs/order',()=>{
 let state=fresh();
 for(const [id,title] of [['snack-a','Ninja Creami'],['snack-b','Popcorn']])state=domain.nourishReducer(state,{type:'assignment/save',assignment:domain.createMealAssignment(title,'2026-10-30','snacks',id,'2026-10-29T12:00:00Z')});
 const snacks=domain.mealsFor(state,'2026-10-30','snacks');
 assert.deepEqual(snacks.map((meal)=>meal.id),['snack-a','snack-b']);
 assert.deepEqual(snacks.map((meal)=>meal.order),[0,1]);
 assert.ok(snacks.every((meal)=>meal.savedMealId===undefined));
 assert.equal(state.savedMeals.length,nourishSample.savedMeals.length);
 assert.equal(domain.nourishReducer(state,{type:'assignment/save',assignment:domain.createMealAssignment('   ','2026-10-30','dinner','empty','now')}),state);
});

test('meal moves preserve identity, saved reference and note; copies create independent assignments',()=>{
 const original=fresh(),meal=original.assignments.find((item)=>item.id==='meal-2026-10-29-dinner');
 let state=domain.nourishReducer(original,{type:'assignment/move',id:meal.id,date:'2026-10-30',slot:'lunch'});
 const moved=state.assignments.find((item)=>item.id===meal.id);
 assert.equal(moved.savedMealId,meal.savedMealId);assert.equal(moved.title,meal.title);
 assert.equal(original.assignments.find((item)=>item.id===meal.id).date,'2026-10-29');
 assert.equal(state.assignments.length,original.assignments.length);
 state=domain.nourishReducer(state,{type:'assignment/copy',id:meal.id,now:'now',targets:[{id:'copy-one',date:'2026-11-02',slot:'dinner'},{id:'copy-two',date:'2026-11-03',slot:'dinner'}]});
 assert.equal(state.assignments.length,original.assignments.length+2);
 assert.equal(state.assignments.find((item)=>item.id==='copy-one').title,meal.title);
 assert.equal(state.assignments.find((item)=>item.id==='copy-two').savedMealId,meal.savedMealId);
 assert.equal(domain.nourishReducer(state,{type:'assignment/move',id:meal.id,date:'2026-02-30',slot:'dinner'}),state);
});

test('saved meal changes do not rewrite snapshots and deletion keeps planned text while detaching reference',()=>{
 let state=fresh();const assignment=state.assignments.find((meal)=>meal.savedMealId==='salmon');
 const saved=state.savedMeals.find((meal)=>meal.id==='salmon');
 state=domain.nourishReducer(state,{type:'saved/save',meal:{...saved,name:'Salmon night',link:'javascript:alert(1)'}});
 assert.equal(state.assignments.find((meal)=>meal.id===assignment.id).title,assignment.title);
 assert.equal(state.savedMeals.find((meal)=>meal.id==='salmon').link,undefined);
 state=domain.nourishReducer(state,{type:'saved/remove',id:'salmon'});
 assert.equal(state.assignments.find((meal)=>meal.id===assignment.id).title,assignment.title);
 assert.equal(state.assignments.find((meal)=>meal.id===assignment.id).savedMealId,undefined);
 assert.equal(domain.safeMealLink('https://example.com/meal'),'https://example.com/meal');
 assert.equal(domain.safeMealLink('data:text/html,bad'),undefined);
});

test('Daily Edit and Nourish slots read the same modified assignment collection',()=>{
 const {NourishProvider}=load('components/NourishStore');
 const {MealsCard}=load('components/MealsCard');
 const {MealSlot}=load('components/nourish/MealSlot');
 const state=domain.nourishReducer(fresh(),{type:'assignment/save',assignment:domain.createMealAssignment('Steak + rice','2026-10-29','dinner','shared-dinner','now')});
 const html=renderToStaticMarkup(React.createElement(NourishProvider,{initialState:state},React.createElement(MealsCard,{selectedDate:'2026-10-29'}),React.createElement(MealSlot,{date:'2026-10-29',slot:'dinner',onOpen(){},onPlace(){}})));
 assert.equal((html.match(/Steak \+ rice/g)??[]).length>=2,true);
 assert.ok(html.includes('data-module="nourish"'));
 assert.ok(html.includes('/nourish?date=2026-10-29'));
 assert.ok(html.includes('Manage meals'));
 assert.ok(html.includes('Copy'));
 assert.ok(!html.includes('type="range"'));
});

test('card heading supports meaningful badge/action combinations without fake symmetry',()=>{
 const {CardHeading}=load('components/CardHeading');
 const render=(props)=>renderToStaticMarkup(React.createElement(CardHeading,{id:'test',title:'Example',...props}));
 assert.ok(!render({}).includes('muse-card-heading-actions'));
 assert.ok(render({sourceModule:'planner'}).includes('data-module="planner"'));
 assert.ok(!render({sourceModule:'planner'}).includes('<a'));
 assert.ok(render({manage:{href:'/planner'}}).includes('>Manage</a>'));
 assert.ok(render({sourceModule:'nourish',manage:{href:'/nourish'}}).includes('data-module="nourish"'));
});

test('all fixed navigation destinations have dedicated routes; unknown module catch-all is gone',()=>{
 const {navigation}=load('lib/navigation');
 for(const item of navigation) {
  const file=item.href==='/'?'app/page.tsx':`app${item.href}/page.tsx`;
  assert.ok(existsSync(resolve(root,file)),item.href);
  assert.ok(!readFileSync(resolve(root,file),'utf8').includes('await params'),item.href);
 }
 assert.ok(!existsSync(resolve(root,'app/[module]/page.tsx')));
 const nourish=readFileSync(resolve(root,'app/nourish/page.tsx'),'utf8');
 assert.ok(nourish.includes('<Suspense')&&nourish.includes('<Nourish'));
});

test('one saved meal can belong to multiple types without duplication; recent meals include saved occurrences',()=>{
 let state=fresh();const original=state.savedMeals.find((meal)=>meal.id==='tacos');
 state=domain.nourishReducer(state,{type:'saved/save',meal:{...original,mealTypes:['lunch','dinner','lunch']}});
 assert.equal(state.savedMeals.filter((meal)=>meal.id==='tacos').length,1);
 assert.deepEqual(state.savedMeals.find((meal)=>meal.id==='tacos').mealTypes,['lunch','dinner']);
 assert.ok(domain.savedMealsFor(state,'lunch').some((meal)=>meal.id==='tacos'));
 assert.ok(domain.savedMealsFor(state,'dinner').some((meal)=>meal.id==='tacos'));
 assert.ok(!domain.savedMealsFor(state,'breakfast').some((meal)=>meal.id==='tacos'));
 assert.ok(domain.savedMealsFor(state,'all',' TACO ').some((meal)=>meal.id==='tacos'));
 assert.ok(domain.recentMeals(state).some((meal)=>meal.savedMealId==='tacos'));
});

test('nutrition is optional; finite nonnegative decimals and explicit zero survive while invalid entries are rejected',()=>{
 for(const value of [undefined,{}, {calories:0,protein:23.75}, {fat:.5}])assert.equal(domain.validNutrition(value),true);
 for(const value of [{protein:-1},{fat:Infinity},{carbs:NaN},{calories:'300'}])assert.equal(domain.validNutrition(value),false);
 let state=fresh();const assignment=domain.createMealAssignment('Lunch out','2026-11-01','lunch','no-macros','now');
 state=domain.nourishReducer(state,{type:'assignment/save',assignment});
 assert.equal(state.assignments.find((meal)=>meal.id===assignment.id).nutrition,undefined);
 const invalid={...assignment,nutrition:{calories:-100}};
 assert.equal(domain.nourishReducer(state,{type:'assignment/save',assignment:invalid}),state);
 state=domain.nourishReducer(state,{type:'assignment/save',assignment:{...assignment,nutrition:{protein:0,carbs:4.25}}});
 assert.deepEqual(state.assignments.find((meal)=>meal.id===assignment.id).nutrition,{protein:0,carbs:4.25});
});

test('saved nutrition defaults are snapshots; occurrence edits, moves and copies do not rewrite reusable defaults or history',()=>{
 let state=fresh();const saved=state.savedMeals.find((meal)=>meal.id==='latte');
 const assignment={...domain.createMealAssignment(saved.name,'2026-11-01','breakfast','macro-occurrence','now',saved.id),nutrition:saved.nutrition};
 state=domain.nourishReducer(state,{type:'assignment/save',assignment});
 const snapshot=state.assignments.find((meal)=>meal.id===assignment.id);
 assert.notEqual(snapshot.nutrition,saved.nutrition);
 state=domain.nourishReducer(state,{type:'saved/save',meal:{...saved,nutrition:{protein:99}}});
 assert.equal(state.assignments.find((meal)=>meal.id===assignment.id).nutrition.protein,38);
 state=domain.nourishReducer(state,{type:'assignment/save',assignment:{...snapshot,nutrition:{protein:42,calories:610}}});
 assert.equal(state.savedMeals.find((meal)=>meal.id===saved.id).nutrition.protein,99);
 state=domain.nourishReducer(state,{type:'assignment/move',id:assignment.id,date:'2026-11-02',slot:'lunch'});
 state=domain.nourishReducer(state,{type:'assignment/copy',id:assignment.id,now:'now',targets:[{id:'macro-copy',date:'2026-11-03',slot:'lunch'}]});
 assert.deepEqual(state.assignments.find((meal)=>meal.id==='macro-copy').nutrition,{protein:42,calories:610});
 state=domain.nourishReducer(state,{type:'saved/remove',id:saved.id});
 assert.deepEqual(state.assignments.find((meal)=>meal.id===assignment.id).nutrition,{protein:42,calories:610});
});

test('daily totals distinguish missing fields, explicit zero, partial meals and complete nutrition',()=>{
 const meal=(id,nutrition)=>({...domain.createMealAssignment(id,'2026-11-01','snacks',id,'now'),nutrition});
 let totals=domain.dailyNutrition([meal('a',{calories:430,protein:38.2}),meal('b',{calories:520,protein:35.1}),meal('c',undefined)]);
 assert.equal(totals.fields.calories.value,950);assert.equal(totals.fields.protein.value,73.3);
 assert.equal(totals.fields.fat.value,null);assert.equal(totals.fields.fat.trackedMeals,0);
 assert.equal(totals.trackedMeals,2);assert.equal(totals.mealCount,3);assert.equal(totals.complete,false);
 totals=domain.dailyNutrition([meal('zero',{calories:0,protein:0,carbs:0,fat:0})]);
 assert.equal(totals.fields.calories.value,0);assert.equal(totals.complete,true);
 const {DailyNutrition}=load('components/nourish/DailyNutrition');
 const render=(meals)=>renderToStaticMarkup(React.createElement(DailyNutrition,{meals}));
 assert.equal(render([meal('empty',undefined)]),'');
 assert.ok(render([meal('zero',{protein:0})]).includes('Known daily total'));
 assert.ok(render([meal('zero',{protein:0})]).includes('Incomplete'));
 assert.ok(render([meal('one',{calories:200}),meal('two',undefined)]).includes('1 of 2 meals with data'));
 assert.ok(render([meal('one',{calories:200})]).includes('>—</dd>'));
});

test('manual groceries retain section, optional quantity/note and completion until explicitly cleared',()=>{
 let state=fresh();const item={id:'lemons',name:'  Lemons  ',quantity:'3',note:'For Saturday',sectionId:'produce',complete:false,createdAt:'now'};
 state=domain.nourishReducer(state,{type:'grocery/save',item});
 assert.equal(state.groceryItems[0].name,'Lemons');assert.equal(state.groceryItems[0].quantity,'3');
 assert.equal(domain.nourishReducer(state,{type:'grocery/save',item:{...item,sectionId:'unknown'}}),state);
 state=domain.nourishReducer(state,{type:'grocery/complete',id:'lemons',complete:true});
 assert.equal(state.groceryItems.length,1);assert.equal(state.groceryItems[0].complete,true);
 state=domain.nourishReducer(state,{type:'grocery/save',item:{...item,id:'milk',name:'Milk',sectionId:'dairy'}});
 state=domain.nourishReducer(state,{type:'grocery/clear-completed'});
 assert.deepEqual(state.groceryItems.map((entry)=>entry.id),['milk']);
 assert.equal(state.groceryItems[0].note,'For Saturday');
 state=domain.nourishReducer(state,{type:'grocery/remove',id:'milk'});assert.equal(state.groceryItems.length,0);
});

test('Saved Meals and Grocery List render as distinct Muse views with meal filters and grouped completed items',()=>{
 const {NourishProvider}=load('components/NourishStore');
 const {SavedMealLibrary}=load('components/nourish/SavedMealLibrary');
 const {GroceryList}=load('components/nourish/GroceryList');
 let state=fresh();
 state=domain.nourishReducer(state,{type:'grocery/save',item:{id:'fruit',name:'Strawberries',sectionId:'produce',complete:true,createdAt:'now'}});
 const html=renderToStaticMarkup(React.createElement(NourishProvider,{initialState:state},React.createElement(SavedMealLibrary),React.createElement(GroceryList)));
 assert.ok(html.includes('Filter saved meals by type'));assert.ok(html.includes('Add saved meal'));
 assert.ok(html.includes('aria-label="Produce"'));assert.ok(html.includes('aria-checked="true"'));
 assert.ok(html.includes('data-complete="true"'));assert.ok(html.includes('Clear completed'));
 assert.ok(!html.includes('<select'));
});
