/** Preserve review destinations after login without allowing off-site redirects. */
export function internalRedirect(path: string | null, origin: string): string {
  if (!path?.startsWith("/")) return "/providers";
  try {
    const target = new URL(path, origin);
    return target.origin === new URL(origin).origin ? target.pathname + target.search + target.hash : "/providers";
  } catch { return "/providers"; }
}
