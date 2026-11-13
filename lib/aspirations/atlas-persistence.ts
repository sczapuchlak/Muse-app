/**
 * Life Atlas persistence (#190). Every write goes to the record's one home: areas stay in Reflections, year plans,
 * priorities and visions in their #82 tables, related links in `aspiration_links`. Revision checks stop two devices
 * from overwriting each other; failures throw so the interface only shows what really saved.
 */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {readLifeAreas} from '@/lib/reflections/persistence';
import type {LifeArea} from '@/lib/reflections/model';
import type {AreaLink,Priority,RelatedLink,YearPlan,YearVision} from './atlas';

type Client=SupabaseClient<Database>;
export type AtlasData={areas:LifeArea[];links:AreaLink[];plans:YearPlan[];priorities:Priority[];visions:YearVision[];related:RelatedLink[]};
const changed='This changed on another device. Reload to see the latest before saving again.';

export async function loadAtlas(client:Client):Promise<AtlasData>{
 const [areas,links,plans,priorities,visions,related]=await Promise.all([
  readLifeAreas(client),
  client.from('aspiration_life_areas').select('aspiration_id,area_id,is_primary'),
  client.from('aspiration_year_plans').select('*').order('year'),
  client.from('aspiration_year_priorities').select('*').order('created_at'),
  client.from('aspiration_year_visions').select('*'),
  client.from('aspiration_links').select('aspiration_id,related_id'),
 ]);
 for(const r of [links,plans,priorities,visions,related])if(r.error)throw r.error;
 return {areas,links:links.data??[],plans:plans.data??[],priorities:priorities.data??[],visions:visions.data??[],related:related.data??[]};
}

export type PlanPatch=Partial<Pick<YearPlan,'theme'|'feelings'|'focus'|'extraordinary'|'proud'|'letting_go'|'vision_board_id'|'vision_board_name'|'ritual_step'|'ritual_started_at'|'ritual_completed_at'|'established_at'>>;
/** Creates the year's plan on first write, otherwise updates it only if nobody else changed it. */
export async function savePlan(client:Client,year:number,patch:PlanPatch,current:YearPlan|undefined):Promise<YearPlan>{
 const r=current?await client.from('aspiration_year_plans').update(patch).eq('year',year).eq('revision',current.revision).select('*').maybeSingle()
  :await client.from('aspiration_year_plans').insert({year,...patch}).select('*').single();
 if(r.error){if(!current&&r.error.code==='23505')throw Error(changed);throw r.error;}
 if(!r.data)throw Error(changed);return r.data;
}

/** Chooses an aspiration for a year. Snapshots keep its name and area as they were when chosen. */
export async function addPriority(client:Client,year:number,a:{id:string;title:string},area:LifeArea|null){
 const r=await client.from('aspiration_year_priorities').insert({year,aspiration_id:a.id,aspiration_name:a.title.slice(0,120),area_id:area?.id??null,area_name:area?.label.slice(0,40)??null}).select('*').single();
 if(r.error)throw r.error;return r.data;
}
/** Takes an aspiration out of a year without deleting anything: the row keeps when it was removed. */
export async function removePriority(client:Client,p:Priority){
 const r=await client.from('aspiration_year_priorities').update({removed_at:new Date().toISOString()}).eq('id',p.id).eq('revision',p.revision).is('removed_at',null).select('*').maybeSingle();
 if(r.error)throw r.error;if(!r.data)throw Error(changed);return r.data;
}
export async function updatePriority(client:Client,p:Priority,patch:Partial<Pick<Priority,'note'|'area_id'|'area_name'|'aspiration_name'>>){
 const r=await client.from('aspiration_year_priorities').update(patch).eq('id',p.id).eq('revision',p.revision).select('*').maybeSingle();
 if(r.error)throw r.error;if(!r.data)throw Error(changed);return r.data;
}

export async function setPrimaryArea(client:Client,aspirationId:string,areaId:string|null){
 const {error}=await client.rpc('set_aspiration_primary_area',{p_aspiration_id:aspirationId,p_area_id:areaId as string});if(error)throw error;
}
export async function addSecondaryArea(client:Client,aspirationId:string,areaId:string){
 const {error}=await client.from('aspiration_life_areas').insert({aspiration_id:aspirationId,area_id:areaId,is_primary:false});if(error)throw error;
}
export async function removeArea(client:Client,aspirationId:string,areaId:string){
 const {error}=await client.from('aspiration_life_areas').delete().eq('aspiration_id',aspirationId).eq('area_id',areaId);if(error)throw error;
}

export async function saveVision(client:Client,year:number,areaId:string,vision:string,current:YearVision|undefined):Promise<YearVision>{
 const r=current?await client.from('aspiration_year_visions').update({vision}).eq('year',year).eq('area_id',areaId).eq('revision',current.revision).select('*').maybeSingle()
  :await client.from('aspiration_year_visions').insert({year,area_id:areaId,vision}).select('*').single();
 if(r.error)throw r.error;if(!r.data)throw Error(changed);return r.data;
}

export async function linkRelated(client:Client,pair:RelatedLink){const {error}=await client.from('aspiration_links').insert(pair);if(error&&error.code!=='23505')throw error;}
export async function unlinkRelated(client:Client,pair:RelatedLink){const {error}=await client.from('aspiration_links').delete().eq('aspiration_id',pair.aspiration_id).eq('related_id',pair.related_id);if(error)throw error;}
