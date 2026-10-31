import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {load} from './helpers.mjs';
const {themes}=load('lib/themes');
test('all nine theme descriptions use the approved copy and existing order',()=>{
 assert.deepEqual(themes.map(t=>[t.id,t.subtitle]),[
 ['iridescent','Light, pastel, and a little magical.'],['astral','Midnight blues and ocean dreams.'],['nightbloom','Forest berries with a poisonous little twist.'],['solstice','All-day sunshine. All-day trouble.'],['prism-noir','A little witchcraft. A lot of hexes.'],['afterglow','Soft pastels for when the neon gets too loud.'],['issya-bday','Sweet frosting and a little birthday magic.'],['issya-bday-xxx','After hours, when the party gets a little wild.'],['disco-damage',"LFG. It's party time!"]]);
 const {AppearanceSettings}=load('components/AppearanceSettings'),html=renderToStaticMarkup(React.createElement(AppearanceSettings));assert.equal((html.match(/class="muse-appearance-theme muse-edge"/g)||[]).length,9);for(const theme of themes)assert.ok(html.includes(theme.subtitle.replaceAll("'",'&#x27;')),theme.id);
 assert.ok(!html.includes('<small>Frosting</small>'));assert.ok(!html.includes('<small>After Hours</small>'));
});
