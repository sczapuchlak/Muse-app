/** Reflections persistence (#99): owner-only reviews, Level 10 Life areas and ratings, revision-checked like the rest of Muse. */
import type {createMuseBrowserClient} from '@/lib/supabase/client';
import type {Json} from '@/lib/database.types';
import {defaultLifeAreas,parseModules,type LifeArea,type LifeRating,type ReflectionModule,type ReflectionPeriod} from './model';

type Client=ReturnType<typeof createMuseBrowserClient>;
export type Review={id:string;period:ReflectionPeriod;start:string;end:string;layout:string;modules:ReflectionModule[];status:'draft'|'complete';title:string;revision:number;updatedAt?:string};
const reviewColumns='id,period,period_start,period_end,layout,modules,status,title,revision,updated_at';
type ReviewRow={id:string;period:string;period_start:string;period_end:string;layout:string;modules:unknown;status:string;title:string;revision:number;updated_at:string};
const fromRow=(r:ReviewRow):Review=>({id:r.id,period:r.period as ReflectionPeriod,start:r.period_start,end:r.period_end,layout:r.layout,modules:parseModules(r.modules),status:r.status==='complete'?'complete':'draft',title:r.title,revision:r.revision,updatedAt:r.updated_at});

export async function readReview(client:Client,period:ReflectionPeriod,start:string):Promise<Review|null>{
 const {data,error}=await client.from('reflection_reviews').select(reviewColumns).eq('period',period).eq('period_start',start).maybeSingle();
 if(error)throw error;return data?fromRow(data as ReviewRow):null;
}
/** Which periods of this type already have a review (for the picker's little dots). */
export async function reviewedStarts(client:Client,period:ReflectionPeriod,from:string,to:string):Promise<{start:string;status:string}[]>{
 const {data,error}=await client.from('reflection_reviews').select('period_start,status').eq('period',period).gte('period_start',from).lte('period_start',to);
 if(error)throw error;return data.map(r=>({start:r.period_start,status:r.status}));
}
export async function saveReview(client:Client,r:Review):Promise<Review>{
 const row={period:r.period,period_start:r.start,period_end:r.end,layout:r.layout,modules:parseModules(r.modules) as unknown as NonNullable<Json>,status:r.status,title:r.title.slice(0,120)};
 const res=r.revision===0
  ?await client.from('reflection_reviews').insert({id:r.id,...row}).select(reviewColumns).single()
  :await client.from('reflection_reviews').update(row).eq('id',r.id).eq('revision',r.revision).select(reviewColumns).maybeSingle();
 if(res.error){if(res.error.code==='23505')throw Error('This period already has a reflection. Reload to open it.');throw res.error;}
 if(!res.data)throw Error('This reflection changed on another device. Reload to see the latest.');
 return fromRow(res.data as ReviewRow);
}
export async function deleteReview(client:Client,id:string){const {error}=await client.from('reflection_reviews').delete().eq('id',id);if(error)throw error;}

// ---------- Level 10 Life ----------
type AreaRow={id:string;label:string;color:string;position:number;archived_at:string|null;revision:number};
const areaFrom=(r:AreaRow):LifeArea=>({id:r.id,label:r.label,color:r.color,position:r.position,archived:!!r.archived_at,revision:r.revision});
/** The person's life areas; the ten defaults are created the first time they're needed. */
export async function readLifeAreas(client:Client):Promise<LifeArea[]>{
 const {data,error}=await client.from('life_areas').select('id,label,color,position,archived_at,revision').order('position');
 if(error)throw error;if(data.length)return (data as AreaRow[]).map(areaFrom);
 // Idempotent: if another tab seeds at the same moment, the unique (user, position) slot keeps one copy.
 const seeded=await client.from('life_areas').upsert(defaultLifeAreas.map((a,i)=>({label:a.label,color:a.color,position:i})),{onConflict:'user_id,position',ignoreDuplicates:true});
 if(seeded.error)throw seeded.error;
 const again=await client.from('life_areas').select('id,label,color,position,archived_at,revision').order('position');
 if(again.error)throw again.error;return (again.data as AreaRow[]).map(areaFrom);
}
export async function saveLifeArea(client:Client,a:LifeArea):Promise<LifeArea>{
 const label=a.label.trim().slice(0,40);if(!label)throw Error('Give this area a name.');
 const row={label,color:/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#8050cf',position:a.position,archived_at:a.archived?new Date().toISOString():null};
 const res=a.revision===0?await client.from('life_areas').insert({id:a.id,...row}).select('id,label,color,position,archived_at,revision').single()
  :await client.from('life_areas').update(row).eq('id',a.id).eq('revision',a.revision).select('id,label,color,position,archived_at,revision').maybeSingle();
 if(res.error)throw res.error;if(!res.data)throw Error('This area changed on another device. Reload to see it.');
 return areaFrom(res.data as AreaRow);
}
export async function readRatings(client:Client,period:ReflectionPeriod,start:string):Promise<LifeRating[]>{
 const {data,error}=await client.from('life_ratings').select('id,area_id,rating,note,revision').eq('period',period).eq('period_start',start);
 if(error)throw error;return data.map(r=>({id:r.id,areaId:r.area_id,rating:r.rating,note:r.note,revision:r.revision}));
}
/** One rating per area and period, saved on its own (independent of the review document). */
export async function saveRating(client:Client,period:ReflectionPeriod,start:string,end:string,r:LifeRating):Promise<LifeRating>{
 const rating=Math.max(1,Math.min(10,Math.round(r.rating))),note=r.note.slice(0,500);
 const res=r.revision===0
  ?await client.from('life_ratings').insert({area_id:r.areaId,period,period_start:start,period_end:end,rating,note}).select('id,area_id,rating,note,revision').single()
  :await client.from('life_ratings').update({rating,note}).eq('id',r.id!).eq('revision',r.revision).select('id,area_id,rating,note,revision').maybeSingle();
 if(res.error){if(res.error.code==='23505')throw Error('This rating was saved on another device. Reload to see it.');throw res.error;}
 if(!res.data)throw Error('This rating changed on another device. Reload to see it.');
 return {id:res.data.id,areaId:res.data.area_id,rating:res.data.rating,note:res.data.note,revision:res.data.revision};
}
export async function clearRating(client:Client,id:string){const {error}=await client.from('life_ratings').delete().eq('id',id);if(error)throw error;}
