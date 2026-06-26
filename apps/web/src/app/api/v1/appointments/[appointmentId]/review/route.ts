import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createReviewSchema } from "@carebora/shared";
import { reviewService, notificationService } from "@carebora/core";

/** POST /api/v1/appointments/:appointmentId/review — patient reviews a completed appointment. */
export const POST = route(async (req, { params }: { params: Promise<{ appointmentId: string }> }) => {
  const { appointmentId } = await params;
  const auth = await requireAuth(req, ["patient"]);
  const input = createReviewSchema.parse(await req.json());
  const { review, provider } = await reviewService.create(auth.sub, appointmentId, input);
  void notificationService.reviewReceived({
    providerEmail: provider.user.email,
    providerName: provider.user.fullName,
    patientName: review.patient.fullName,
    rating: review.rating,
    comment: review.comment,
  });
  return jsonOk(review, 201);
});
