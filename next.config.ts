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
  // Envision (#117): Aspirations and the Bucket List moved out of Rituals. Old links keep working; the query
  // (view, open, date…) is passed through unchanged.
  async redirects() {
    return [
      { source: "/rituals", has: [{ type: "query", key: "view", value: "aspirations" }], destination: "/envision", permanent: false },
      { source: "/rituals", has: [{ type: "query", key: "view", value: "bucket" }], destination: "/envision", permanent: false },
    ];
  },
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
