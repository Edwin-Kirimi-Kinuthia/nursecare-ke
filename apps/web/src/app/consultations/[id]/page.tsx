"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doctors } from "@/lib/data";
import VerifiedBadge from "@/components/VerifiedBadge";

const today = new Date();
const dates = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  return {
    label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" }),
    value: d.toISOString().split("T")[0],
  };
});

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const doctor = doctors.find((d) => d.id === id);
  const [selectedDate, setSelectedDate] = useState(dates[0].value);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [booked, setBooked] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!doctor) {
    return (
      <div className="pt-32 text-center">
        <p className="text-slate-500">Doctor not found.</p>
        <Link href="/consultations" className="text-blue-600 mt-4 inline-block">← Back to consultations</Link>
      </div>
    );
  }

  const handleBook = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setBooked(true);
  };

  if (booked) {
    const consultId = `CONS-${Date.now().toString().slice(-6)}`;
    return (
      <div className="pt-16 min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Consultation Booked!</h1>
          <p className="text-slate-500 mb-6">Your video consultation with <strong>{doctor.name}</strong> is confirmed for <strong>{dates.find(d => d.value === selectedDate)?.label}</strong> at <strong>{selectedSlot}</strong>.</p>

          <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Consultation ID</span>
              <span className="font-mono font-bold text-slate-900">{consultId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Fee</span>
              <span className="font-bold text-slate-900">KES {doctor.consultationFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Type</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video Call
              </span>
            </div>
          </div>

          <Link href={`/consultations/room/${consultId}`}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-colors mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Join Video Call Now
          </Link>
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">Go to My Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 bg-slate-50 min-h-screen">
      {/* Banner */}
      <div className="bg-gradient-to-br from-blue-950 to-blue-900 pt-10 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/consultations" className="inline-flex items-center gap-1.5 text-blue-300 hover:text-white text-sm font-medium transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to Consultations
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor card */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 text-center">
              <div className="relative inline-block mb-4">
                <div className={`w-24 h-24 rounded-3xl ${doctor.color} flex items-center justify-center text-white font-bold text-4xl mx-auto shadow-lg`}>
                  {doctor.initials}
                </div>
                {doctor.verified && <div className="absolute -bottom-2 -right-2"><VerifiedBadge size="lg" /></div>}
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-full ${doctor.role === "medical_officer" ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700"}`}>
                {doctor.role === "medical_officer" ? "Medical Officer" : "Clinical Officer"}
              </span>

              <h1 className="text-xl font-bold text-slate-900 mt-3 mb-1">{doctor.name}</h1>
              <p className="text-slate-500 text-sm">{doctor.specialty}</p>
              {doctor.subSpecialty && <p className="text-slate-400 text-xs mt-0.5">{doctor.subSpecialty}</p>}

              <div className="flex items-center justify-center gap-2 mt-3 mb-5">
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className={`w-4 h-4 ${i <= Math.round(doctor.rating) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="font-bold text-slate-900 text-sm">{doctor.rating}</span>
                <span className="text-slate-400 text-xs">({doctor.reviews})</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
                {[
                  { v: `${doctor.experience}yr`, l: "Experience" },
                  { v: doctor.totalPatients.toLocaleString(), l: "Patients" },
                  { v: `KES ${(doctor.consultationFee/1000).toFixed(1)}K`, l: "Fee" },
                ].map(s => (
                  <div key={s.l}>
                    <p className="font-bold text-slate-900 text-sm">{s.v}</p>
                    <p className="text-slate-400 text-xs">{s.l}</p>
                  </div>
                ))}
              </div>

              <div className={`mt-4 flex items-center justify-center gap-2 py-2 rounded-xl ${doctor.available ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                <span className={`w-2 h-2 rounded-full ${doctor.available ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
                <span className="text-sm font-semibold">{doctor.available ? "Available Today" : "Fully Booked Today"}</span>
              </div>
            </div>

            {/* Qualifications */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Qualifications</h3>
              <div className="space-y-2">
                {doctor.qualifications.map((q) => (
                  <div key={q} className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {q}
                  </div>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map(l => (
                  <span key={l} className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">{l}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: bio + booking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="font-bold text-slate-900 text-xl mb-3">About {doctor.name.replace("Dr. ", "").replace("CO. ", "")}</h2>
              <p className="text-slate-600 leading-relaxed">{doctor.bio}</p>
            </div>

            {/* Booking panel */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="font-bold text-slate-900 text-xl mb-6">Book a Video Consultation</h2>

              {/* Date picker */}
              <div className="mb-6">
                <label className="text-sm font-bold text-slate-700 block mb-3">Select Date</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dates.map((d) => (
                    <button key={d.value} onClick={() => { setSelectedDate(d.value); setSelectedSlot(""); }}
                      className={`flex-shrink-0 px-4 py-3 rounded-2xl text-sm font-semibold transition-all border ${selectedDate === d.value ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              <div className="mb-8">
                <label className="text-sm font-bold text-slate-700 block mb-3">Select Time Slot</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {doctor.availableSlots.map((slot) => (
                    <button key={slot} onClick={() => setSelectedSlot(slot)}
                      className={`py-3 rounded-xl text-sm font-semibold transition-all border ${selectedSlot === slot ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary + confirm */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5">
                <h3 className="font-bold text-slate-900 text-sm mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doctor</span>
                    <span className="font-semibold text-slate-900">{doctor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="font-semibold text-slate-900">{dates.find(d => d.value === selectedDate)?.label || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time</span>
                    <span className="font-semibold text-slate-900">{selectedSlot || "Not selected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type</span>
                    <span className="font-semibold text-slate-900">📹 Video Consultation</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200 mt-2">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-blue-700 text-base">KES {doctor.consultationFee.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button onClick={handleBook} disabled={!selectedSlot || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0">
                {loading ? (
                  <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Confirming…</>
                ) : !selectedSlot ? "Select a time slot to continue" : "Confirm & Pay — KES " + doctor.consultationFee.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
