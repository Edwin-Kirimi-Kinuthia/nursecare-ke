"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, LocateFixed, MapPin, Loader2, Pill, PackageSearch } from "lucide-react";
import type { StorefrontDrug } from "@carebora/api-client";
import { api } from "@/lib/api";
import DrugCard from "@/components/DrugCard";
import DrugDetailModal from "@/components/DrugDetailModal";
import { useLocation, KENYA_COUNTIES } from "@/components/LocationProvider";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function PharmacyPage() {
  const { lat, lng, county, label, loading: locating, requestPreciseLocation, setCounty } = useLocation();
  const [drugs, setDrugs] = useState<StorefrontDrug[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setLoading(true); });
    const query = {
      limit: 50,
      ...(category ? { category } : {}),
      ...(search ? { search } : {}),
      ...(lat != null && lng != null ? { lat, lng } : county ? { county } : {}),
    };
    api.searchDrugs(query)
      .then((res) => { if (active) setDrugs(res.drugs); })
      .catch(() => { if (active) setError("Could not load the pharmacy catalogue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, search, lat, lng, county]);

  // Categories come from an unfiltered look at what's on sale in the user's
  // area — not from `drugs`, which is already narrowed by the selected
  // category and the search box. Deriving them from the filtered list meant
  // choosing a category made every other chip disappear, and typing in the
  // search shrank the row again. Only the location changes this set.
  const [allCategories, setAllCategories] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    api.searchDrugs({
      limit: 50,
      ...(lat != null && lng != null ? { lat, lng } : county ? { county } : {}),
    })
      .then((res) => {
        if (active) setAllCategories(Array.from(new Set(res.drugs.map((d) => d.category))).sort());
      })
      .catch(() => { /* chips are optional; the grid reports its own errors */ });
    return () => { active = false; };
  }, [lat, lng, county]);

  const categories = useMemo(() => ["", ...allCategories], [allCategories]);

  return (
    <div>
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <PageHeader
            eyebrow="Pharmacy"
            Icon={Pill}
            title="Medicine, delivered"
            lede="Medication and supplies from licensed pharmacies near you, delivered across Kenya."
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLocationPicker((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700"
            >
              <MapPin className="h-3.5 w-3.5" /> {label}
            </button>
            {showLocationPicker && (
              <div className="flex items-center gap-2">
                <button
                  onClick={requestPreciseLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                >
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />} Use my location
                </button>
                <select
                  value={county ?? ""}
                  onChange={(e) => setCounty(e.target.value as (typeof KENYA_COUNTIES)[number])}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="" disabled>Or pick a county…</option>
                  {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medication…"
            className="mt-4 w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c || "all"}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category === c
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-500/30"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-700"
                }`}
              >
                {c || "All"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-72 rounded-2xl skeleton" />)}
          </div>
        ) : drugs.length === 0 ? (
          <EmptyState
            Icon={PackageSearch}
            title="No medication found"
            hint="Try a different search, category or location — stock varies by pharmacy."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {drugs.map((d, i) => <DrugCard key={d.drugId} d={d} index={i} onOpen={() => setSelected(d.drugId)} />)}
          </div>
        )}
      </section>

      {selected && <DrugDetailModal drugId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
