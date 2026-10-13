import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = originOf(supabaseUrl);
const supabaseHost = supabaseOrigin ? new URL(supabaseOrigin) : null;

function isLocalHost(hostname: string | undefined): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

const analyticsOrigin =
  process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "plausible"
    ? (originOf(process.env.NEXT_PUBLIC_PLAUSIBLE_SRC) ?? "https://plausible.io")
    : null;
const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

/**
 * Content-Security-Policy.
 *
 * Trade-off (documented in docs/SECURITY.md): a strict nonce-based script policy
 * requires rendering every page per request, which would defeat the static /
 * cached delivery that makes the public site fast. We therefore allow inline
 * scripts (required by Next's streaming runtime) but lock down everything else:
 * no plugins, no framing, restricted origins for scripts, frames, images and
 * connections, and form targets limited to this site.
 */
function contentSecurityPolicy(): string {
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])];
  if (analyticsOrigin) scriptSrc.push(analyticsOrigin);
  if (turnstileEnabled) scriptSrc.push("https://challenges.cloudflare.com");

  const connectSrc = ["'self'"];
  if (supabaseOrigin) connectSrc.push(supabaseOrigin);
  if (analyticsOrigin) connectSrc.push(analyticsOrigin);
  if (!isProd) connectSrc.push("ws:", "wss:");

  const imgSrc = ["'self'", "data:", "blob:"];
  if (supabaseOrigin) imgSrc.push(supabaseOrigin);

  const frameSrc = ["https://www.youtube-nocookie.com", "https://player.vimeo.com"];
  if (turnstileEnabled) frameSrc.push("https://challenges.cloudflare.com");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src ${frameSrc.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Story submissions may carry up to 3.6 MB of browser-downsized photos;
      // Vercel rejects request bodies above ~4.5 MB regardless.
      bodySizeLimit: "4mb",
    },
  },
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    minimumCacheTTL: 60 * 60 * 24,
    // Local Supabase runs on 127.0.0.1. Private addresses are only ever allowed when the
    // configured Supabase host IS local (development, or a local production-build test run);
    // a real deployment points at a public hostname, so this stays false there.
    dangerouslyAllowLocalIP: !isProd || isLocalHost(supabaseHost?.hostname),
    remotePatterns: supabaseHost
      ? [
          {
            protocol: supabaseHost.protocol.replace(":", "") as "http" | "https",
            hostname: supabaseHost.hostname,
            port: supabaseHost.port,
            pathname: "/storage/v1/object/public/editorial-media/**",
          },
        ]
      : [],
  },
  async headers() {
    // Belt and braces: anything that is not explicitly the production site is noindex.
    const indexingHeaders =
      process.env.ALLOW_INDEXING === "true"
        ? []
        : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: [...securityHeaders, ...indexingHeaders] },
      {
        // Editorial area: never cache, never index.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
