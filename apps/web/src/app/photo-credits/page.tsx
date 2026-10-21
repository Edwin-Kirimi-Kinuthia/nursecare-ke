import type { Metadata } from "next";
import { PHOTO_CREDITS } from "@/lib/photo-credits";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Credits and licences for the product photographs used in the Care Bora pharmacy.",
  alternates: { canonical: "/photo-credits" },
};

export default function PhotoCreditsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Photo credits</h1>
      <p className="mt-3 text-slate-500">
        Some pharmacy product photos are openly licensed images from Wikimedia Commons. We thank the photographers.
        Product names and packaging shown belong to their respective owners and appear only to help you identify the product.
      </p>
      <ul className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {PHOTO_CREDITS.map((c) => (
          <li key={c.file} className="flex flex-col gap-0.5 px-5 py-3 text-sm">
            <a href={c.source} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">{c.title}</a>
            <span className="text-slate-500">by {c.author} · {c.license}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
