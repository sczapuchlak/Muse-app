import "server-only";
import {publicSupabaseConfig} from '@/lib/supabase/config';
import {validateAuthEndpoints} from './origins';
/** One explicit canonical origin per local, staging or production deployment. */
export function authConfig(){
  const {url,key}=publicSupabaseConfig();
  return {...validateAuthEndpoints(process.env.SITE_URL,url),key};
}
