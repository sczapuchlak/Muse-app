// A separate Supabase project for #133. Never runs reset or alters the shared muse-local project.
import {spawnSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const target='/private/tmp/muse-133-supabase',config=resolve(target,'supabase/config.toml');
const docker=resolve(process.env.MUSE_REAL_DOCKER??resolve(homedir(),'.docker/bin/docker'));
const cli=resolve(root,'node_modules/.bin/supabase');
const env={...process.env,MUSE_REAL_DOCKER:docker,PATH:[resolve(root,'scripts/bin'),resolve(docker,'..'),process.env.PATH].join(delimiter)};
function run(command,args){const result=spawnSync(command,args,{cwd:root,env,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw Error(`${args[0]} failed (exit ${result.status}).`);return result.stdout;}
const action=process.argv[2];
if(!['start','rebuild','test','test-all','status','stop'].includes(action)||process.argv.length!==3)throw Error('Use start, rebuild, test, status or stop.');
if(action==='rebuild'){
 if(!existsSync(config)||!readFileSync(config,'utf8').includes('project_id = "muse-issue-133"'))throw Error('Refusing to rebuild an unexpected project.');
 run(cli,['stop','--workdir',target,'--no-backup']);
 rmSync(resolve(target,'supabase/migrations'),{recursive:true,force:true});
}
if(action==='start'||action==='rebuild'){
 mkdirSync(resolve(target,'supabase'),{recursive:true});
 const sourceMigrations=resolve(root,'supabase/migrations'),targetMigrations=resolve(target,'supabase/migrations');
 if(existsSync(targetMigrations)){
  const before=readdirSync(targetMigrations).filter(x=>x.endsWith('.sql')).sort(),after=readdirSync(sourceMigrations).filter(x=>x.endsWith('.sql')).sort();
  if(JSON.stringify(before)!==JSON.stringify(after)||after.some(x=>readFileSync(resolve(sourceMigrations,x),'utf8')!==readFileSync(resolve(targetMigrations,x),'utf8')))throw Error('The isolated migration copy differs from this branch. Create a fresh isolated project before continuing; the shared database is untouched.');
 }
 let text=readFileSync(resolve(root,'supabase/config.toml'),'utf8').replace('project_id = "muse-local"','project_id = "muse-issue-133"');
 for(const [a,b] of [['54320','55320'],['54321','55321'],['54322','55322'],['54323','55323'],['54324','55324'],['54327','55327'],['54329','55329']])text=text.replaceAll(a,b);
 writeFileSync(config,text);
 cpSync(resolve(root,'supabase/migrations'),resolve(target,'supabase/migrations'),{recursive:true});
 cpSync(resolve(root,'supabase/templates'),resolve(target,'supabase/templates'),{recursive:true});
 try{
  run(cli,['start','--workdir',target,'--network-id','muse-local-only']);
  const names=run(docker,['ps','--filter','name=muse-issue-133','--format','{{.Names}}']).trim().split('\n').filter(name=>name.startsWith('supabase_')&&name.endsWith('_muse-issue-133'));
  if(!names.includes('supabase_db_muse-issue-133'))throw Error('The isolated database did not start.');
  for(const name of names){const ports=JSON.parse(run(docker,['inspect',name,'--format','{{json .NetworkSettings.Ports}}']));if(Object.values(ports??{}).flatMap(v=>v??[]).some(v=>!['127.0.0.1','::1'].includes(v.HostIp)))throw Error('An isolated service published a non-loopback port.');}
 }catch(error){try{run(cli,['stop','--workdir',target]);}catch{}throw error;}
 console.log('Isolated #133 database started on loopback port 55322.');
}else{
 if(!existsSync(config)||!readFileSync(config,'utf8').includes('project_id = "muse-issue-133"'))throw Error('Isolated #133 configuration is missing.');
 if(action==='test'||action==='test-all'){
  const source=resolve(root,'supabase/migrations'),copy=resolve(target,'supabase/migrations');
  const a=readdirSync(source).filter(x=>x.endsWith('.sql')).sort(),b=readdirSync(copy).filter(x=>x.endsWith('.sql')).sort();
  if(JSON.stringify(a)!==JSON.stringify(b)||a.some(x=>readFileSync(resolve(source,x),'utf8')!==readFileSync(resolve(copy,x),'utf8')))throw Error('The isolated database uses an older migration copy. Do not treat its results as verification of the current branch.');
  const files=action==='test-all'?readdirSync(resolve(root,'supabase/tests/database')).filter(f=>f.endsWith('.sql')):['book_import.test.sql'];
  for(const file of files){
   const test=readFileSync(resolve(root,'supabase/tests/database',file),'utf8');
   const result=spawnSync(docker,['exec','-i','supabase_db_muse-issue-133','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{cwd:root,env,encoding:'utf8',input:'begin; create extension if not exists pgtap with schema extensions; set local search_path=public,extensions;\n'+test});
   if(result.status!==0||/not ok\s+\d/.test(result.stdout??'')){console.error(result.stdout,result.stderr);throw Error('Isolated database tests failed: '+file);}
   console.log('PASS '+file);
  }
 }else if(action==='stop'){run(cli,['stop','--workdir',target]);console.log('Stopped isolated #133 services.');}
 else {const ports=JSON.parse(run(docker,['inspect','supabase_db_muse-issue-133','--format','{{json .NetworkSettings.Ports}}']));console.log(JSON.stringify(ports));}
}
