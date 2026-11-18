import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { webPushService } from "@carebora/core";
import { ApiError } from "@carebora/shared";
import { z } from "zod";

export const GET = route(async (req) => {
  await requireAuth(req);
  return jsonOk({ publicKey: webPushService.publicKey() });
});

const schema = z.object({ userId: z.string().uuid(), subscription: z.unknown() });
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const input = schema.parse(await req.json());
  if (input.userId !== auth.sub) throw new ApiError("CONFLICT", "Your signed-in account changed. Please try again.");
  return jsonOk(await webPushService.register(auth.sub, input.subscription), 201);
});

export const DELETE = route(async (req) => {
  const auth = await requireAuth(req);
  const input = schema.parse(await req.json());
  if (input.userId !== auth.sub) throw new ApiError("CONFLICT", "Your signed-in account changed.");
  return jsonOk(await webPushService.unregister(auth.sub, input.subscription));
});
