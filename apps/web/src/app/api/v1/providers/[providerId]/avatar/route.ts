import { db } from "@carebora/db";

/**
 * GET /api/v1/providers/:providerId/avatar — a verified provider's public photo as a real image.
 *
 * Photos are stored as base64 data: URLs in the database. Putting those straight
 * into pages meant every provider list shipped megabytes of text inside the HTML
 * and could not be cached or indexed as an image. Serving them from a URL fixes
 * all three. The URL carries a version (`?v=`) that changes with the photo, so
 * it can be cached for a year without anyone seeing a stale picture.
 *
 * Only verified providers' photos are served. A patient's avatar is not public.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(providerId)) return new Response("Not found", { status: 404 });

  const user = await db.user.findFirst({
    where: { id: providerId, providerProfile: { verificationStatus: "verified" } },
    select: { avatarUrl: true },
  });
  const m = user?.avatarUrl ? /^data:(image\/[-\w.+]+);base64,([A-Za-z0-9+/=]+)$/.exec(user.avatarUrl) : null;
  if (!m) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(m[2]!, "base64"), {
    headers: {
      "Content-Type": m[1]!,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
