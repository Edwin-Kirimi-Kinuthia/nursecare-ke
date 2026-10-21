"use client";

import { useState } from "react";
import { nameInitial } from "@carebora/shared";

/** A person's photo; if it fails to load, show their initial on a soft gradient instead of a black box. */
export default function PhotoWithFallback({ src, name, className = "" }: { src: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-teal-100 to-emerald-200 text-6xl font-black text-teal-700 ${className}`}>{nameInitial(name)}</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className={className} />;
}
