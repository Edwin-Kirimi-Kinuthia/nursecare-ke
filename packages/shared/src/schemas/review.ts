import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const moderateReviewSchema = z.object({
  isVisible: z.boolean(),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

export const reviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  isVisible: z.coerce.boolean().optional(),
});
export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;
