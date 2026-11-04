import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "./interactions.css";
import { motionTokens } from "@/lib/motion";
import { defaultTheme } from "@/lib/themes";
import { museBrand } from "@/lib/brand";
import { pwaInk } from "@/lib/pwa";
import { ThemeColorSync } from "@/components/ThemeColorSync";

const geistSans = Geist({
  variable: "--font-interface",
  subsets: ["latin"],
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
      data-material="crystal"
      style={motionTokens}
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ThemeColorSync />{children}</body>
    </html>
  );
}
