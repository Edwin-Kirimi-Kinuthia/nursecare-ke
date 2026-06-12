import type { NextConfig } from "next";

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
};

export default nextConfig;
