import { z } from "zod";
import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { reviewInvitationService } from "@carebora/core";
const schema = z.object({ serviceType: z.enum(["appointment", "home_visit"]), subjectId: z.string().uuid() });
export const POST = route(async req => {
  const auth = await requireAuth(req);
  return jsonOk(await reviewInvitationService.forProvider(auth.sub, schema.parse(await req.json())));
});
