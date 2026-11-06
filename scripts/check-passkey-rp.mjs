// Checks that a Supabase project issues passkey challenges for the site people actually use. Read-only: it asks the
// public sign-in endpoint for options (creating only a short-lived challenge) using the public browser key.
// Usage: node scripts/check-passkey-rp.mjs <supabase-url> <publishable-key> <site-url>
//   e.g. node scripts/check-passkey-rp.mjs https://<ref>.supabase.co sb_publishable_… https://hellomuse.life
import assert from 'node:assert/strict';
const [url,key,site]=process.argv.slice(2);
assert.ok(url&&key&&site,'Usage: node scripts/check-passkey-rp.mjs <supabase-url> <publishable-key> <site-url>');
const response=await fetch(`${url.replace(/\/$/,'')}/auth/v1/passkeys/authentication/options`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}'});
const body=await response.json().catch(()=>({}));
const rpId=body?.options?.publicKey?.rpId??body?.options?.rpId??body?.rpId;
if(!response.ok||!rpId){console.error(`Could not read passkey options (HTTP ${response.status}). Are passkeys enabled for this project?`);process.exit(2);}
const host=new URL(site).hostname.toLowerCase(),rp=String(rpId).toLowerCase();
if(host===rp||host.endsWith(`.${rp}`)){console.log(`✓ Passkeys are issued for ${rpId}, which matches ${site}.`);}
else{console.error(`✗ Passkeys are issued for "${rpId}", but people use ${site}. Set the relying party ID to "${host}" and its origin to "${new URL(site).origin}" in Supabase → Authentication.`);process.exit(1);}
