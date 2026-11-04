import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';

const {MuseOptionalDatePicker}=load('components/MuseDatePicker');

test('Collections date filters show selected dates and offer a clear action',()=>{
  const props={today:'2026-11-03',label:'Added on or after',onChange:()=>{}};
  const empty=renderToStaticMarkup(createElement(MuseOptionalDatePicker,{...props,date:''}));
  assert.match(empty,/Any date/);
  assert.doesNotMatch(empty,/Clear added on or after filter/);
  const selected=renderToStaticMarkup(createElement(MuseOptionalDatePicker,{...props,date:'2026-10-15'}));
  assert.match(selected,/October 15, 2026/);
  assert.match(selected,/Clear added on or after filter/);
});
