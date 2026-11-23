import { b2cCallback } from "@/server/b2c-callback";
/** POST /api/v1/payouts/b2c/result/:id — accept a B2C result authenticated by the per-withdrawal callback token. */
export const POST = b2cCallback(false);
