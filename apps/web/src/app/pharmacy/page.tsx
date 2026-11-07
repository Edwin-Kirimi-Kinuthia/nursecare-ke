"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, LocateFixed, MapPin, Loader2, Pill, PackageSearch, Search } from "lucide-react";
import type { StorefrontDrug } from "@carebora/api-client";
import { api } from "@/lib/api";
import DrugCard from "@/components/DrugCard";
import DrugDetailModal from "@/components/DrugDetailModal";
import { useLocation, KENYA_COUNTIES } from "@/components/LocationProvider";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Image from "next/image";
import { CARE_IMAGES } from "@/lib/care-imagery";

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
      <section className="page-banner">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:py-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
          <PageHeader eyebrow="Pharmacy" Icon={Pill} title="Medicine, delivered" lede="Everyday medicines and supplies from licensed pharmacies, delivered across Kenya. Pay with M-Pesa." />
          <div className="mt-6 flex max-w-xl items-center gap-2 rounded-lg bg-white p-1.5 ring-1 ring-slate-300">
            <Search className="ml-2.5 h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medication, e.g. Panadol"
              aria-label="Search medication"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          </div>
          <figure className="overflow-hidden rounded-2xl bg-[#234f34]">
            <div className="service-photo h-44 sm:h-64 lg:h-72"><Image src={CARE_IMAGES.pharmacy.src} alt={CARE_IMAGES.pharmacy.alt} fill placeholder="blur" loading="eager" sizes="(min-width: 1024px) 480px, 92vw" /></div>
            <figcaption className="px-5 py-4 text-sm leading-relaxed text-white">Compare pharmacy offers and delivery options. Upload a prescription when required.</figcaption>
          </figure>
        </div>
      </section>

      <section className="sticky top-16 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">

          <div className="flex flex-wrap items-center gap-2">
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

          {/* One swipeable row on phones; wraps on wider screens. */}
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <button
                key={c || "all"}
                onClick={() => setCategory(c)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
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
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-72 rounded-2xl skeleton" />)}
          </div>
        ) : drugs.length === 0 ? (
          <EmptyState
            Icon={PackageSearch}
            title="No medication found"
            hint="Try a different search, category or location — stock varies by pharmacy."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {drugs.map((d, i) => <DrugCard key={d.drugId} d={d} index={i} onOpen={() => setSelected(d.drugId)} />)}
          </div>
        )}
      </section>

      {selected && <DrugDetailModal drugId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
