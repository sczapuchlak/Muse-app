/**
 * Passkey outcomes in plain words (sign-in and registration). Supabase reports browser-side WebAuthn failures as
 * WebAuthnError codes and server-side failures as AuthError codes; anything unrecognized falls back to a gentle
 * generic line. Details go to the console only in development, never to the person and never in production.
 */
export type PasskeyFlow='sign-in'|'register';
export type PasskeyProblem='canceled'|'domain-mismatch'|'no-passkey'|'already-registered'|'expired'|'not-supported'|'server'|'network'|'unknown';

type Shape={code?:unknown;name?:unknown;status?:unknown;message?:unknown;cause?:unknown};
export function classifyPasskeyError(error:unknown):PasskeyProblem{
 const e=(error??{}) as Shape,code=String(e.code??''),name=String(e.name??''),message=String(e.message??'');
 if(code==='ERROR_INVALID_DOMAIN'||code==='ERROR_INVALID_RP_ID'||name==='SecurityError')return 'domain-mismatch';
 if(code==='ERROR_CEREMONY_ABORTED'||name==='AbortError')return 'canceled';
 if(code==='ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'||name==='InvalidStateError')return 'already-registered';
 if(code==='webauthn_challenge_expired'||code==='mfa_challenge_expired')return 'expired';
 if(code==='invalid_credentials'||/credential.*not found|no (matching )?credential/i.test(message))return 'no-passkey';
 if(code.startsWith('ERROR_AUTHENTICATOR_MISSING')||code==='ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG'||name==='NotSupportedError'||/does not support WebAuthn/i.test(message))return 'not-supported';
 // NotAllowedError covers a dismissed Face ID sheet, a timeout, and "no passkey for this site" (browsers deliberately
 // don't say which), so it is worded to fit all three.
 if(name==='NotAllowedError'||(code==='ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY'&&String((e.cause as Shape|undefined)?.name??'')==='NotAllowedError'))return 'canceled';
 if(name==='AuthRetryableFetchError'||/fetch|network/i.test(message))return 'network';
 if(Number(e.status)>=500||code==='unexpected_failure')return 'server';
 return 'unknown';
}

const copy:Record<PasskeyFlow,Record<PasskeyProblem,string>>={
 'sign-in':{
  canceled:'Passkey sign-in was canceled or timed out. If you haven’t added a passkey for hellomuse.life yet, sign in another way first and add one in Settings.',
  'domain-mismatch':'Passkeys aren’t available at this address yet. Sign in with Google or an email code for now.',
  'no-passkey':'That passkey isn’t connected to Muse anymore. Sign in another way, then add a new passkey in Settings.',
  'already-registered':'Passkey sign-in wasn’t completed. Please try again.',
  expired:'That sign-in took a little too long. Try your passkey again.',
  'not-supported':'This browser can’t use passkeys. Try Google or an email code.',
  server:'Muse couldn’t check your passkey just now. Try again in a moment, or use another method.',
  network:'You seem to be offline. Check your connection and try again.',
  unknown:'Passkey sign-in wasn’t completed. You can try again or use another method.',
 },
 register:{
  canceled:'Passkey setup was canceled. Nothing was changed.',
  'domain-mismatch':'Passkeys can’t be added at this address yet. Nothing was changed.',
  'no-passkey':'Passkey setup wasn’t completed. Please try again.',
  'already-registered':'This device already has a passkey for Muse. You’re all set.',
  expired:'Setup took a little too long. Please try again.',
  'not-supported':'This device or browser can’t create passkeys.',
  server:'Muse couldn’t save the passkey just now. Please try again.',
  network:'You seem to be offline. Check your connection and try again.',
  unknown:'Passkey setup wasn’t completed. Check your device and try again.',
 },
};
export function passkeyMessage(flow:PasskeyFlow,error:unknown){
 const problem=classifyPasskeyError(error);
 if(process.env.NODE_ENV==='development'){const e=(error??{}) as Shape;console.warn(`[passkey ${flow}] ${problem}`,{code:e.code,name:e.name,status:e.status,message:e.message});}
 return {problem,message:copy[flow][problem]};
}
