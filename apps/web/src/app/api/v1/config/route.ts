import { route, jsonOk } from "@/server/http";
import { NAME_TITLES, PASSWORD_RULES, PASSWORD_MIN_LENGTH } from "@carebora/shared";
import { STORAGE_LIMITS } from "@carebora/core";
import {
  AMBULANCE_PHONE, SUPPORT_PHONE, SUPPORT_PHONE_ALT, SUPPORT_EMAIL,
} from "@/lib/contact";

/**
 * GET /api/v1/config — what a client needs to know before anyone signs in.
 *
 * The website reads these from its own build (NEXT_PUBLIC_* variables), which a
 * mobile app cannot see. Without this it would have to hard-code them: whether
 * payments run through M-Pesa Daraja or a manual till, whether M-Pesa is the
 * sandbox (where a "simulate" shortcut is offered) or live, the numbers to call
 * in an emergency, and the rules a password or an upload must satisfy. Serving
 * them from the API means a change here reaches every client without a release.
 *
 * Public by design and contains nothing secret.
 */
export const GET = route(async () => {
  const paymentsMode = process.env.PAYMENTS_MODE ?? "mpesa_daraja";
  // Whichever gateway is active has its own sandbox/live switch.
  const sandbox =
    paymentsMode === "till" ? false
    : paymentsMode === "jenga" ? process.env.JENGA_ENV !== "production"
    : process.env.MPESA_ENV !== "production";

  return jsonOk(
    {
      app: {
        name: "Care Bora",
        apiVersion: "v1",
        // Set MOBILE_MIN_APP_VERSION to force old builds to update (a client
        // compares its own version against this and blocks if it is lower).
        minSupportedAppVersion: process.env.MOBILE_MIN_APP_VERSION ?? null,
      },
      contact: {
        ambulancePhone: AMBULANCE_PHONE,
        supportPhones: [SUPPORT_PHONE, SUPPORT_PHONE_ALT],
        supportEmail: SUPPORT_EMAIL,
        // Kenya's national emergency numbers, for when the ambulance line doesn't answer.
        nationalEmergencyNumbers: ["999", "112"],
      },
      payments: {
        currency: "KES",
        mode: paymentsMode,
        // true = M-Pesa sandbox: only here is the "simulate payment" shortcut valid.
        sandbox,
        ...(paymentsMode === "till"
          ? {
              till: {
                number: process.env.NEXT_PUBLIC_MPESA_TILL_NUMBER ?? null,
                name: process.env.NEXT_PUBLIC_MPESA_TILL_NAME ?? null,
              },
            }
          : {}),
      },
      auth: {
        passwordMinLength: PASSWORD_MIN_LENGTH,
        passwordRules: PASSWORD_RULES.map((r) => r.label),
        // A care provider's title is the first word of their stored full name.
        nameTitles: NAME_TITLES,
      },
      uploads: {
        // What the server accepts per kind (base64 characters), and the size of
        // the request body the hosting platform will let through at all —
        // a phone photo should be compressed to fit under the smaller of the two.
        maxBytesByKind: STORAGE_LIMITS,
        maxRequestBodyBytes: 4_500_000,
      },
    },
    200,
    { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  );
});
