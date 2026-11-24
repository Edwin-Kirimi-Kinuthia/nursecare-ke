"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

/** Browsers block top-level data: navigation; open stored uploads as Blobs instead. */
export default function UploadedDocumentLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const [error, setError] = useState<string | null>(null);

  function prepareDocument(event: MouseEvent<HTMLAnchorElement>) {
    if (!href.startsWith("data:")) return;
    try {
      const match = /^data:([-\w.+]+\/[-\w.+]+);base64,([\s\S]*)$/.exec(href);
      if (!match) throw new Error("Invalid document");
      // Blob documents share the app's origin, so never open active HTML or SVG uploads.
      if (!/^(application\/pdf|image\/(jpeg|png|gif|webp|avif|bmp|tiff|heic|heif))$/.test(match[1])) {
        throw new Error("Unsupported document type");
      }
      const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: match[1] }));
      // Keep native link behaviour, including new-tab and modifier-key clicks.
      event.currentTarget.href = url;
      setError(null);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      event.preventDefault();
      setError("Could not open this document. Please ask the applicant to upload it again.");
    }
  }

  return <span className="inline-flex flex-col">
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={prepareDocument} onAuxClick={prepareDocument} className={`cursor-pointer underline underline-offset-4 ${className ?? "text-teal-700 font-semibold"}`}>
      {children}
    </a>
    {error && <span role="alert" className="mt-1 text-xs text-rose-700">{error}</span>}
  </span>;
}
