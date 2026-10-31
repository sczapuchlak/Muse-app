import type { NextConfig } from "next";

import {assertPublicSupabaseKey} from './lib/supabase/public-key';
// Stop a misconfigured privileged public variable before Next emits client chunks.
if(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)assertPublicSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
