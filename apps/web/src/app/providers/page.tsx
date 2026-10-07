"use client";

import { useEffect, useState } from "react";
import { Search, Stethoscope, SearchX } from "lucide-react";
import type { ProviderPublicProfile } from "@carebora/api-client";
import { api } from "@/lib/api";
import ProviderCard from "@/components/ProviderCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

const FILTERS = ["", "General Practice", "Paediatrics", "Obstetrics", "Nursing"];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderPublicProfile[]>([]);
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [specialty]);

  return (
    <div>
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <PageHeader
            eyebrow="Care providers"
            Icon={Stethoscope}
            title="Find your provider"
            lede="Verified doctors, nurses and specialists across Kenya. Every clinician here has had their practice licence checked."
          />

          <div className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((s) => (
              <button
                key={s || "all"}
                onClick={() => setSpecialty(s)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  specialty === s
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-500/30"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-700"
                }`}
              >
                {s === "" && <Search className="h-3.5 w-3.5" />}
                {s || "All providers"}
              </button>
            ))}
          </div>
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
