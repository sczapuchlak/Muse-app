// Disposable local database for the MVP 1 UI journeys. Never resets or alters muse-local.
import {spawnSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const target='/private/tmp/muse-mvp1-supabase',config=resolve(target,'supabase/config.toml');
const docker=resolve(process.env.MUSE_REAL_DOCKER??resolve(homedir(),'.docker/bin/docker'));
const cli=resolve(root,'node_modules/.bin/supabase');
const env={...process.env,MUSE_REAL_DOCKER:docker,PATH:[resolve(root,'scripts/bin'),resolve(docker,'..'),process.env.PATH].join(delimiter)};
function run(command,args){const result=spawnSync(command,args,{cwd:root,env,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw Error(`${args[0]} failed (exit ${result.status}).`);return result.stdout;}
const action=process.argv[2];
if(!['start','status','stop'].includes(action)||process.argv.length!==3)throw Error('Use start, status or stop.');
if(action==='start'){
 if(existsSync(config)&&!readFileSync(config,'utf8').includes('project_id = "muse-mvp1-priority1"'))throw Error('Refusing to alter another project configuration.');
 mkdirSync(resolve(target,'supabase'),{recursive:true});
 const sourceMigrations=resolve(root,'supabase/migrations'),targetMigrations=resolve(target,'supabase/migrations');
 if(existsSync(targetMigrations)){
  const before=readdirSync(targetMigrations).filter(x=>x.endsWith('.sql')).sort(),after=readdirSync(sourceMigrations).filter(x=>x.endsWith('.sql')).sort();
  if(JSON.stringify(before)!==JSON.stringify(after)||after.some(x=>readFileSync(resolve(sourceMigrations,x),'utf8')!==readFileSync(resolve(targetMigrations,x),'utf8')))throw Error('The isolated migration copy differs from this branch. Create a fresh isolated project before continuing; the shared database is untouched.');
 }
 let text=readFileSync(resolve(root,'supabase/config.toml'),'utf8').replace('project_id = "muse-local"','project_id = "muse-mvp1-priority1"');
 for(const [a,b] of [['54320','56320'],['54321','56321'],['54322','56322'],['54323','56323'],['54324','56324'],['54327','56327'],['54329','56329']])text=text.replaceAll(a,b);
 writeFileSync(config,text);
 cpSync(resolve(root,'supabase/migrations'),resolve(target,'supabase/migrations'),{recursive:true});
 cpSync(resolve(root,'supabase/templates'),resolve(target,'supabase/templates'),{recursive:true});
 try{
  run(cli,['start','--workdir',target,'--network-id','muse-local-only']);
  const names=run(docker,['ps','--filter','name=muse-mvp1-priority1','--format','{{.Names}}']).trim().split('\n').filter(name=>name.startsWith('supabase_')&&name.endsWith('_muse-mvp1-priority1'));
  if(!names.includes('supabase_db_muse-mvp1-priority1'))throw Error('The isolated database did not start.');
  for(const name of names){const ports=JSON.parse(run(docker,['inspect',name,'--format','{{json .NetworkSettings.Ports}}']));if(Object.values(ports??{}).flatMap(v=>v??[]).some(v=>!['127.0.0.1','::1'].includes(v.HostIp)))throw Error('An isolated service published a non-loopback port.');}
 }catch(error){try{run(cli,['stop','--workdir',target]);}catch{}throw error;}
 console.log('Isolated MVP 1 database started on loopback port 56322.');
}else{
 if(!existsSync(config)||!readFileSync(config,'utf8').includes('project_id = "muse-mvp1-priority1"'))throw Error('Isolated MVP 1 configuration is missing.');
 if(action==='stop'){run(cli,['stop','--workdir',target]);console.log('Stopped isolated MVP 1 services.');}
 else {const ports=JSON.parse(run(docker,['inspect','supabase_db_muse-mvp1-priority1','--format','{{json .NetworkSettings.Ports}}']));console.log(JSON.stringify(ports));}
}
