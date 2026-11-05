// Guarded hosted migrations: staging first, production only with an explicit typed confirmation.
// The Supabase CLI stays linked to STAGING by default, so a stray `supabase db push` can never reach production.
// Usage: npm run db:remote:status | npm run db:push:staging | npm run db:push:production
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=resolve(root,'node_modules/.bin/supabase');
const projects={staging:{ref:'deazpeyomcwjplikbphl',name:'muse-staging'},production:{ref:'ajjtlpwpvxirwsygnzlt',name:'muse-production'}};
const refFile=resolve(root,'supabase/.temp/project-ref');
const linked=()=>existsSync(refFile)?readFileSync(refFile,'utf8').trim():'';
const label=ref=>Object.entries(projects).find(([,p])=>p.ref===ref)?.[0]??'unknown';
function run(args,{quiet=false}={}){const r=spawnSync(cli,args,{cwd:root,stdio:quiet?'pipe':'inherit',encoding:'utf8'});if(r.status!==0)throw Error(`supabase ${args[0]} ${args[1]??''} failed`);return r.stdout;}
const link=target=>run(['link','--project-ref',projects[target].ref],{quiet:true});
async function ask(question){const rl=createInterface({input:process.stdin,output:process.stdout});try{return (await rl.question(question)).trim();}finally{rl.close();}}

const action=process.argv[2];
try{
 if(action==='status'){console.log(`Supabase CLI is linked to: ${label(linked())} (${linked()||'nothing'})`);if(label(linked())!=='staging')console.log('Expected staging. Run: npm run db:link:staging');}
 else if(action==='link-staging'){link('staging');console.log(`Linked to staging (${projects.staging.ref}).`);}
 else if(action==='push-staging'){
  if(linked()!==projects.staging.ref)link('staging');
  console.log('STAGING: pending migrations (dry run):');run(['db','push','--dry-run']);
  if((await ask('Apply these to STAGING? Type "staging" to continue: '))!=='staging')throw Error('Cancelled.');
  run(['db','push']);
  console.log('Applied to staging. Verify (e.g. scripts/verify-hosted-*.sql) and check the app before production.');
 }
 else if(action==='push-production'){
  console.log('PRODUCTION push. Only after the same migrations are applied and verified on staging.');
  if((await ask(`Type the production project name (${projects.production.name}) to continue: `))!==projects.production.name)throw Error('Cancelled: production name not confirmed.');
  link('production');
  try{
   console.log('PRODUCTION: pending migrations (dry run):');run(['db','push','--dry-run']);
   if((await ask('Apply exactly these to PRODUCTION? Type "apply production": '))!=='apply production')throw Error('Cancelled.');
   run(['db','push']);console.log('Applied to production. Run the matching verify script now.');
  }finally{link('staging');console.log('CLI link returned to staging.');}
 }
 else throw Error('Use: status | link-staging | push-staging | push-production');
}catch(error){console.error(error.message);process.exitCode=1;}
