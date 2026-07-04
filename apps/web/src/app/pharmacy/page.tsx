"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import type { Product } from "@carebora/api-client";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";

export default function PharmacyPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.listProducts({ limit: 50 });
        if (active) setProducts(res.products);
      } catch {
        if (active) setError("Could not load products.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => ["", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  );
  const shown = category ? products.filter((p) => p.category === category) : products;

  return (
    <div>
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Pharmacy</h1>
          <p className="mt-2 text-slate-500">Medication and supplies, delivered across Kenya.</p>
          <div className="mt-6 flex flex-wrap gap-2">
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
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((p) => <ProductCard key={p.id} p={p} onOpen={() => setSelected(p)} />)}
          </div>
        )}
      </section>

      {selected && <ProductDetailModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
