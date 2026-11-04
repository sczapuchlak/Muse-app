/** In-memory, per-process limit for book lookups. */
const windows=new Map<string,number[]>();
export function allowLookup(userId:string,now=Date.now(),limit=60,windowMs=60_000){
 const recent=(windows.get(userId)??[]).filter(at=>now-at<windowMs);
 if(recent.length>=limit){windows.set(userId,recent);return false;}
 recent.push(now);windows.set(userId,recent);if(windows.size>5000)windows.delete(windows.keys().next().value as string);return true;
}
