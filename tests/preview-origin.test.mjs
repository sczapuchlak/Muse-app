import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {deploymentSiteUrl,validateAuthEndpoints}=load('lib/auth/origins');
const SITE_URL='https://muse-staging.vercel.app';

test('a Vercel preview keeps its own branch address through sign-in and redirects',()=>{
 const site=deploymentSiteUrl({VERCEL_ENV:'preview',VERCEL_BRANCH_URL:'muse-staging-git-feature-social-16-profiles-26-muse-eb76.vercel.app',SITE_URL});
 assert.equal(site,'https://muse-staging-git-feature-social-16-profiles-26-muse-eb76.vercel.app');
 assert.equal(validateAuthEndpoints(site,'https://deazpeyomcwjplikbphl.supabase.co').origin,site);
});

test('production, the main staging site and local development keep SITE_URL',()=>{
 assert.equal(deploymentSiteUrl({VERCEL_ENV:'production',VERCEL_BRANCH_URL:'muse-git-main-muse-eb76.vercel.app',SITE_URL}),SITE_URL);
 assert.equal(deploymentSiteUrl({SITE_URL:'http://localhost:3000'}),'http://localhost:3000');
 assert.equal(deploymentSiteUrl({VERCEL_ENV:'development',VERCEL_BRANCH_URL:'x.vercel.app',SITE_URL}),SITE_URL);
});

test('only a plain *.vercel.app branch host is trusted; anything else falls back to SITE_URL',()=>{
 for(const branch of ['evil.example.com','muse.vercel.app.evil.com','https://x.vercel.app','x.vercel.app/path','','a..vercel.app','-x.vercel.app'])
  assert.equal(deploymentSiteUrl({VERCEL_ENV:'preview',VERCEL_BRANCH_URL:branch,SITE_URL}),SITE_URL,branch);
});
