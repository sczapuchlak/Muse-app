import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./interactions.css";
import "./typography.css";
import "./design-language.css";
import "./muse-magic-motion.css";
import "./solid-tags.css";
import { motionTokens } from "@/lib/motion";
import { defaultTheme } from "@/lib/themes";
import { appearancePrePaintScript } from "@/lib/appearance-prepaint";
import { museBrand } from "@/lib/brand";
import { pwaInk } from "@/lib/pwa";
import { ThemeColorSync } from "@/components/ThemeColorSync";

// Interface: Plus Jakarta Sans (variable weight, true italics) fills the existing --font-interface slot.
const interfaceSans = Plus_Jakarta_Sans({
  variable: "--font-interface",
  subsets: ["latin"],
  style: ["normal", "italic"],
});
// Editorial: Fraunces with its optical-size, Softness and Wonky axes all present, so the approved
// "SOFT" 100 / "WONK" 0 settings in app/typography.css actually take effect (true italics included).
const editorialSerif = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: `Muse — ${museBrand.mantra}`,
  description: museBrand.invitation,
  // app/favicon.ico and app/manifest.ts are emitted by Next's file conventions.
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Standalone on iPhone; "default" keeps content below the status bar without viewport changes.
  appleWebApp: { capable: true, title: "Muse", statusBarStyle: "default" },
  // Next emits mobile-web-app-capable; older iOS versions still read the Apple-prefixed name.
  other: { "apple-mobile-web-app-capable": "yes" },
};

// Initial color matches the launch background; ThemeColorSync follows the active theme afterwards.
export const viewport: Viewport = { themeColor: pwaInk };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme={defaultTheme.id}
      data-material="frosted"
      style={motionTokens}
      className={`${interfaceSans.variable} ${editorialSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Apply this browser's saved theme and glass before first paint, so a full load never flashes the default theme. */}
      <head><script dangerouslySetInnerHTML={{ __html: appearancePrePaintScript }} /></head>
      <body className="min-h-full flex flex-col"><ThemeColorSync />{children}</body>
    </html>
  );
}
