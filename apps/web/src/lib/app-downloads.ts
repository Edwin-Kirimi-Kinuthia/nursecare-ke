import verifiedRelease from "./app-release.json";

export type AppDownload = { name: string; url: string; size: number };

/**
 * Files published and verified for distribution. Update this catalog after
 * checking a release's installers and checksums; runtime GitHub caches or rate
 * limits must never hide an available download or restore an older installer.
 */
export async function appDownloads(): Promise<AppDownload[]> {
  return verifiedRelease;
}
