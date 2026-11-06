#!/usr/bin/env node
/**
 * The Muse Almanac content tool (#53). Offline only: reads content/almanac, never touches a database or network.
 *   node scripts/almanac.mjs                     validate; exits 1 on any error
 *   node scripts/almanac.mjs --review out.html   also write a review sheet: every variant rendered with sample facts
 */
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from '../tests/helpers.mjs';

const dir=resolve(root,'content/almanac');
export const almanacFiles=()=>readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(readFileSync(resolve(dir,f),'utf8')));
const {validateAlmanac}=load('lib/almanac/validate'),{signalCatalog}=load('lib/almanac/signal-catalog'),{renderVariant}=load('lib/almanac/render');
const files=almanacFiles(),report=validateAlmanac(files,signalCatalog);

console.log(`Almanac: ${report.entries} entries, ${report.variants} variants · ${Object.entries(report.byStatus).map(([k,v])=>`${v} ${k}`).join(', ')}`);
for(const w of report.warnings)console.log(`  review: ${w}`);
for(const e of report.errors)console.error(`  error: ${e}`);

const out=process.argv.indexOf('--review');
if(out>0){
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const sections=files.map(file=>`<section><h2>${esc(file.family)}</h2><p class="muted">${esc(file.description)}</p><p><b>Voice:</b> ${esc(file.voice)}</p>${file.entries.map(e=>{
  const spec=signalCatalog[e.trigger.signal],facts=Object.fromEntries(Object.entries(spec?.facts??{}).map(([k,f])=>[k,f.example]));
  Object.assign(facts,e.sample);
  return `<article><header><code>${e.id} v${e.version}</code> <span class="pill">${e.status}</span> <span class="pill">${e.format}</span> <span class="pill">${e.sensitivity}</span> <code>${esc(e.trigger.signal)}${(e.trigger.when??[]).map(c=>` · ${c.join(' ')}`).join('')}</code></header>
   <p class="muted">${esc(spec?.means??'')}</p><ol>${e.variants.map(v=>{const r=renderVariant(e,v,facts);return `<li>${r?`${r.title?`<strong>${esc(r.title)}</strong><br>`:''}${r.sections.map(s=>`${s.heading?`<em>${esc(s.heading)}</em> · `:''}${esc(s.text)}`).join('<br>')}`:'<span class="err">does not render</span>'}</li>`;}).join('')}</ol></article>`;}).join('')}</section>`).join('');
 writeFileSync(resolve(process.argv[out+1]),`<!DOCTYPE html><meta charset="utf-8"><title>Almanac review</title><style>body{font:15px/1.55 system-ui;max-width:860px;margin:32px auto;padding:0 16px}article{border:1px solid #ddd;border-radius:10px;padding:12px 16px;margin:12px 0}.muted{color:#666}.pill{font-size:12px;background:#eee;border-radius:99px;padding:1px 8px}.err{color:#b00}li{margin:6px 0}</style><h1>Almanac review sheet</h1><p>Sample facts come from the signal catalog's examples, not anyone's data. ${report.errors.length} errors, ${report.warnings.length} items to review.</p>${sections}`);
 console.log(`Review sheet written to ${process.argv[out+1]}`);
}
if(report.errors.length)process.exit(1);
