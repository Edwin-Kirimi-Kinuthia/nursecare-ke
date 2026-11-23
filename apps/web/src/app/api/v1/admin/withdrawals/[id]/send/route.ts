import { z } from "zod";
import { b2cService } from "@carebora/core";
import { requireAuth } from "@/server/auth";
import { route, jsonOk } from "@/server/http";
/** POST /api/v1/admin/withdrawals/:id/send — submit a pending B2C withdrawal that has never been attempted. Submitted transfers cannot be resent. */
export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  await requireAuth(req, ["admin"]);
  const { id } = await ctx.params;
  return jsonOk(await b2cService.send(z.string().uuid().parse(id)));
});

export const maxDuration = 60;
