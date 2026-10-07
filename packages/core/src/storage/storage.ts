import { ApiError } from "@carebora/shared";

/**
 * Single write seam for every uploaded file (catalogue images, prescription photos,
 * medical documents, lab results). All images today are base64 `data:` URLs persisted
 * straight into Postgres text columns — an accepted trade-off for now, but every
 * caller must route through `putFile` so migrating to Vercel Blob later is a one-file
 * change instead of a repo-wide rewrite.
 */
export const STORAGE_LIMITS = {
  catalogue_image: 3_000_000,
  prescription_image: 5_000_000,
  medical_document: 8_000_000,
  lab_result: 8_000_000,
  verification_document: 8_000_000,
  avatar: 3_000_000,
} as const;

export type StorageKind = keyof typeof STORAGE_LIMITS;

export interface StoredFile {
  url: string;
  mimeType: string;
  sizeBytes: number;
}

const DATA_URL_RE = /^data:([-\w.+]+\/[-\w.+]+);base64,/;

function parseDataUrl(dataUrl: string): { mimeType: string } {
  const match = DATA_URL_RE.exec(dataUrl);
  const mimeType = match?.[1];
  if (!mimeType) {
    throw ApiError.badRequest("Expected a base64 data: URL");
  }
  return { mimeType };
}

export async function putFile(kind: StorageKind, dataUrl: string): Promise<StoredFile> {
  const { mimeType } = parseDataUrl(dataUrl);
  const sizeBytes = dataUrl.length;
  const limit = STORAGE_LIMITS[kind];
  if (sizeBytes > limit) {
    throw ApiError.badRequest(
      `File exceeds the ${Math.round(limit / 1_000_000)}MB limit for ${kind}`,
    );
  }
  return { url: dataUrl, mimeType, sizeBytes };
}
