import { b2cCallback } from "@/server/b2c-callback";
/** POST /api/v1/payouts/b2c/timeout/:id — keep timed-out B2C funds reserved pending reconciliation. */
export const POST = b2cCallback(true);
