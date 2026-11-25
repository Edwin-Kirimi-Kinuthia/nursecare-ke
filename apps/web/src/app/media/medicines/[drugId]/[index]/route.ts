import { createHash } from "node:crypto";
import sharp from "sharp";
import { db } from "@carebora/db";

export const runtime = "nodejs";
export async function GET(req: Request, { params }: { params: Promise<{ drugId: string; index: string }> }) {
  const { drugId, index } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(drugId) || !/^[0-5]$/.test(index)) return new Response("Not found", { status: 404 });
  const query = new URL(req.url).searchParams;
  const width = Number(query.get("w") ?? 640);
  const format = query.get("format") ?? "jpeg";
  if (!["jpeg", "webp"].includes(format)) return new Response("Unsupported image format", { status: 400 });
  if (![320,640,960].includes(width)) return new Response("Unsupported image size", { status: 400 });
  const [drug] = await db.$queryRaw<{ image: string | null; updatedAt: Date }[]>`
    SELECT CASE WHEN cardinality(images)>0 THEN images[${Number(index)+1}] ELSE CASE WHEN ${Number(index)}=0 THEN image_url END END AS image, updated_at AS "updatedAt"
    FROM drugs WHERE id=${drugId}::uuid AND is_active=true
  `;
  const match = drug?.image?.match(/^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return new Response("Not found", { status: 404 });
  try {
    const pipeline = sharp(Buffer.from(match[1]!, "base64"), { limitInputPixels: 40_000_000 }).rotate().resize({ width, height: width, fit: "inside", withoutEnlargement: true });
    // JPEG remains compatible with older native iOS clients; web thumbnails opt into WebP.
    const body = await (format === "webp" ? pipeline.webp({ quality: 78 }) : pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 80, mozjpeg: true })).toBuffer();
    const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
    const headers = { "Content-Type": `image/${format}`, "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400", ETag: etag, "X-Content-Type-Options": "nosniff" };
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    return new Response(new Uint8Array(body), { headers });
  } catch { return new Response("Image unavailable", { status: 422 }); }
}
