import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {root} from './helpers.mjs';
const models=load('lib/collections/models'),insights=load('lib/collections/insights');
const media=(id,kind,status,completed_on=null)=>({id,user_id:'owner',kind,title:id,creator:'Creator',cover_url:null,status,genres:['Fantasy'],rating:null,favorite:false,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z',completed_on});
const series=(scope='released',conclusion_state='unknown')=>({id:'series',kind:'movie',scope,conclusion_state});
const member=(id,sequence,release_state='released')=>({id,series_id:'series',media_id:id,book_id:null,sequence,release_state,role:'mainline'});
test('Book editor offers the same Currently Reading status as shelf filters',()=>{
 const source=readFileSync(resolve(root,'components/whimsy/Bookshelf.tsx'),'utf8');
 assert.match(source,/reading:'Currently Reading'/);
 assert.match(source,/MuseChoiceMenu label="Book status"[^\n]*options=\{Object\.entries\(bookStatus\)/);
 const collections=readFileSync(resolve(root,'components/collections/Collections.tsx'),'utf8');
 assert.match(collections,/reading:'Currently Reading'/,'Collections › Books filters use the same Currently Reading label');
 assert.match(collections,/label:`Archived books \(\$\{archivedItems\.length\}\)`/,'archived books stay reachable from Collections');
});
test('active media shelves reuse existing items and statuses without excluding full-library records',()=>{
 const items=[media('watching-film','movie','watching'),media('watched-film','movie','watched'),media('watching-show','tv','watching'),media('playing-game','game','playing'),media('planned-game','game','planned')];
 assert.deepEqual(models.activeMediaItems(items,'movie').map(item=>item.id),['watching-film']);
 assert.deepEqual(models.activeMediaItems(items,'tv').map(item=>item.id),['watching-show']);
 assert.deepEqual(models.activeMediaItems(items,'game').map(item=>item.id),['playing-game']);
 assert.strictEqual(models.activeMediaItems(items,'movie')[0],items[0]);
 assert.equal(items.length,5);
});
test('series progress distinguishes released, announced and selected denominators',()=>{
 const items=[media('one','movie','watched'),media('two','movie','planned')],members=[member('one',1),member('two',2,'announced')];
 let result=models.seriesProgress(series('released'),members,[],items);
 assert.equal(result.completed,1);assert.equal(result.total,1);assert.equal(result.status,'caught-up');
 result=models.seriesProgress(series('announced'),members,[],items);
 assert.equal(result.completed,1);assert.equal(result.total,2);assert.equal(result.availableTotal,1);assert.equal(result.percentage,100);assert.equal(result.status,'caught-up');
 // #104: an announced installment is never "Next up"; only released, unfinished ones are.
 assert.equal(result.next,null);
 result=models.seriesProgress(series('selected'),members,[],items);
 assert.equal(result.total,2);
 result=models.seriesProgress(series('released'),[member('one',1)],[],items);
 assert.equal(result.status,'caught-up');
 result=models.seriesProgress(series('released','concluded'),[member('one',1)],[],items);
 assert.equal(result.status,'completed');
 result=models.seriesProgress(series('released','concluded'),members,[],items);
 assert.equal(result.status,'caught-up','an announced installment keeps a concluded series from appearing fully complete');
 result=models.seriesProgress(series('released'),[member('two',1)],[],items);
 assert.equal(result.status,'not-started');
 result=models.seriesProgress(series('released'),[],[],items);
 assert.equal(result.percentage,null);
});
test('TV progress excludes announced, future, and special episodes from available denominator',()=>{
 const episode=(id,season_number,episode_number,release_state='released',air_date='2026-11-01',special=false)=>({id,show_id:'show',season_number,episode_number,release_state,air_date,special});
 const episodes=[episode('one',1,1),episode('two',1,2),episode('future',1,3,'announced'),episode('later',2,1,'released','2026-12-01'),episode('special',0,1,'released','2026-11-01',true)];
 const activity=[{media_id:'show',episode_id:'one',kind:'episode-watch'}];
 const result=models.tvProgress('show',episodes,activity,'2026-11-03');
 assert.equal(result.available,2);assert.equal(result.watched,1);assert.equal(result.next.id,'two');assert.equal(result.seasons.find(row=>row.season===1).watched,1);assert.equal(result.seasons.find(row=>row.season===2).released,false);
});
test('season summaries allow whole-season and manual-count progress without episode rows',()=>{
 const season=(number,total,watched,release_state='released',watchedFlag=false)=>({id:String(number),show_id:'show',season_number:number,total_episodes:total,watched_episodes:watched,release_state,watched:watchedFlag});
 const rows=[season(1,10,10),season(2,8,4),season(3,12,0,'announced')];
 let result=models.tvProgress('show',[],[],'2026-11-04',rows,'ongoing');
 assert.equal(result.status,'in-progress');assert.equal(result.completedSeasons,1);assert.equal(result.releasedSeasons,2);assert.equal(result.watched,14);assert.equal(result.available,18);
 result=models.tvProgress('show',[],[],'2026-11-04',[season(1,null,0,'released',true),season(2,10,0,'announced')],'unknown');
 assert.equal(result.status,'caught-up');assert.equal(result.completedSeasons,1);
 result=models.tvProgress('show',[],[],'2026-11-04',[season(1,null,0,'released',true)],'concluded');
 assert.equal(result.status,'completed');
 result=models.tvProgress('show',[],[],'2026-11-04',[season(1,null,0,'released',true),season(2,8,0,'announced')],'concluded');
 assert.equal(result.status,'caught-up');
 const episode={id:'new',show_id:'show',season_number:1,episode_number:1,release_state:'released',air_date:'2026-11-04',special:false};
 result=models.tvProgress('show',[episode],[],'2026-11-04',[season(1,null,0,'released',true)],'ongoing');
 assert.equal(result.status,'not-started','a newly released unwatched episode reopens a previously watched season');
});
test('Collections metrics and recap count only dated owned records and preserve missing time',()=>{
 const records=models.emptyCollections();records.media=[media('film','movie','watched','2026-11-02'),media('game','game','completed','2026-10-31')];records.activity=[{id:'view',media_id:'film',kind:'watch',activity_date:'2026-11-02',duration_minutes:null,episode_id:null},{id:'old',media_id:'game',kind:'play',activity_date:'2026-10-31',duration_minutes:30,episode_id:null}];
 const range={start:'2026-11-01',end:'2026-11-30'},metrics=insights.collectionsMetrics(records,[],[],range),recap=insights.collectionRecap(records,[],[],range);
 assert.equal(metrics.movies.completed,1);assert.equal(metrics.games.completed,0);assert.equal(metrics.movies.viewings,1);assert.equal(metrics.movies.sessionsMissingDuration,1);assert.equal(metrics.games.playSessions,0);assert.equal(recap.moviesCompleted,1);assert.equal(recap.missingDurationSessions,1);assert.equal(recap.recordedViewingMinutes,0);assert.equal(recap.timeline.length,1);
});
