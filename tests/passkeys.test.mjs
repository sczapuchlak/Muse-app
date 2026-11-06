import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {root,load} from './helpers.mjs';

const read=f=>readFileSync(join(root,f),'utf8');

test('the relying party must be the production domain (or a parent of the host in use)',()=>{
 const {relyingPartyFits}=load('lib/auth/origins');
 assert.equal(relyingPartyFits('hellomuse.life','https://hellomuse.life'),true);
 assert.equal(relyingPartyFits('hellomuse.life','https://app.hellomuse.life'),true,'subdomains may share the parent rpId');
 assert.equal(relyingPartyFits('muse-production-omega.vercel.app','https://hellomuse.life'),false,'the old Vercel rpId never works on the custom domain');
 assert.equal(relyingPartyFits('life','https://hellomuse.life'),true,'(browsers additionally reject public suffixes)');
 assert.equal(relyingPartyFits('evilhellomuse.life','https://hellomuse.life'),false,'no look-alike suffix matching');
 assert.equal(relyingPartyFits('hellomuse.life','https://hellomuse.life.evil.test'),false);
 assert.equal(relyingPartyFits('','https://hellomuse.life'),false);assert.equal(relyingPartyFits('*.vercel.app','https://x.vercel.app'),false,'no wildcards');
});

test('passkey failures are explained precisely, without exposing details',()=>{
 const {classifyPasskeyError:c,passkeyMessage:m}=load('lib/auth/passkey-errors');
 assert.equal(c({code:'ERROR_INVALID_RP_ID'}),'domain-mismatch');assert.equal(c({name:'SecurityError'}),'domain-mismatch');
 assert.equal(c({code:'ERROR_CEREMONY_ABORTED'}),'canceled');assert.equal(c({name:'NotAllowedError'}),'canceled','Face ID dismissed / no passkey here');
 assert.equal(c({code:'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY',cause:{name:'NotAllowedError'}}),'canceled');
 assert.equal(c({code:'webauthn_challenge_expired'}),'expired');
 assert.equal(c({code:'invalid_credentials'}),'no-passkey','deleted or unknown credential');
 assert.equal(c({code:'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'}),'already-registered');
 assert.equal(c({name:'AuthRetryableFetchError',message:'Failed to fetch'}),'network');
 assert.equal(c({status:500}),'server');assert.equal(c(new Error('???')),'unknown');
 const messages=['canceled','domain-mismatch','no-passkey','expired','server','network'].map(p=>m('sign-in',{code:{canceled:'ERROR_CEREMONY_ABORTED','domain-mismatch':'ERROR_INVALID_RP_ID','no-passkey':'invalid_credentials',expired:'webauthn_challenge_expired',server:'unexpected_failure',network:''}[p],...(p==='network'?{name:'AuthRetryableFetchError'}:{})}).message);
 assert.equal(new Set(messages).size,messages.length,'each problem gets its own message');
 for(const text of messages)assert.doesNotMatch(text,/rp_?id|vercel|challenge_id|stack|ERROR_/i,'no technical details for people');
 assert.match(read('lib/auth/passkey-errors.ts'),/process\.env\.NODE_ENV==='development'/,'diagnostics only in development');
});

test('sign-in and registration both use the precise messages; accounts are never touched',()=>{
 const login=read('components/auth/MuseLogin.tsx'),settings=read('components/auth/SignInSettings.tsx');
 assert.match(login,/passkeyMessage\("sign-in", cause\)/);assert.match(settings,/passkeyMessage\("register", cause\)/);
 assert.doesNotMatch(login+settings,/admin\.deleteUser|auth\.admin/,'no account deletion or admin calls in the passkey flows');
 assert.match(settings,/already-registered.*setMessage/s,'an existing passkey on this device is good news, not an error');
 const check=read('scripts/check-passkey-rp.mjs');assert.match(check,/auth\/v1\/passkeys\/authentication\/options/);assert.doesNotMatch(check,/service_role|SECRET/i,'public key only');
});
