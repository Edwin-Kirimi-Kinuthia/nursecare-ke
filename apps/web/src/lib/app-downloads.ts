import verifiedRelease from "./app-release.json";

const REPO = "Edwin-Kirimi-Kinuthia/nursecare-ke";
export type AppDownload = { name: string; url: string; size: number };

/** Published release assets only. The checked-in, verified release also works during GitHub outages or rate limits. */
export async function appDownloads(): Promise<AppDownload[]> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
      headers: { Accept: "application/vnd.github+json" }, next: { revalidate: 300 }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return verifiedRelease;
    const releases = await response.json() as { draft: boolean; prerelease: boolean; assets: { name: string; browser_download_url: string; size: number; state: string }[] }[];
    const selected = new Map<string, AppDownload>();
    for (const release of releases) {
      if (release.draft || release.prerelease) continue;
      for (const asset of release.assets) {
        if (asset.state !== "uploaded" || !asset.browser_download_url.startsWith(`https://github.com/${REPO}/releases/download/`)) continue;
        const kind = /^CareBora-[\w.-]+-(win|mac|linux)-(x64|x86_64|amd64|arm64)\.(exe|dmg|AppImage|deb)$/.exec(asset.name);
        const android = /^CareBora-[\w.-]+-android\.apk$/.test(asset.name);
        if (!kind && !android && !/^SHA256SUMS-[\w.-]+\.txt$/.test(asset.name)) continue;
        const key = android ? "android" : kind ? `${kind[1]}-${kind[2]}-${kind[3]}` : asset.name;
        if (!selected.has(key)) selected.set(key, { name: asset.name, url: asset.browser_download_url, size: asset.size });
      }
    }
    return selected.size ? [...selected.values()] : verifiedRelease;
  } catch { return verifiedRelease; }
}
