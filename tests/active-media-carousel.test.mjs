import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';

const {ActiveMediaCarousel}=load('components/collections/ActiveMediaCarousel');
test('active carousel retains every card and exposes directional controls only beyond the visible three',()=>{
 for(const count of [1,2,3,5,10]){const html=renderToStaticMarkup(h(ActiveMediaCarousel,{label:'Currently Reading',count},Array.from({length:count},(_,index)=>h('article',{key:index},`Book ${index+1}`))));
  assert.equal((html.match(/<article/g)??[]).length,count);
  assert.match(html,new RegExp(`data-count="${Math.min(count,3)}"`));
  assert.equal(html.includes('Previous currently reading item'),count>3);
  if(count>3){assert.match(html,/1–3 of (5|10)/);assert.match(html,/disabled=""[^>]*>.*?chevron|disabled=""/);}
 }
 const css=readFileSync(root+'/components/collections/ActiveMediaCarousel.css','utf8');
 assert.match(css,/@media\(max-width:850px\)/);assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/scroll-snap-type:x mandatory/);assert.match(css,/prefers-reduced-motion/);
});
