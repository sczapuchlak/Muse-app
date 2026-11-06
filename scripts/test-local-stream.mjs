// #27 Stream of Consciousness: audiences, snapshots, reactions, comments, spoilers, notifications and revocation,
// tested with disposable local accounts. Local Supabase only. Run: npm run test:stream:db
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(url&&['localhost','127.0.0.1'].includes(new URL(url).hostname),'Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),users=[];
const must=result=>{if(result.error)throw result.error;return result.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const tag=crypto.randomUUID().slice(0,6);
async function person(name){
 const link=must(await admin.auth.admin.generateLink({type:'invite',email:`stream-${name}-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));
 const p={id:link.user.id,client,username:`${name}${tag}`};p.pid=must(await client.rpc('social_create_identity',{p_username:p.username,p_display_name:name}));return p;
}
const rpc=(p,fn,args={})=>p.client.rpc(fn,args);
const befriend=async(a,b)=>{must(await b.client.from('social_identities').update({discoverable:true}).eq('user_id',b.id));must(await rpc(a,'social_send_request',{p_target:b.pid}));must(await rpc(b,'social_accept',{p_target:a.pid}));};
const feedIds=async p=>must(await rpc(p,'stream_feed',{})).map(x=>x.id);
const publish=(p,args)=>rpc(p,'stream_publish',{p_id:crypto.randomUUID(),p_body:'',...args});
let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;};
try{
 const [ava,bea,cal,dee,eve]=await Promise.all(['ava','bea','cal','dee','eve'].map(person));
 await befriend(ava,bea);await befriend(ava,cal);

 // Direct table access is closed: everything goes through checked functions.
 for(const table of ['stream_posts','stream_post_members','stream_reactions','stream_comments','stream_notifications','notification_preferences'])
  check(!!(await bea.client.from(table).select('*').limit(1)).error,`no direct reads of ${table}`);
 check(!!(await ava.client.from('stream_posts').insert({id:crypto.randomUUID(),author:ava.id,kind:'status',body:'sneaky'})).error,'no direct inserts');

 // Statuses: private by default, idempotent, chronological.
 const quiet=must(await publish(ava,{p_body:'having a suspiciously productive Tuesday.'}));
 check(must(await rpc(ava,'stream_feed',{}))[0].audience==='private','new posts default to Only me');
 check(!(await feedIds(bea)).includes(quiet.id),'friends cannot see an Only me post');
 const loudId=crypto.randomUUID(),loudArgs={p_id:loudId,p_body:'reading three books and finishing none.',p_audience:'friends',p_decoration:'choosing-chaos'};
 must(await rpc(ava,'stream_publish',loudArgs));must(await rpc(ava,'stream_publish',loudArgs));
 check(sql(`select count(*) from public.stream_posts where id='${loudId}'`)==='1','a double submit never posts twice');
 check((await feedIds(bea)).includes(loudId)&&(await feedIds(cal)).includes(loudId),'friends see a friends post');
 check(!(await feedIds(dee)).includes(loudId),'non-friends never see it');
 check(must(await rpc(dee,'stream_post',{p_id:loudId}))===null,'opening it directly reads as not found for others');
 check(!!(await publish(ava,{p_body:'   '})).error,'a status needs words');
 check(!!(await publish(ava,{p_body:'x',p_decoration:'random'})).error,'decorations come from the allow-list');
 const later=must(await publish(ava,{p_body:'second thought',p_audience:'friends'}));
 const order=await feedIds(bea);check(order.indexOf(later.id)<order.indexOf(loudId),'newest first, strictly chronological');

 // Canonical sources: real records only, owned by the author, matching the shortcut, approved fields only.
 const bookId=crypto.randomUUID();
 must(await rpc(ava,'save_whimsy_record',{p_kind:'books',p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:{id:bookId,title:'Six of Crows',author:'Leigh Bardugo',status:'reading',totalPages:100,currentPage:42,reviewEmojis:[]},p_delete:false}));
 const book={p_category:'reading',p_source_kind:'book',p_source_id:bookId,p_display:{kind:'book',title:'Six of Crows',subtitle:'Leigh Bardugo',progress:42},p_audience:'friends'};
 check(!!(await publish(bea,book)).error,'nobody can post someone else’s record');
 check(!!(await publish(ava,{...book,p_source_id:crypto.randomUUID()})).error,'records must exist');
 check(!!(await publish(ava,{...book,p_category:'feeling'})).error,'shortcuts accept only their own record types');
 check(!!(await publish(ava,{...book,p_display:{title:'Six of Crows',journal:'private notes'}})).error,'snapshots accept only allow-listed fields');
 check(!!(await publish(ava,{...book,p_display:{title:'x',excerpt:'y'.repeat(281)}})).error,'excerpts are bounded');
 const reading=must(await publish(ava,{...book,p_body:'These people are making terrible decisions and I support them.'}));
 must(await rpc(ava,'save_whimsy_record',{p_kind:'books',p_expected_revision:1,p_command_id:crypto.randomUUID(),p_record:{id:bookId,title:'Six of Crows',author:'Leigh Bardugo',status:'reading',totalPages:100,currentPage:85,reviewEmojis:[]},p_delete:false}));
 const seen=must(await rpc(bea,'stream_post',{p_id:reading.id}));
 check(seen.display.progress===42,'the published snapshot keeps the moment it was shared (42%, not 85%)');
 check(!('sourceId' in seen)&&!JSON.stringify(seen).includes(bookId),'friends never receive the source record id');
 check(must(await publish(ava,{...book,p_display:{kind:'book',title:'Six of Crows',progress:85}})).display.progress===85,'later updates about the same record are separate posts');

 // Mood and dream sources.
 const dayId=sql(`insert into public.daily_records(user_id,local_date,time_zone) values ('${ava.id}','2026-11-01','UTC') returning id`).split('\n')[0];
 const moodId=sql(`insert into public.mood_checkins(user_id,daily_record_id,period,reflection,captured_time_zone) values ('${ava.id}','${dayId}','evening','Private journal: very secret','UTC') returning id`).split('\n')[0];
 const mood=must(await publish(ava,{p_category:'feeling',p_source_kind:'mood',p_source_id:moodId,p_display:{kind:'mood',title:'Hopeful and a little anxious',meta:['Hopeful','Anxious']},p_audience:'friends'}));
 check(!JSON.stringify(must(await rpc(bea,'stream_post',{p_id:mood.id}))).includes('very secret'),'mood posts never carry the private reflection');

 // Selected friends: explicit, fixed membership.
 const picked=must(await publish(ava,{p_body:'only for Bea',p_audience:'selected',p_members:[bea.pid]}));
 check((await feedIds(bea)).includes(picked.id)&&!(await feedIds(cal)).includes(picked.id),'selected friends: only the people chosen');
 check(!!(await publish(ava,{p_body:'x',p_audience:'selected',p_members:[dee.pid]})).error,'only current friends can be selected');
 check(!!(await publish(ava,{p_body:'x',p_audience:'selected',p_members:[]})).error,'selected audiences need someone');
 await befriend(ava,eve);
 check(!(await feedIds(eve)).includes(picked.id)&&(await feedIds(eve)).includes(loudId),'a new friend sees friends posts but never older selected posts');

 // Reactions: one contextual primary reaction per post; given once, taken back, permission-checked.
 must(await rpc(bea,'stream_react',{p_post:loudId,p_on:true}));must(await rpc(bea,'stream_react',{p_post:loudId,p_on:true}));
 let post=must(await rpc(cal,'stream_post',{p_id:loudId}));check(post.reactionCount===1&&post.primaryReaction==='react','a repeated reaction is not duplicated; statuses use React');
 check(must(await rpc(bea,'stream_post',{p_id:loudId})).reacted===true,'the reactor sees their own reaction');
 check(!!(await rpc(dee,'stream_react',{p_post:loudId,p_on:true})).error,'people who cannot see a post cannot react');
 check(!!(await rpc(bea,'stream_react',{p_post:quiet.id,p_on:true})).error,'not even on a private post they guessed');
 let notes=must(await rpc(ava,'stream_notifications',{}));check(notes.filter(n=>n.kind==='reaction'&&n.postId===loudId).length===1,'one reaction notification per person and post');
 must(await rpc(cal,'stream_react',{p_post:loudId,p_on:true}));must(await rpc(cal,'stream_react',{p_post:loudId,p_on:false}));
 check(must(await rpc(ava,'stream_post',{p_id:loudId})).reactionCount===1,'a reaction can be taken back');
 // The primary reaction suits the post: moods Love/Joy/neutral, rituals Cheer, celebrations Celebrate, others React.
 check(!!(await publish(ava,{p_body:'x',p_primary_reaction:'celebrate'})).error,'a status cannot claim Celebrate');
 check(!!(await publish(ava,{...book,p_primary_reaction:'love'})).error,'reading posts use React');
 check(must(await publish(ava,{p_category:'feeling',p_source_kind:'mood',p_source_id:moodId,p_display:{kind:'mood',title:'Hopeful'},p_primary_reaction:'joy'})).primaryReaction==='joy','happy moods can Share Joy');

 // Comments.
 const c1=crypto.randomUUID(),c2=crypto.randomUUID();
 must(await rpc(bea,'stream_comment',{p_post:loudId,p_id:c1,p_body:'Same, honestly.'}));must(await rpc(bea,'stream_comment',{p_post:loudId,p_id:c1,p_body:'Same, honestly.'}));
 must(await rpc(cal,'stream_comment',{p_post:loudId,p_id:c2,p_body:'Which three?'}));
 check(must(await rpc(cal,'stream_comments',{p_post:loudId})).length===2,'friends read the conversation; retries do not duplicate');
 check(!!(await rpc(dee,'stream_comments',{p_post:loudId})).error&&!!(await rpc(dee,'stream_comment',{p_post:loudId,p_id:crypto.randomUUID(),p_body:'hi'})).error,'others can neither read nor write comments');
 check(!!(await rpc(bea,'stream_comment',{p_post:loudId,p_id:crypto.randomUUID(),p_body:'x'.repeat(1001)})).error,'comments are length-limited');
 must(await rpc(bea,'stream_edit_comment',{p_id:c1,p_body:'Same, honestly. All three.'}));
 check(!!(await rpc(cal,'stream_edit_comment',{p_id:c1,p_body:'hijack'})).error&&!!(await rpc(cal,'stream_delete_comment',{p_id:c1})).error,'only the comment’s author edits it; others cannot remove it');
 must(await rpc(ava,'stream_delete_comment',{p_id:c2}));check(must(await rpc(bea,'stream_comments',{p_post:loudId})).length===1,'post authors can moderate their conversation');
 must(await rpc(ava,'stream_edit',{p_id:loudId,p_body:loudArgs.p_body,p_decoration:'choosing-chaos',p_comments_enabled:false}));
 check(!!(await rpc(bea,'stream_comment',{p_post:loudId,p_id:crypto.randomUUID(),p_body:'hello'})).error,'authors can switch comments off per post');
 check(must(await rpc(bea,'stream_post',{p_id:loudId})).commentsEnabled===false,'readers see that comments are off');
 must(await rpc(ava,'stream_edit',{p_id:loudId,p_body:loudArgs.p_body,p_decoration:'choosing-chaos',p_comments_enabled:true}));
 // Reporting reaches the Muse team only.
 must(await rpc(bea,'stream_report',{p_post:loudId,p_reason:'unkind',p_note:'test'}));must(await rpc(bea,'stream_report',{p_post:loudId,p_reason:'unkind'}));
 check(sql(`select count(*) from public.stream_reports where post_id='${loudId}'`)==='1','a report is recorded once');
 check(!!(await rpc(dee,'stream_report',{p_post:loudId,p_reason:'spam'})).error,'only people who can see a post can report it');
 check(!!(await ava.client.from('stream_reports').select('*')).error,'nobody can read reports from the app');

 // Spoilers never leak into notifications.
 const spoil=must(await publish(ava,{...book,p_body:'Kaz dies at the end',p_spoiler:true,p_display:{kind:'book',title:'Six of Crows',progress:90}}));
 must(await rpc(bea,'stream_comment',{p_post:spoil.id,p_id:crypto.randomUUID(),p_body:'NO'}));
 notes=must(await rpc(ava,'stream_notifications',{}));const sn=notes.find(n=>n.postId===spoil.id);
 check(sn&&!sn.excerpt.includes('Kaz'),'spoiler text never appears in notifications');

 // Notification preferences.
 must(await rpc(ava,'set_stream_preferences',{p_show_in_navigation:true,p_reactions:false,p_comments:true,p_friend_requests:true,p_friend_accepted:true}));
 must(await rpc(cal,'stream_react',{p_post:later.id,p_on:true}));
 check(!must(await rpc(ava,'stream_notifications',{})).some(n=>n.kind==='reaction'),'switched-off kinds are neither created nor shown');
 must(await rpc(ava,'set_stream_preferences',{p_show_in_navigation:false,p_reactions:true,p_comments:true,p_friend_requests:true,p_friend_accepted:true}));
 check(must(await rpc(ava,'stream_preferences',{})).showInNavigation===false&&(await feedIds(bea)).includes(loudId),'hiding Stream from navigation never unpublishes anything');
 check(must(await rpc(ava,'stream_notifications',{})).some(n=>n.kind==='friend-accepted'),'friend acceptances notify through the existing request flow');

 // Editing, audience changes and unpublishing.
 must(await rpc(ava,'stream_edit',{p_id:later.id,p_body:'second thought, edited',p_audience:'private'}));
 check(!(await feedIds(bea)).includes(later.id),'unpublishing to Only me hides it immediately');
 must(await rpc(ava,'stream_edit',{p_id:later.id,p_body:'second thought, edited',p_audience:'friends'}));
 const edited=must(await rpc(bea,'stream_post',{p_id:later.id}));check(edited.body==='second thought, edited'&&edited.editedAt,'publishing again shows the edit');
 check(!!(await rpc(bea,'stream_edit',{p_id:later.id,p_body:'hijack'})).error,'only authors edit');
 check(!!(await rpc(ava,'stream_edit',{p_id:quiet.id,p_body:'x',p_audience:'selected'})).error,'switching to selected friends needs people');

 // Unfriending revokes access, conversation and counts.
 must(await rpc(cal,'stream_comment',{p_post:loudId,p_id:crypto.randomUUID(),p_body:'Cal was here'}));
 must(await rpc(ava,'social_remove_friend',{p_target:cal.pid}));
 check(!(await feedIds(cal)).includes(loudId)&&!!(await rpc(cal,'stream_react',{p_post:loudId,p_reaction:'love'})).error,'unfriending revokes access immediately');
 const afterUnfriend=must(await rpc(bea,'stream_comments',{p_post:loudId}));check(!afterUnfriend.some(c=>c.body==='Cal was here'),'a former friend’s comments leave the conversation');
 check(must(await rpc(bea,'stream_post',{p_id:later.id})).reactionCount===0,'a former friend’s reactions leave the counts');

 // Blocking revokes everything both ways.
 must(await rpc(ava,'social_block',{p_target:bea.pid}));
 check((await feedIds(bea)).every(id=>![loudId,picked.id,reading.id].includes(id)),'blocking hides every post');
 check(!must(await rpc(ava,'stream_notifications',{})).some(n=>n.actor.username===bea.username),'notifications from a blocked person disappear');
 check(!!(await rpc(bea,'stream_comments',{p_post:loudId})).error,'a blocked person cannot read the conversation');
 must(await rpc(ava,'social_unblock',{p_target:bea.pid}));

 // Deleted sources and deleted posts.
 const before=(await feedIds(eve)).includes(reading.id);
 must(await rpc(ava,'save_whimsy_record',{p_kind:'books',p_expected_revision:2,p_command_id:crypto.randomUUID(),p_record:{id:bookId,title:'Six of Crows',status:'reading',reviewEmojis:[]},p_delete:true}));
 check(before&&!(await feedIds(eve)).includes(reading.id),'deleting the source record hides its posts from friends');
 const mineNow=must(await rpc(ava,'stream_post',{p_id:reading.id}));check(mineNow.sourceMissing&&mineNow.display===null,'the author sees a notice instead of the snapshot');
 sql(`delete from public.mood_checkins where id='${moodId}'`);check(!(await feedIds(eve)).includes(mood.id),'a deleted mood entry hides its post');
 must(await rpc(ava,'stream_delete',{p_id:loudId}));
 check(sql(`select count(*) from public.stream_reactions where post_id='${loudId}'`)==='0'&&sql(`select count(*) from public.stream_comments where post_id='${loudId}'`)==='0','deleting a post removes its interactions');
 check(!!(await rpc(bea,'stream_delete',{p_id:later.id})).error,'only authors delete');
 const dreamId=crypto.randomUUID();
 must(await rpc(ava,'save_whimsy_record',{p_kind:'dreams',p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:{id:dreamId,date:'2026-11-01',timeZone:'UTC',loggedAt:new Date().toISOString(),text:'Private dream narrative',symbolIds:[],emotions:[],interpretation:''},p_delete:false}));
 const dream=must(await publish(ava,{p_category:'dreaming',p_source_kind:'dream',p_source_id:dreamId,p_display:{kind:'dream',title:'The library that floated'},p_audience:'friends'}));
 must(await rpc(ava,'stream_delete',{p_id:dream.id}));
 check(sql(`select count(*) from public.whimsy_dream_entries where id='${dreamId}'`)==='1','deleting a post never deletes its source record');

 // Filters: All, Reading & Watching, Life Updates, Whimsy, Celebrations.
 const rw=must(await rpc(ava,'stream_feed',{p_category:'reading-watching'}));check(rw.length>0&&rw.every(p=>['reading','watching'].includes(p.category)),'Reading & Watching filter');
 const life=must(await rpc(ava,'stream_feed',{p_category:'life'}));check(life.length>0&&life.every(p=>p.kind==='status'||p.category==='feeling'),'Life Updates filter');

 // Money milestones: a dedicated shape referencing a real paid bill; never amounts or names.
 const billId=crypto.randomUUID();
 sql(`insert into public.bills(id,user_id,name,amount_cents,due_date,recurrence,paid,captured_time_zone) values ('${billId}','${ava.id}','Rent at 12 Main St',185000,'2026-11-01','monthly',true,'UTC')`);
 const money={p_category:'money',p_source_kind:'money-milestone',p_source_id:billId,p_primary_reaction:'celebrate',p_audience:'friends'};
 check(!!(await publish(ava,{...money,p_display:{kind:'money-milestone',title:'Paid $1,850 rent'}})).error,'money milestones accept only the fixed headlines');
 check(!!(await publish(ava,{...money,p_display:{kind:'money-milestone',title:'Paid a bill on time',subtitle:'Rent at 12 Main St'}})).error,'money milestones carry no names or details');
 const paid=must(await publish(ava,{...money,p_display:{kind:'money-milestone',title:'Paid a bill on time',glyph:'trophy'}}));
 check(!JSON.stringify(must(await rpc(eve,'stream_post',{p_id:paid.id}))).match(/1850|Main St/),'friends see the milestone, never the bill');
 const unpaid=crypto.randomUUID();sql(`insert into public.bills(id,user_id,name,amount_cents,due_date,recurrence,paid,captured_time_zone) values ('${unpaid}','${ava.id}','Phone',5000,'2026-11-02','monthly',false,'UTC')`);
 check(!!(await publish(ava,{...money,p_source_id:unpaid,p_display:{kind:'money-milestone',title:'Paid a bill on time'}})).error,'an unpaid bill is not a milestone');
 const cele=must(await rpc(ava,'stream_feed',{p_category:'celebrations'}));check(cele.some(p=>p.id===paid.id)&&cele.every(p=>['celebrating','rituals','money'].includes(p.category)),'Celebrations filter');

 // Profile recent activity: only what the viewer may see.
 const recent=must(await rpc(eve,'stream_feed',{p_author:ava.pid}));
 check(recent.length>0&&recent.every(p=>p.author.username===ava.username)&&!recent.some(p=>p.id===picked.id||p.id===quiet.id),'a profile’s recent posts obey the same audiences');
 check(must(await rpc(dee,'stream_feed',{p_author:ava.pid})).length===0,'non-friends see no recent activity');

 // Paused participation.
 must(await ava.client.from('social_identities').update({participation:'paused'}).eq('user_id',ava.id));
 check(!!(await publish(ava,{p_body:'hello?'})).error,'paused accounts cannot post');
 check(!(await feedIds(eve)).includes(later.id),'a paused author’s posts are hidden');
 console.log(`Stream: ${passed} checks passed.`);
}finally{
 for(const id of users)await admin.auth.admin.deleteUser(id).catch(()=>{});
}
