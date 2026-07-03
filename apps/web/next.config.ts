import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 'unsafe-eval' required by Next.js dev
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' wss: https:",  // wss: for LiveKit signaling + TURN
  "media-src 'self' blob:",           // blob: for LiveKit tracks
  "worker-src 'self' blob:",          // blob: for LiveKit web workers
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Allow the app's own origin to use camera + microphone (required for LiveKit
  // video consultations). An empty allowlist "camera=()" would block getUserMedia.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript; let Next transpile them.
  transpilePackages: [
    "@carebora/shared",
    "@carebora/db",
    "@carebora/core",
    "@carebora/api-client",
  ],
  // Keep Prisma's engine out of the bundle; load it from node_modules at runtime.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
