import { route, jsonOk } from "@/server/http";
import { health } from "@carebora/core";

/**
 * GET /api/v1/health — liveness + database reachability.
 * Used by uptime checks and as the first proof the API + DB wiring works.
 */
export const GET = route(async () => {
  const { db } = await health.check();
  return jsonOk({
    status: "ok",
    db,
    service: "carebora-api",
    version: "v1",
    time: new Date().toISOString(),
  });
});
