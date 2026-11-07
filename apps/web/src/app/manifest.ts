import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/** Served at /manifest.webmanifest — makes the site installable and improves mobile SEO signals. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Quality care, made accessible`,
    short_name: "Care Bora",
    description:
      "Kenya's telehealth platform: consult verified doctors and nurses by video, request an ambulance, book home visits, get medical reports and certificates, and order medication from the pharmacy nearest you.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2f6638",
    lang: "en-KE",
    categories: ["medical", "health", "lifestyle"],
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo-mark.png", sizes: "192x192", type: "image/png" },
    ],
  };
}
