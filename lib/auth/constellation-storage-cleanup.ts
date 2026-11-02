import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
/** Only called after authenticated, explicit account-deletion confirmation. */
export async function deleteConstellationFiles(admin:SupabaseClient<Database>,userId:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))throw Error('Authenticated owner required.');
 const bucket='constellation-images',exists=await admin.storage.getBucket(bucket);if(exists.error){if(String(exists.error.statusCode)==='404')return;throw Error('Private storage verification failed.');}
 const storage=admin.storage.from(bucket),paths:string[]=[];
 async function collect(prefix:string,depth:number){if(depth>3)throw Error('Unexpected private storage structure.');for(let offset=0;;offset+=100){const {data,error}=await storage.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(error)throw Error('Private image listing failed.');for(const item of data){if(item.id)paths.push(`${prefix}/${item.name}`);else await collect(`${prefix}/${item.name}`,depth+1);}if(paths.length>50000)throw Error('Private storage cleanup needs assistance.');if(data.length<100)break;}}
 await collect(userId,0);for(let i=0;i<paths.length;i+=100){const {error}=await storage.remove(paths.slice(i,i+100));if(error)throw Error('Private image deletion was not confirmed.');}
}
