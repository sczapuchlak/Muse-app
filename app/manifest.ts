import type { MetadataRoute } from "next";
import { museBrand } from "@/lib/brand";
import { pwaInk } from "@/lib/pwa";

// Installed Muse opens standalone. No service worker or offline caching is registered.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Muse",
    short_name: "Muse",
    description: museBrand.invitation,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: pwaInk,
    theme_color: pwaInk,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
