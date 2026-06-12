"use client";

import { useState } from "react";
import DoctorCard from "@/components/DoctorCard";
import { doctors } from "@/lib/data";

const roles = ["All", "Medical Officer", "Clinical Officer"];
const specialties = ["All", "General Medicine", "Pediatrics", "Internal Medicine", "Obstetrics & Gynaecology", "Mental Health", "Reproductive Health", "Orthopaedics"];

export default function ConsultationsPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All");
  const [specialty, setSpecialty] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);

  const filtered = doctors.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
    const matchRole = role === "All" || (role === "Medical Officer" && d.role === "medical_officer") || (role === "Clinical Officer" && d.role === "clinical_officer");
    const matchSpec = specialty === "All" || d.specialty.toLowerCase().includes(specialty.toLowerCase());
    const matchAvail = !availableOnly || d.available;
    return matchSearch && matchRole && matchSpec && matchAvail;
  });

  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-blue-800/50 border border-blue-700 text-blue-200 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Online Video Consultations
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            See a Doctor from Home
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed mb-8">
            Book a video consultation with a verified Medical Officer or Clinical Officer. No commute, no waiting room — expert care in minutes.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search by name or specialty…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-slate-900 font-medium text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { icon: "🔍", title: "Choose a Doctor", desc: "Browse verified MOs and COs" },
            { icon: "📅", title: "Pick a Time Slot", desc: "See real-time availability" },
            { icon: "💳", title: "Pay Securely", desc: "M-Pesa, card, or wallet" },
            { icon: "📹", title: "Join Video Call", desc: "Consult from anywhere" },
          ].map((s) => (
            <div key={s.title}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <p className="font-bold text-slate-900 text-sm">{s.title}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${role === r ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"}`}>
                {r}
              </button>
            ))}

            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer">
              {specialties.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <button onClick={() => setAvailableOnly(!availableOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${availableOnly ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-600 border-slate-200"}`}>
            <span className={`w-2 h-2 rounded-full ${availableOnly ? "bg-green-200" : "bg-green-500"}`} />
            Available Now
          </button>
        </div>

        <p className="text-slate-500 text-sm mb-6">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> doctors
        </p>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">No doctors found</h3>
            <p className="text-slate-500">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
