#!/usr/bin/env node
/**
 * Stream report review (#69), for the Muse team only. There is no admin route: this script calls two database
 * functions that only the service role may execute (`stream_reports_review`, `stream_report_resolve`).
 *
 *   node scripts/stream-reports.mjs                         list open reports (local database, from .env.local)
 *   node scripts/stream-reports.mjs --all                   include resolved reports
 *   node scripts/stream-reports.mjs --resolve <report-id> --as no-action|unpublished|comment-removed [--note "why"]
 *
 * Hosted projects: set STREAM_REVIEW_URL and STREAM_REVIEW_SECRET_KEY for that one command (never commit them).
 * Production also asks you to type the project name. Resolving never deletes a post: "unpublished" returns it to
 * Only me (its author still has it); "comment-removed" deletes only the reported comment.
 */
import {loadEnvFile} from 'node:process';
import {createInterface} from 'node:readline/promises';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
const require=createRequire(import.meta.url);const {createClient}=require('@supabase/supabase-js');
const args=process.argv.slice(2),flag=n=>args.includes(n),value=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:undefined;};

let url=process.env.STREAM_REVIEW_URL,key=process.env.STREAM_REVIEW_SECRET_KEY;
if(!url||!key){if(existsSync('.env.local'))loadEnvFile('.env.local');url=process.env.NEXT_PUBLIC_SUPABASE_URL;key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||!['localhost','127.0.0.1'].includes(new URL(url).hostname)){console.error('Local review needs a local NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. For a hosted project set STREAM_REVIEW_URL and STREAM_REVIEW_SECRET_KEY.');process.exit(2);}}
const host=new URL(url).hostname,production=host.startsWith('ajjtlpwpvxirwsygnzlt.');
console.log(`Reviewing Stream reports on ${production?'PRODUCTION':host.startsWith('deazpeyomcwjplikbphl.')?'staging':host}.`);
if(production){const rl=createInterface({input:process.stdin,output:process.stdout});const typed=(await rl.question('Type muse-production to continue: ')).trim();rl.close();if(typed!=='muse-production'){console.error('Cancelled.');process.exit(1);}}
const admin=createClient(url,key,{auth:{persistSession:false}});

const resolve=value('--resolve');
if(resolve){
 const as=value('--as');if(!['no-action','unpublished','comment-removed'].includes(as??'')){console.error('Use --as no-action, unpublished or comment-removed.');process.exit(2);}
 const {data,error}=await admin.rpc('stream_report_resolve',{p_report:resolve,p_resolution:as,p_note:value('--note')??''});
 if(error){console.error(`Not resolved: ${error.message}`);process.exit(1);}
 console.log(`Resolved: ${data.resolution}.`);process.exit(0);
}
const {data,error}=await admin.rpc('stream_reports_review',{p_include_resolved:flag('--all')});
if(error){console.error(`Could not read reports: ${error.message}`);process.exit(1);}
if(!data.length){console.log(flag('--all')?'No reports.':'No open reports.');process.exit(0);}
for(const r of data){
 console.log(`\n${r.id}  ${r.resolution?`[${r.resolution}]`:'[open]'}  ${r.reason}${r.reports>1?` · ${r.reports} reports`:''} · ${r.createdAt.slice(0,16).replace('T',' ')}`);
 if(r.note)console.log(`  Reporter's note: ${r.note}`);
 console.log(`  Post (${r.postAudience}): ${r.postBody||'(no text)'}${r.postDisplay?.title?` · ${r.postDisplay.title}`:''}`);
 if(r.commentId)console.log(`  Reported comment: ${r.commentBody??'(already removed)'}`);
}
