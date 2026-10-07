"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/**
 * Interactive 1–5 star picker. Hover previews the rating, so the number of
 * filled stars always matches what clicking would select.
 */
export default function StarRatingInput({
  value, onChange, size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const star = size === "lg" ? "h-9 w-9" : "h-7 w-7";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)}
            aria-label={`${i} star${i > 1 ? "s" : ""} — ${LABELS[i]}`}
            aria-pressed={value === i}
            className="rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <Star
              className={`${star} transition-colors ${
                i <= shown ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
              }`}
            />
          </button>
        ))}
      </div>
      <span className={`text-sm font-semibold ${shown ? "text-slate-700" : "text-slate-400"}`}>
        {shown ? LABELS[shown] : "Tap to rate"}
      </span>
    </div>
  );
}
