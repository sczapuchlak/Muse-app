import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {bookCarryFields}=load('lib/whimsy/books');
const base={isbn:undefined,publisher:undefined,publishedDate:undefined,description:undefined,metadataSource:undefined,completions:undefined,archivedAt:undefined,cycleId:undefined,unassignedRating:undefined,unassignedReview:undefined};
test('a favourite heart survives every record rewrite that carries book fields',()=>{
 assert.equal(bookCarryFields({...base,favorite:true}).favorite,true);
 assert.equal('favorite' in bookCarryFields({...base}),false,'no heart is stored unless set');
 assert.equal('favorite' in bookCarryFields({...base,favorite:false}),false,'an unset heart is removed, not stored as false');
});
