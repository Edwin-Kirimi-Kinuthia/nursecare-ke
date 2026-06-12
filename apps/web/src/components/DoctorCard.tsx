import Link from "next/link";
import VerifiedBadge from "./VerifiedBadge";
import { Doctor } from "@/lib/data";

interface DoctorCardProps {
  doctor: Doctor;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className="p-6">
        {/* Role badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${doctor.role === "medical_officer" ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700"}`}>
            {doctor.role === "medical_officer" ? "Medical Officer" : "Clinical Officer"}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${doctor.available ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
            {doctor.available ? "● Available" : "Busy"}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <div className={`w-14 h-14 rounded-xl ${doctor.color} flex items-center justify-center text-white font-bold text-lg`}>
              {doctor.initials}
            </div>
            {doctor.verified && (
              <div className="absolute -bottom-1 -right-1">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-tight">{doctor.name}</h3>
            <p className="text-slate-500 text-sm mt-0.5">{doctor.specialty}</p>
            {doctor.subSpecialty && <p className="text-slate-400 text-xs mt-0.5">{doctor.subSpecialty}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              <Stars rating={doctor.rating} />
              <span className="text-slate-700 text-xs font-semibold">{doctor.rating}</span>
              <span className="text-slate-400 text-xs">({doctor.reviews})</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {doctor.experience} yrs exp.
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {doctor.totalPatients.toLocaleString()} patients
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {doctor.languages.join(", ")}
          </span>
        </div>

        {/* Video consultation badge */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-5">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-blue-700 text-xs font-semibold">Video Consultation Available</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <p className="text-slate-400 text-xs">Consultation fee</p>
            <p className="font-bold text-slate-900">KES {doctor.consultationFee.toLocaleString()}</p>
          </div>
          <Link
            href={`/consultations/${doctor.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Book Consult
          </Link>
        </div>
      </div>
    </div>
  );
}
