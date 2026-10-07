"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES, flagEmoji, type Country } from "@/lib/countries";

/** Flag + dial-code picker for a phone field. Controlled by `iso2`; reports the full Country on change. */
export function CountryCodeSelect({ iso2, onChange }: { iso2: string; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find((c) => c.iso2 === iso2) ?? COUNTRIES[0];
  const filtered = COUNTRIES.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.dialCode.includes(q);
  });

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => { document.removeEventListener("mousedown", onDocClick); clearTimeout(t); };
  }, [open]);

  function pick(c: Country) {
    onChange(c);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-full items-center gap-1.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-700 transition hover:bg-slate-100"
      >
        <span className="text-base leading-none">{flagEmoji(selected.iso2)}</span>
        <span className="font-medium">{selected.dialCode}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-300/30">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              className="w-full text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3.5 py-2.5 text-sm text-slate-400">No matches</li>}
            {filtered.map((c) => (
              <li key={c.iso2}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition hover:bg-slate-50 ${c.iso2 === selected.iso2 ? "bg-teal-50" : ""}`}
                >
                  <span className="text-base leading-none">{flagEmoji(c.iso2)}</span>
                  <span className="flex-1 truncate text-slate-700">{c.name}</span>
                  <span className="text-slate-400">{c.dialCode}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
