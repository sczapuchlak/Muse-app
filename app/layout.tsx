import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "./interactions.css";
import { motionTokens } from "@/lib/motion";
import { defaultTheme } from "@/lib/themes";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-interface",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Edit · Muse",
  description: "A little space for what matters. Your priorities, wellbeing, and daily rituals, thoughtfully together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme={defaultTheme.id}
      data-material="crystal"
      style={motionTokens}
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AppShell>{children}</AppShell></body>
    </html>
  );
}
