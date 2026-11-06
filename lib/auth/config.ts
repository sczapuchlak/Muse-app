import "server-only";
import {publicSupabaseConfig} from '@/lib/supabase/config';
import {deploymentSiteUrl,validateAuthEndpoints} from './origins';
/** One explicit canonical origin per deployment: SITE_URL, or a Vercel preview's own branch address. */
export function authConfig(){
  const {url,key}=publicSupabaseConfig();
  return {...validateAuthEndpoints(deploymentSiteUrl({VERCEL_ENV:process.env.VERCEL_ENV,VERCEL_BRANCH_URL:process.env.VERCEL_BRANCH_URL,SITE_URL:process.env.SITE_URL}),url),key};
}
