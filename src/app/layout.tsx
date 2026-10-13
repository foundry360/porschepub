import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Instrument_Serif, Inter_Tight } from "next/font/google";
import { brand } from "@/config/brand";
import { getSiteUrl } from "@/config/site";
import { Analytics } from "@/components/analytics/analytics";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const serif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});

const sans = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const condensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${brand.name}: ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  openGraph: {
    type: "website",
    siteName: brand.name,
    locale: brand.locale,
    title: brand.name,
    description: brand.description,
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    types: { "application/rss+xml": [{ url: "/feed.xml", title: brand.name }] },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.themeColor },
    { media: "(prefers-color-scheme: dark)", color: brand.themeColorDark },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets data-theme before hydration, so the attribute differs from the server HTML.
    <html lang="en" className={`${serif.variable} ${sans.variable} ${condensed.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        {children}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
