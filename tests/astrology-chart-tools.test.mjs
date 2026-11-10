import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {circularMidpoint,calculateSynastry,calculateComposite,calculateTransit}=load('lib/astrology/chart-tools');
const one={date:'2000-01-01',time:'12:00',accuracy:'exact',uncertaintyMinutes:0,place:{id:'fixture',name:'Greenwich',latitude:51.4779,longitude:0,timeZone:'UTC'},zodiac:'tropical',houseSystem:'whole-sign'};
const two={...one,date:'2001-06-15',time:'08:30'};
test('composite circular midpoint chooses the short arc and refuses an ambiguous opposition',()=>{
 assert.equal(circularMidpoint(350,10),0);
 assert.equal(circularMidpoint(10,350),0);
 assert.equal(circularMidpoint(10,190),null);
 // Astrodienst's published example: 13° Taurus and 27° Aquarius meet at 5° Aries.
 assert.equal(circularMidpoint(43,327),5);
 const result=calculateComposite(one,two);
 assert.equal(result.method,'shortest-arc-midpoint');
 for(const placement of result.chart.placements){const a=result.one.placements.find(p=>p.body===placement.body),b=result.two.placements.find(p=>p.body===placement.body);assert.equal(placement.longitude,circularMidpoint(a.longitude,b.longitude));}
 assert.equal(result.chart.cusps.length,0);
});
test('synastry compares distinct natal bodies without a compatibility score',()=>{
 const result=calculateSynastry(one,two);
 assert.equal(result.one.placements.length,10);assert.equal(result.two.placements.length,10);
 assert.ok(result.aspects.length>0);
 for(const aspect of result.aspects){assert.ok(aspect.angle>=0&&aspect.angle<=180);assert.ok(aspect.orb>=0);}
 assert.ok(!('score' in result));
});
test('uncertain birth times suppress exact inter-chart aspects and composite houses',()=>{
 const unknown={...two,time:'',accuracy:'unknown',place:null};
 const synastry=calculateSynastry(one,unknown),composite=calculateComposite(one,unknown);
 assert.equal(synastry.aspects.length,0);assert.ok(synastry.warnings.length);
 assert.equal(composite.chart.ascendant,null);assert.equal(composite.chart.cusps.length,0);assert.equal(composite.chart.aspects.length,0);
 assert.ok(composite.chart.placements.every(p=>p.uncertain));
});
test('transits use a selected instant and never turn unknown-time birth positions into exact aspects',()=>{
 const selectedAt='2026-11-09T20:00:00.000Z';
 const result=calculateTransit(one,selectedAt);
 assert.equal(result.selectedAt,selectedAt);assert.equal(result.transit.placements.length,10);assert.ok(result.aspects.length>0);
 const unknown=calculateTransit({...one,time:'',accuracy:'unknown',place:null},selectedAt);
 assert.equal(unknown.aspects.length,0);assert.ok(unknown.warnings.length);
 assert.throws(()=>calculateTransit(one,'2026-11-09'));
});
