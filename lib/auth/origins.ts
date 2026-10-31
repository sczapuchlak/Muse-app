/** Deployment configuration is trusted input; requests never choose redirect/API hosts. */
function endpoint(value:string|undefined,label:string):URL {
  if(!value||value!==value.trim())throw Error(`${label} must be explicitly configured.`);
  let url:URL;try{url=new URL(value);}catch{throw Error(`${label} is invalid.`);}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error(`${label} must be a root HTTP(S) origin without credentials, query or fragment.`);
  if(!url.hostname||url.hostname==='0.0.0.0'||url.hostname==='[::]')throw Error(`${label} needs a concrete host.`);
  return url;
}
const loopback=new Set(['localhost','127.0.0.1','[::1]']);
export function validateAuthEndpoints(siteUrl:string|undefined,supabaseUrl:string|undefined){
  const site=endpoint(siteUrl,'SITE_URL'),api=endpoint(supabaseUrl,'NEXT_PUBLIC_SUPABASE_URL');
  const local=loopback.has(site.hostname),localApi=loopback.has(api.hostname);
  if(local!==localApi)throw Error('Local and hosted authentication endpoints cannot be mixed.');
  if(!local&&(site.protocol!=='https:'||api.protocol!=='https:'||site.hostname.endsWith('.localhost')||api.hostname.endsWith('.localhost')))throw Error('Hosted authentication requires explicit HTTPS origins.');
  return {origin:site.origin,url:api.origin,local};
}
