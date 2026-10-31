import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve,dirname,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dockerCandidates=[process.env.MUSE_DOCKER_PATH,resolve(homedir(),'.docker/bin/docker'),'/Applications/Docker.app/Contents/Resources/bin/docker','/usr/local/bin/docker','/opt/homebrew/bin/docker'].filter(Boolean);
const docker=dockerCandidates.find(existsSync)??'docker';
const env={...process.env,MUSE_REAL_DOCKER:docker,PATH:`${resolve(root,'scripts/bin')}${delimiter}${dirname(docker)}${delimiter}${process.env.PATH??''}`};
const cli=resolve(root,'node_modules/.bin/supabase');
function run(command,args,options={}){if(command===cli&&!['gen','status'].includes(args[0])&&!args.includes('--network-id'))args=[...args,'--network-id','muse-local-only'];const result=spawnSync(command,args,{cwd:root,env,encoding:'utf8',...options});if(result.error)throw result.error;if(result.status!==0){const detail=`${result.stderr??''}\n${result.stdout??''}`.replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+/g,'[redacted key]');throw new Error(`${command} ${args[0]} failed (${result.status}): ${detail.slice(-5000)}`)};return result.stdout;}
function loopback(url){return ['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname);}
try{
 const action=process.argv[2];
 const commands={start:['start','--network-id','muse-local-only'],stop:['stop'],status:['status'],migrate:['migration','up','--local'],test:['test','db','--local'],lint:['db','lint','--local','--schema','public'],types:['gen','types','typescript','--local','--schema','public']};
 if(!['env',...Object.keys(commands)].includes(action)||process.argv.length>3)throw new Error('Use start, stop, status, migrate, test, lint, types or env; remote commands are intentionally unsupported.');
 const config=readFileSync(resolve(root,'supabase/config.toml'),'utf8');
 if(!config.includes('project_id = "muse-local"'))throw new Error('Refusing an unexpected project configuration.');
 const endpoint=env.DOCKER_HOST||run(docker,['context','inspect','--format','{{.Endpoints.docker.Host}}']).trim();
 if(!endpoint.startsWith('unix://'))throw new Error('A local Docker Unix socket is required; remote Docker hosts are not supported.');
 run(docker,['info','--format','{{.ServerVersion}}']);
 if(action==='start'){
  const network=spawnSync(docker,['network','inspect','muse-local-only'],{env,encoding:'utf8'});
  if(network.status!==0)run(docker,['network','create','--driver','bridge','--opt','com.docker.network.bridge.host_binding_ipv4=127.0.0.1','muse-local-only']);
  else if(JSON.parse(network.stdout)[0].Options?.['com.docker.network.bridge.host_binding_ipv4']!=='127.0.0.1')throw new Error('Local Supabase network must publish on loopback only.');
 }
 if(action==='env'){
  const status=JSON.parse(run(cli,['status','--output','json']));
  if(!loopback(status.API_URL))throw new Error('Refusing to configure a non-local Supabase endpoint.');
  const publicKey=status.PUBLISHABLE_KEY??status.ANON_KEY,secretKey=status.SECRET_KEY??status.SERVICE_ROLE_KEY;
  if(!publicKey||!secretKey)throw new Error('Local status did not supply the required API keys.');
  const path=resolve(root,'.env.local');
  let text=existsSync(path)?readFileSync(path,'utf8'):'';
  const values={NEXT_PUBLIC_SUPABASE_URL:status.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:publicKey,SUPABASE_SECRET_KEY:secretKey,SITE_URL:'http://localhost:3000'};
  for(const [key,value]of Object.entries(values)){
   const pattern=new RegExp(`^${key}=(.*)$`,'m'),existing=text.match(pattern)?.[1]?.replace(/^['"]|['"]$/g,'');
   if(existing&&existing!==value)throw new Error(`Refusing to overwrite existing ${key}; review local configuration first.`);
  }
  for(const [key,value]of Object.entries(values)){const pattern=new RegExp(`^${key}=.*$`,'m');text=pattern.test(text)?text.replace(pattern,`${key}=${value}`):`${text}${text&&!text.endsWith('\n')?'\n':''}${key}=${value}\n`;}
  writeFileSync(path,text,{mode:0o600});chmodSync(path,0o600);console.log('Configured ignored .env.local for the local stack. Keys were not printed.');
 }else if(action==='types'){
  const generated=run(cli,commands.types);writeFileSync(resolve(root,'lib/database.types.ts'),generated);console.log('Generated local public-schema database types.');
 }else if(action==='status'){
  const status=JSON.parse(run(cli,['status','--output','json']));
  for(const key of ['API_URL','STUDIO_URL','MAILPIT_URL','INBUCKET_URL'])if(status[key])console.log(`${key}: ${status[key]}`);
 }else if(action==='start'){
  // CLI start prints keys on success. Capture stdout and report only non-secret status.
  run(cli,commands.start,{stdio:['inherit','pipe','inherit']});
  const names=run(docker,['ps','--format','{{.Names}}']).trim().split('\n').filter(name=>name.startsWith('supabase_')&&name.endsWith('_muse-local'));
  for(const name of names){
   const ports=JSON.parse(run(docker,['inspect',name,'--format','{{json .NetworkSettings.Ports}}']));
   const unsafe=Object.values(ports??{}).flatMap(value=>value??[]).some(value=>!['127.0.0.1','::1'].includes(value.HostIp));
   if(unsafe){run(cli,commands.stop,{stdio:'inherit'});throw new Error('Stopped Muse local services because a published port was not loopback-only.');}
  }
  console.log('Local Supabase stack started. Use npm run db:status for URLs and db:env for ignored credentials.');
 }else run(cli,commands[action],{stdio:'inherit'});
}catch(error){console.error(error.message);process.exitCode=1;}
