/** Reject privileged credentials before build output or browser-client construction. Not JWT verification. */
export function assertPublicSupabaseKey(key:string){
  if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return;
  try{const parts=key.split('.');if(parts.length===3&&JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon')return;}catch{}
  throw Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key.');
}
