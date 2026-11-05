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
  outputFileTracingIncludes: {
    '/api/astrology/places': ['./content/astrology/places.json.gz'],
  },
  turbopack: {
    rules: {
      // Only globals.css uses Tailwind. Running every component stylesheet through the Tailwind loader made
      // Turbopack serve stale component CSS after edits; plain CSS uses Turbopack's built-in handling.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
