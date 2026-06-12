"use client";

import { useState } from "react";
import ProviderCard from "@/components/ProviderCard";
import { providers } from "@/lib/data";

const specialties = ["All", "Home Care", "Nursing", "Emergency", "Physiotherapy", "Pediatric", "Maternal"];
const sortOptions = ["Top Rated", "Most Reviewed", "Lowest Price", "Fastest Response"];

export default function ProvidersPage() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("Top Rated");

  const filtered = providers
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.specialty.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase());
      const matchSpecialty =
        specialty === "All" ||
        p.services.some((s) => s.toLowerCase().includes(specialty.toLowerCase())) ||
        p.specialty.toLowerCase().includes(specialty.toLowerCase());
      const matchAvailable = !availableOnly || p.available;
      return matchSearch && matchSpecialty && matchAvailable;
    })
    .sort((a, b) => {
      if (sort === "Top Rated") return b.rating - a.rating;
      if (sort === "Most Reviewed") return b.reviews - a.reviews;
      if (sort === "Lowest Price") return a.rate - b.rate;
      if (sort === "Fastest Response") return a.responseTime.localeCompare(b.responseTime);
      return 0;
    });

  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 to-blue-900 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Find Your Nurse</h1>
          <p className="text-blue-200 text-lg mb-8">
            Browse {providers.length} verified healthcare professionals across Nairobi.
          </p>

          {/* Search bar */}
          <div className="relative max-w-xl mx-auto">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, specialty, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-slate-900 font-medium text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          {/* Specialty tabs */}
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <button
                key={s}
                onClick={() => setSpecialty(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  specialty === s
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Available toggle */}
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                availableOnly
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-green-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${availableOnly ? "bg-green-200" : "bg-green-500"}`} />
              Available Now
            </button>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              {sortOptions.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-500 text-sm">
            Showing <span className="font-semibold text-slate-900">{filtered.length}</span> providers
            {specialty !== "All" && <> in <span className="font-semibold text-blue-600">{specialty}</span></>}
          </p>
        </div>

        {/* Provider grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">No providers found</h3>
            <p className="text-slate-500">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
