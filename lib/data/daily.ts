import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { validDate } from "@/lib/dates";

type Client = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
export type DailyRecord = Tables["daily_records"]["Row"];
export type DailyPriority = Tables["daily_priorities"]["Row"] & {
 task_title?:string|null;current_complete?:boolean|null;current_completed_at?:string|null;historical_complete?:boolean|null;display_complete?:boolean|null;historical_day?:boolean;
};
export type MoodCheckin = Tables["mood_checkins"]["Row"];
export type DailyPatch = Partial<Pick<DailyRecord,"intention_text"|"intention_emoji"|"day_in_three"|"energy"|"stress"|"overall_day">>;
const fields = new Set(["intention_text","intention_emoji","day_in_three","energy","stress","overall_day"]);
function checkDate(date:string) { if (!validDate(date)) throw new RangeError("Choose a valid calendar date."); }
function singleGrapheme(value:unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && [...new Intl.Segmenter("en",{granularity:"grapheme"}).segment(value)].length === 1;
}
export function validateDailyPatch(patch:DailyPatch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new TypeError("Expected daily fields.");
  for (const [key,value] of Object.entries(patch)) {
    if (!fields.has(key)) throw new TypeError("Unsupported daily field.");
    if (["energy","stress","overall_day"].includes(key) && value !== null && (!Number.isInteger(value) || Number(value)<1 || Number(value)>10)) throw new RangeError("Ratings must be null or whole numbers from 1 to 10.");
    if (key==="intention_text" && value!==null && (typeof value!=="string" || value.length>1000)) throw new RangeError("Intention must be text of at most 1000 characters.");
    if (key==="intention_emoji" && value!==null && !singleGrapheme(value)) throw new RangeError("Choose one intention emoji, or clear it.");
    if (key==="day_in_three" && (!Array.isArray(value) || value.length>3 || !value.every(singleGrapheme))) throw new RangeError("Day in Three contains zero to three emoji values.");
  }
}

/** A missing day stays missing: navigation reads never seed or create records. */
export async function readDailyRecord(client:Client,date:string) {
  checkDate(date);
  const {data,error}=await client.from("daily_records").select("*").eq("local_date",date).maybeSingle();
  if (error) throw error;
  return data;
}
/** Explicit preparation for capture; the caller retains this revision while editing. */
export async function ensureDailyRecord(client:Client,date:string):Promise<DailyRecord> {
  checkDate(date);
  const {data,error}=await client.rpc("ensure_daily_record",{p_date:date});
  if (error) throw error;
  if (!data) throw new Error("The daily record could not be prepared.");
  return data;
}
export async function saveDailyRecord(client:Client,record:DailyRecord,patch:DailyPatch):Promise<DailyRecord> {
  validateDailyPatch(patch);
  const {data,error}=await client.rpc("save_daily_record",{p_date:record.local_date,p_patch:patch,p_expected_revision:record.revision});
  if (error) throw error; // 40001 is an explicit conflict, never a false saved state.
  if (!data) throw new Error("The daily record was not saved.");
  return data;
}

/** One query projection for Daily Edit/Mood/Dayprint; no duplicate summary records. */
type DailyWire=DailyRecord&{daily_priorities:DailyPriority[];mood_checkins:DayData['checkins']};
function projectDay(data:DailyWire):DayData{const {daily_priorities,mood_checkins,...record}=data;return {record,priorities:daily_priorities.sort((a,b)=>a.position-b.position),checkins:mood_checkins.sort((a,b)=>a.period===b.period?0:a.period==='morning'?-1:1)};}
export async function readDay(client:Client,date:string):Promise<DayData> {
  checkDate(date);
  const {data,error}=await client.rpc('read_daily_days',{p_start:date,p_end:date,p_limit:1});
  if(error)throw error;
  const rows=data as unknown as DailyWire[];
  return rows.length?projectDay(rows[0]):emptyDay();
}
export async function saveMoodCheckin(client:Client,input:{date:string;period:"morning"|"evening";reflection:string|null;emotionIds:string[];influenceIds:string[];revision:number|null}) {
  checkDate(input.date);
  if (!["morning","evening"].includes(input.period)) throw new RangeError("Choose Morning or Evening.");
  if (input.reflection!==null && (typeof input.reflection!=="string" || input.reflection.length>20000)) throw new RangeError("Reflection is too long.");
  if (input.influenceIds.length>3 || new Set(input.influenceIds).size!==input.influenceIds.length || new Set(input.emotionIds).size!==input.emotionIds.length) throw new RangeError("Choose distinct feelings and up to three influences.");
  const {data,error}=await client.rpc("save_mood_checkin",{p_date:input.date,p_period:input.period,p_reflection:input.reflection??"",p_emotion_ids:input.emotionIds,p_influence_ids:input.influenceIds,p_expected_revision:input.revision??undefined});
  if (error) throw error;
  return data as MoodCheckin|null; // SQL returns null when the session was intentionally cleared.
}
export async function deleteMoodCheckin(client:Client,record:MoodCheckin) {
  const {error}=await client.rpc("delete_mood_checkin",{p_id:record.id,p_expected_revision:record.revision});
  if (error) throw error;
}

export type DayData = {record:DailyRecord|null;priorities:DailyPriority[];checkins:(MoodCheckin&{checkin_emotions:{emotion_id:string}[];checkin_influences:{influence_id:string;position:number}[]})[]};
export type PriorityInput = {id:string;text:string;complete:boolean|null;taskId?:string|null};
export const emptyDay = ():DayData=>({record:null,priorities:[],checkins:[]});
export async function savePriorities(client:Client,date:string,items:PriorityInput[],expected:DailyPriority[],options:{commandId?:string;plannerRevision?:number}={}) {
  checkDate(date);
  if(items.length>3||new Set(items.map(item=>item.id)).size!==items.length||items.some(item=>!item.text.trim()||item.text.trim().length>160||item.complete!==null&&typeof item.complete!=='boolean'))throw new RangeError('Choose up to three priorities, each with at most 160 characters.');
  const {data,error}=await client.rpc('save_daily_priorities',{p_date:date,p_items:items,p_expected:expected.map(({id,revision})=>({id,revision})),p_command_id:options.commandId??crypto.randomUUID(),p_expected_planner_revision:options.plannerRevision});
  if(error)throw error;
  return data as DailyPriority[];
}
/** Bounded pages within an explicit date range. Reads never create empty days. */
export async function readDays(client:Client,start:string,end:string) {
  checkDate(start);checkDate(end);if(end<start)throw new RangeError('Invalid date range.');
  const result:Record<string,DayData>={};
  let after:string|undefined;
  for(;;){
    const {data,error}=await client.rpc('read_daily_days',{p_start:start,p_end:end,p_after:after,p_limit:100});
    if(error)throw error;
    const rows=data as unknown as DailyWire[];
    for(const row of rows)result[row.local_date]=projectDay(row);
    if(rows.length<100)break;
    after=rows.at(-1)!.local_date;
  }
  return result;
}
