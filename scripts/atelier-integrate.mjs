// Theme Atelier → official theme. Reads an exported `.muse-theme.json`, validates it with the same rules as the app,
// and prints what Muse needs: a full theme block for a new official theme, or the exact differences for an update.
// Read-only: it never edits files. Usage: node scripts/atelier-integrate.mjs <file.muse-theme.json>
import {readFileSync} from 'node:fs';
import {load} from '../tests/helpers.mjs';

const model=load('lib/atelier/model'),{officialTokenValues}=load('lib/atelier/catalog.generated'),{themes}=load('lib/themes');
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/atelier-integrate.mjs <file.muse-theme.json>');process.exit(1);}
const text=readFileSync(path,'utf8'),file=JSON.parse(text),result=model.importTheme(text);
if(!result.ok){console.error(`Not importable: ${result.error}`);process.exit(1);}
if(result.dropped.length)console.warn(`Skipped unsupported values: ${result.dropped.join(', ')}`);
const definition=result.definition,handoff=file.handoff??{intent:'remix'},snapshot=model.resolvedSnapshot(definition);
const effectSites={
 'disco-light':'components/DiscoAtmosphere.css (.muse-disco-environment display, spill, caustics) and app/atmosphere.css (.muse-disco-reflections)',
 'disco-glitter':'components/DiscoAtmosphere.css (.muse-disco-glitter and Magic level rules)',
 'disco-foil':'app/materials.css (Disco chrome glass, --disco-foil hover and selected states)',
 'birthday-confetti':'app/atmosphere.css (.muse-galaxy-candy display)',
};
const planeVar=model.planeVariables;
// Edited planes always; for a new theme also Disco's own pools, which a new theme id would not otherwise get.
const atmosphereDecls=(newTheme=false)=>{const out=[];
 for(const [plane,css] of Object.entries(snapshot.planes))if(definition.planes[plane]||(newTheme&&plane==='pool'&&definition.base==='disco-damage'))out.push(`${planeVar[plane]}:${css}`);
 if(definition.custom.length)out.push(`--atmosphere-custom-layers:${snapshot.custom}`);
 if(snapshot.customBlend.some(b=>b!=='normal'))out.push(`--atmosphere-custom-blend:${snapshot.customBlend.join(',')}`);
 const e=definition.effects;
 if(e.brightness!==100||e.saturation!==100)out.push(`--atmosphere-filter:brightness(${e.brightness/100}) saturate(${e.saturation/100})`);
 if(e.starOpacity!==100)out.push(`--atmosphere-star-opacity:${e.starOpacity/100}`);
 if(e.starGlow!==100)out.push(`--atmosphere-star-glow:${e.starGlow/100}`);
 if(e.iconGlow!==100)out.push(`--icon-glow:${e.iconGlow/100}`);
 if(e.vignette?.strength)out.push(`--atmosphere-vignette: (see compiled CSS in the export)`);
 return out;};
const notes=e=>[e.stars!=='normal'&&`Star density "${e.stars}" needs a theme rule (data-atelier-stars is remix-only).`,(e.iconAngle!==45||e.iconMiddle!==50)&&`Icon gradient angle ${e.iconAngle}° / middle ${e.iconMiddle}% needs registry support (SVG attributes, lib/atelier/icon-gradient.ts).`].filter(Boolean);

console.log(`# ${result.name}\nIntent: ${handoff.intent}  ·  Base: ${definition.base}  ·  Exported: ${file.exportedAt??'unknown'}`);
const drift=file.resolved?.baseFingerprint&&file.resolved.baseFingerprint!==model.baseFingerprint(definition.base);
if(drift)console.log(`\n⚠ ${definition.base} has changed since this file was exported. Use the file's resolved snapshot as the source of truth and review the differences visually.`);

if(handoff.intent==='new-theme'){
 const id=handoff.name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/[\s_]+/g,'-').slice(0,40);
 if(themes.some(t=>t.id===id))console.log(`\n⚠ The id "${id}" already exists; choose another.`);
 const t=snapshot.tokens;
 console.log(`\n## Registry (lib/themes.ts)\n{ id: "${id}", name: ${JSON.stringify(handoff.name)}, subtitle: ${JSON.stringify(handoff.subtitle)}, mode: "${handoff.mode}", preview: "linear-gradient(135deg, ${t['--background']}, ${t['--icon-gradient-start']}, ${t['--icon-gradient-middle']}, ${t['--icon-gradient-end']})" },`);
 console.log(`\n## Tokens (app/themes.css)\n:root[data-theme="${id}"] {\n${Object.entries({...t,'--color-scheme':handoff.mode}).map(([k,v])=>`  ${k}: ${v};`).join('\n')}\n}`);
 const atmosphere=atmosphereDecls(true);
 console.log(`\n## Atmosphere (app/atmosphere.css)\n${atmosphere.length?`:root[data-theme="${id}"] {\n${atmosphere.map(d=>`  ${d};`).join('\n')}\n}`:'(shared defaults)'}`);
 console.log(`\n## Special effects\n${handoff.effects.length?handoff.effects.map(e=>`- ${e}: add [data-theme="${id}"] to ${effectSites[e]}`).join('\n'):'- none (no theme-specific effects)'}`);
 const n=notes(definition.effects);if(n.length)console.log(`\n## Needs attention\n${n.map(x=>`- ${x}`).join('\n')}`);
 console.log('\nThen: node scripts/generate-atelier-catalog.mjs, update docs, run tests, and review all pages in light/dark, Crystal/Frosted, desktop/mobile.');
}else if(handoff.intent==='update-theme'){
 const target=handoff.target,current=officialTokenValues[target];
 if(target!==definition.base)console.log(`\n⚠ The remix is based on ${definition.base}, not ${target}.`);
 const changed=Object.entries(snapshot.tokens).filter(([k,v])=>current[k]!==v);
 console.log(`\n## Token changes for :root[data-theme="${target}"] (app/themes.css) — ${changed.length}\n${changed.map(([k,v])=>`  ${k}: ${current[k]}  →  ${v}`).join('\n')||'  none'}`);
 const atmosphere=atmosphereDecls();
 console.log(`\n## Atmosphere changes for ${target}\n${atmosphere.map(d=>`  ${d}`).join('\n')||'  none'}`);
 const n=notes(definition.effects);if(n.length)console.log(`\n## Needs attention\n${n.map(x=>`- ${x}`).join('\n')}`);
 console.log(`\n## Preserved before export\n- Frozen remixes: ${handoff.frozenRemixes.length?handoff.frozenRemixes.join(', '):'none'}\n- Today's ${target} kept as: ${handoff.keptOriginal??'not kept'}`);
 console.log('\nKeep the theme id and name. Then: regenerate the catalog, update the design-system notes for this theme, run tests, and review visually.');
}else{
 console.log('\nThis file is a remix (backup or sharing). Import it in Theme Atelier → Import a theme file.');
}
