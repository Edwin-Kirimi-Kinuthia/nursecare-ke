import { route, jsonOk } from "@/server/http";
import { requirePatient } from "@/server/auth";
import { createServiceReviewSchema, serviceReviewSubjectSchema } from "@carebora/shared";
import { serviceReviewService } from "@carebora/core";

export const GET = route(async req => {
  const auth = await requirePatient(req);
  const input = serviceReviewSubjectSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return jsonOk(await serviceReviewService.get(auth.sub, input));
});
export const POST = route(async req => {
  const auth = await requirePatient(req);
  return jsonOk(await serviceReviewService.create(auth.sub, createServiceReviewSchema.parse(await req.json())), 201);
});
