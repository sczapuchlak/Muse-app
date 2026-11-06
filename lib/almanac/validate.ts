/**
 * Almanac content validation (#53). Runs in `npm test` and from `node scripts/almanac.mjs`, so a broken or off-voice
 * entry fails before anyone reviews it. Structural validity is not editorial approval.
 */
import type {AlmanacFile,FactType,SignalSpec,VariableFormat} from './types';
import {sensitivityRank} from './types';
import {conditionsHold,placeholders,renderVariant} from './render';
import {formatLimits,formatsBarredWhenSensitive,maxExclamationsPerEntry,tonesBarredWhenSensitive,voiceProblems} from './voice-rules';

const compatible:Record<VariableFormat,FactType[]>={count:['count'],number:['count','ratio'],ordinal:['count'],percent:['ratio'],hour:['hour'],duration:['seconds'],date:['date'],label:['label'],money:['cents']};
const statuses=['draft','review','approved','published','retired'];
const isDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s);

const shingles=(text:string)=>{const w=text.toLowerCase().replace(/\{\w+\}/g,'#').replace(/[^\p{L}\p{N}#\s]/gu,'').split(/\s+/).filter(Boolean);const out=new Set<string>();for(let i=0;i+2<w.length;i++)out.add(w.slice(i,i+3).join(' '));if(w.length<3&&w.length)out.add(w.join(' '));return out;};
export function similarity(a:string,b:string){const A=shingles(a),B=shingles(b);if(!A.size||!B.size)return 0;let both=0;for(const x of A)if(B.has(x))both++;return both/(A.size+B.size-both);}

export type ValidationReport={errors:string[];warnings:string[];entries:number;variants:number;byStatus:Record<string,number>};

export function validateAlmanac(files:AlmanacFile[],catalog:Record<string,SignalSpec>):ValidationReport{
 const errors:string[]=[],warnings:string[]=[],ids=new Set<string>(),byStatus:Record<string,number>={};let variants=0;
 const all:{id:string;variant:string;text:string}[]=[];
 for(const file of files){
  if(!file.family||!file.description||!file.voice)errors.push(`${file.family||'(file)'}: family, description and voice are required`);
  for(const e of file.entries){
   const at=`${e.id}`,err=(m:string)=>errors.push(`${at}: ${m}`);
   if(!/^ALM-[A-Z]+-\d{3}$/.test(e.id))err('id must look like ALM-READ-001');
   if(ids.has(e.id))err('duplicate id');ids.add(e.id);
   if(e.family!==file.family)err(`family “${e.family}” differs from its file “${file.family}”`);
   if(!Number.isInteger(e.version)||e.version<1)err('version must be a positive integer');
   if(!statuses.includes(e.status))err(`unknown status ${e.status}`);byStatus[e.status]=(byStatus[e.status]??0)+1;
   if(!e.review?.author||!isDate(e.review?.updatedAt??''))err('review.author and review.updatedAt (YYYY-MM-DD) are required');
   if(['approved','published'].includes(e.status)&&!e.review?.reviewedBy)err(`${e.status} entries need review.reviewedBy`);
   if(!(e.cooldownDays>=1))err('cooldownDays must be at least 1');
   const spec=catalog[e.trigger?.signal];
   if(!spec){err(`unknown signal ${e.trigger?.signal}`);continue;}
   if(sensitivityRank[e.sensitivity]<sensitivityRank[spec.sensitivity])err(`sensitivity ${e.sensitivity} is lower than its signal (${spec.sensitivity})`);
   if(e.sensitivity==='sensitive'){
    if(formatsBarredWhenSensitive.includes(e.format))err(`sensitive entries cannot be ${e.format}s`);
    for(const t of e.tone)if(tonesBarredWhenSensitive.includes(t))err(`sensitive entries cannot use a ${t} tone`);
   }
   for(const [fact] of e.trigger.when??[])if(!spec.facts[fact])err(`condition uses unknown fact ${fact}`);
   for(const [name,v] of Object.entries(e.variables)){const f=spec.facts[v.fact];
    if(!f){err(`variable {${name}} uses unknown fact ${v.fact}`);continue;}
    if(!compatible[v.format]?.includes(f.type))err(`variable {${name}}: format ${v.format} does not fit a ${f.type} fact`);
    if(v.format==='money'&&e.format==='whisper')err('money appears only in revelations, never whispers');}
   for(const l of e.links??[])if(l.href!=='{signal.href}'&&!l.href.startsWith('/'))err(`link ${l.href} must be {signal.href} or an app path`);
   const limits=formatLimits[e.format];if(!limits){err(`unknown format ${e.format}`);continue;}
   if(e.variants.length<limits.minVariants)err(`${e.format} entries need at least ${limits.minVariants} variants (has ${e.variants.length})`);
   const vids=new Set<string>();let bangs=0;
   const examples={...Object.fromEntries(Object.entries(spec.facts).map(([k,f])=>[k,f.example])),...e.sample};
   for(const k of Object.keys(e.sample??{}))if(!spec.facts[k])err(`sample uses unknown fact ${k}`);
   if(e.trigger.when&&!conditionsHold(e.trigger.when,examples))err('sample facts do not meet the trigger conditions; add a fitting sample');
   for(const v of e.variants){variants++;
    if(vids.has(v.id))err(`duplicate variant id ${v.id}`);vids.add(v.id);
    const vat=`${e.id}/${v.id}`,verr=(m:string)=>errors.push(`${vat}: ${m}`);
    const sections=typeof v.body==='string'?[{text:v.body}]:v.body;
    for(const s of sections)for(const c of ('when' in s?s.when:undefined)??[])if(!spec.facts[c[0]])verr(`section condition uses unknown fact ${c[0]}`);
    if(['revelation','field-note','constellation'].includes(e.format)&&!v.title)verr(`${e.format} variants need a title`);
    if(e.format==='whisper'&&(v.title||typeof v.body!=='string'))verr('whispers are a single line with no title');
    const texts=[v.title??'',...sections.flatMap(s=>[('heading' in s?s.heading:'')??'',s.text])];
    for(const t of texts){for(const p of voiceProblems(t))verr(p);bangs+=(t.match(/!/g)??[]).length;
     for(const name of placeholders(t))if(!e.variables[name])verr(`{${name}} is not declared in variables`);}
    // Nullable facts may only appear inside a section that requires them.
    for(const s of sections)for(const name of placeholders(s.text)){const fact=e.variables[name]?.fact;if(fact&&spec.facts[fact]?.nullable&&!('requires' in s&&s.requires?.includes(fact)))verr(`{${name}} can be missing; put it in a section that requires ${fact}`);}
    for(const name of placeholders(v.title??'')){const fact=e.variables[name]?.fact;if(fact&&spec.facts[fact]?.nullable)verr(`{${name}} can be missing and cannot be in a title`);}
    for(const must of spec.mustShow??[])if(!texts.some(t=>placeholders(t).some(n=>e.variables[n]?.fact===must)))verr(`must show ${must} (this signal always states its evidence)`);
    // Render with the catalog's example facts: catches unknown variables and checks length as people will read it.
    const r=renderVariant(e,v,examples);
    if(!r)verr('does not render with the example facts');
    else{if(limits.title&&r.title&&r.title.length>limits.title)verr(`title is ${r.title.length} characters (limit ${limits.title})`);
     for(const s of r.sections)if(s.text.length>limits.body)verr(`text is ${s.text.length} characters (limit ${limits.body})`);
     const total=r.sections.reduce((n,s)=>n+s.text.length,0);if(limits.total&&total>limits.total)verr(`total ${total} characters (limit ${limits.total})`);}
    all.push({id:e.id,variant:v.id,text:texts.join(' ')});
   }
   if(bangs>maxExclamationsPerEntry)err(`${bangs} exclamation points across variants (limit ${maxExclamationsPerEntry})`);
  }
 }
 // Near-duplicates: an error within one entry (variants must differ), a warning across entries (to review).
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const s=similarity(all[i].text,all[j].text);
  if(all[i].id===all[j].id&&s>=.5)errors.push(`${all[i].id}: variants ${all[i].variant} and ${all[j].variant} are near-duplicates (${Math.round(s*100)}%)`);
  else if(all[i].id!==all[j].id&&s>=.45)warnings.push(`${all[i].id}/${all[i].variant} and ${all[j].id}/${all[j].variant} read alike (${Math.round(s*100)}%)`);}
 return {errors,warnings,entries:ids.size,variants,byStatus};
}
