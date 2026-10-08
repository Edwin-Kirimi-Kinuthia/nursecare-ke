"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Stethoscope, SearchX } from "lucide-react";
import type { ProviderPublicProfile } from "@carebora/api-client";
import { api } from "@/lib/api";
import ProviderCard from "@/components/ProviderCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function ProvidersDirectory({
  initialProviders, initialSpecialties,
}: {
  /** Rendered on the server, so crawlers get the providers in the HTML instead of an empty skeleton. */
  initialProviders: ProviderPublicProfile[];
  initialSpecialties: { name: string; count: number }[];
}) {
  const [providers, setProviders] = useState<ProviderPublicProfile[]>(initialProviders);
  const [specialty, setSpecialty] = useState("");
  // The filter chips come from what providers have actually entered, not a
  // fixed list — a chip for "Nursing" with no nurse on the platform is a dead
  // end. They are loaded once on the server and independent of the selected
  // filter, so choosing one doesn't make the others vanish.
  const specialties = initialSpecialties;
  const [loading, setLoading] = useState(initialProviders.length === 0);
  const [error, setError] = useState<string | null>(null);
  // The first load is already done on the server; only refetch when the filter changes.
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip the first run only when the server already supplied the list. If it
    // came back empty (a database hiccup at render time), fetch rather than
    // leave the visitor looking at nothing.
    if (firstRender.current) {
      firstRender.current = false;
      if (initialProviders.length > 0) return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.listProviders(specialty ? { specialty } : {});
        if (active) { setProviders(res.providers); setError(null); }
      } catch {
        if (active) setError("Could not load providers");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [specialty, initialProviders.length]);

  return (
    <div>
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <PageHeader
            eyebrow="Care providers"
            Icon={Stethoscope}
            title="Find your provider"
            lede="Licensed clinicians across Kenya. Every provider here has had their practice licence checked."
          />

          {/* One specialty is the same as no filter, so the row only appears
              once there is something to choose between. */}
          {specialties.length >= 2 && (
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by specialty">
              {[{ name: "", count: 0 }, ...specialties].map(({ name, count }) => (
                <button
                  key={name || "all"}
                  onClick={() => setSpecialty(name)}
                  aria-pressed={specialty === name}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    specialty === name
                      ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-500/30"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-700"
                  }`}
                >
                  {name === "" && <Search className="h-3.5 w-3.5" />}
                  {name || "All providers"}
                  {name !== "" && (
                    <span className={`text-xs tabular-nums ${specialty === name ? "text-teal-100" : "text-slate-400"}`}>{count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl skeleton" />
            ))}
          </div>
        ) : error ? (
          <p className="py-16 text-center text-rose-600">{error}</p>
        ) : providers.length === 0 ? (
          <EmptyState
            Icon={SearchX}
            title="No providers match that filter"
            hint="Try another specialty, or clear the filter to see everyone."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => <ProviderCard key={p.userId} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
