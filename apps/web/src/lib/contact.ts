/**
 * Public contact details shown across the site.
 *
 * AMBULANCE_PHONE is the dispatch line — the number a patient calls to get a
 * crew moving without waiting on the in-app request flow. It is deliberately
 * separate from the support numbers in the footer: an emergency caller must
 * never land in a general enquiries queue.
 */
export const AMBULANCE_PHONE = "+254717231721";
export const AMBULANCE_PHONE_DISPLAY = "+254 717 231 721";

/** General enquiries / customer care. */
export const SUPPORT_PHONE = "+254791390915";
export const SUPPORT_PHONE_DISPLAY = "+254 791 390 915";
export const SUPPORT_PHONE_ALT = "+254757963762";
export const SUPPORT_PHONE_ALT_DISPLAY = "+254 757 963 762";

export const SUPPORT_EMAIL = "customercare@carebora.co.ke";
export const ADMIN_EMAIL = "admin@carebora.co.ke";

/**
 * Kept as aliases so existing call sites keep compiling. Anything that means
 * "get me an ambulance" should use AMBULANCE_PHONE explicitly.
 * @deprecated use AMBULANCE_PHONE or SUPPORT_PHONE
 */
export const EMERGENCY_PHONE = AMBULANCE_PHONE;
/** @deprecated use AMBULANCE_PHONE_DISPLAY or SUPPORT_PHONE_DISPLAY */
export const EMERGENCY_PHONE_DISPLAY = AMBULANCE_PHONE_DISPLAY;
