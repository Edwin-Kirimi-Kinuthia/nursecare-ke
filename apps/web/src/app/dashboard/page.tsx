"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const bookings = [
  { id: "b1", nurse: "Grace Wanjiku", initials: "GW", color: "bg-blue-500", service: "Home-Based Care", date: "2026-05-02", time: "9:00 AM", status: "upcoming", rate: 1500, hours: 4 },
  { id: "b2", nurse: "James Mwangi", initials: "JM", color: "bg-teal-500", service: "IV Therapy", date: "2026-04-25", time: "2:00 PM", status: "completed", rate: 2000, hours: 2 },
  { id: "b3", nurse: "Mary Achieng", initials: "MA", color: "bg-orange-500", service: "Physiotherapy", date: "2026-04-18", time: "11:00 AM", status: "completed", rate: 2200, hours: 3 },
];

const tabs = ["Overview", "My Bookings", "Emergency", "Settings"];



export default function DashboardPage() {
  const [tab, setTab] = useState("Overview");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("nc_user_auth") !== "true") {
      window.location.href = "/auth/login";
    } else {
      setAuthed(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm">Good morning,</p>
            <h1 className="text-xl font-bold text-slate-900">Sarah Njoroge</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/emergency" className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors emergency-pulse">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Emergency
            </Link>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">SN</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === "Overview" && (
          <div className="space-y-8">
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Bookings", value: "12", icon: "📋", color: "bg-blue-50 border-blue-100" },
                { label: "Upcoming", value: "1", icon: "📅", color: "bg-green-50 border-green-100" },
                { label: "Total Spent", value: "KES 48,500", icon: "💳", color: "bg-purple-50 border-purple-100" },
                { label: "Avg. Rating Given", value: "4.9 ★", icon: "⭐", color: "bg-amber-50 border-amber-100" },
              ].map((s) => (
                <div key={s.label} className={`${s.color} border rounded-2xl p-5`}>
                  <span className="text-2xl">{s.icon}</span>
                  <p className="font-bold text-slate-900 text-xl mt-3">{s.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Upcoming booking */}
            {bookings.filter(b => b.status === "upcoming").map(b => (
              <div key={b.id} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="font-bold text-slate-900 text-lg">Upcoming Appointment</h2>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">Confirmed</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${b.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>{b.initials}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{b.nurse}</h3>
                      <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm">{b.service}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>📅 {b.date}</span>
                      <span>🕐 {b.time}</span>
                      <span>⏱ {b.hours} hrs</span>
                      <span className="font-semibold text-slate-700">KES {(b.rate * b.hours).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">Contact Nurse</button>
                  <button className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">Reschedule</button>
                  <button className="px-4 py-2 border border-red-200 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors ml-auto">Cancel</button>
                </div>
              </div>
            ))}

            {/* Quick actions */}
            <div>
              <h2 className="font-bold text-slate-900 text-lg mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Book a Nurse", icon: "🩺", href: "/providers", color: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
                  { label: "Browse Services", icon: "📋", href: "/services", color: "bg-teal-50 hover:bg-teal-100 border-teal-200" },
                  { label: "Emergency Help", icon: "🚨", href: "/emergency", color: "bg-red-50 hover:bg-red-100 border-red-200" },
                  { label: "My Profile", icon: "👤", href: "#", color: "bg-purple-50 hover:bg-purple-100 border-purple-200" },
                ].map((a) => (
                  <Link key={a.label} href={a.href} className={`${a.color} border rounded-2xl p-5 flex flex-col items-center gap-2 text-center transition-colors`}>
                    <span className="text-2xl">{a.icon}</span>
                    <span className="text-sm font-semibold text-slate-700">{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "My Bookings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-900 text-xl">Booking History</h2>
              <Link href="/providers" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">+ New Booking</Link>
            </div>
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${b.color} flex items-center justify-center text-white font-bold flex-shrink-0`}>{b.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm">{b.nurse}</p>
                    <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs">{b.service} · {b.date} · {b.time}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900 text-sm">KES {(b.rate * b.hours).toLocaleString()}</p>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${b.status === "upcoming" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {b.status === "upcoming" ? "Upcoming" : "Completed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Emergency" && (
          <div className="max-w-lg">
            <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 emergency-pulse">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Emergency Response</h2>
              <p className="text-slate-500 mb-6">Our emergency team is on standby 24/7. Average response time is 25 minutes.</p>
              <Link href="/emergency" className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-colors mb-4">
                Request Emergency Help
              </Link>
              <a href="tel:+254700911911" className="w-full inline-flex items-center justify-center gap-2 border border-red-200 text-red-600 font-bold py-3.5 rounded-2xl transition-colors hover:bg-red-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call +254 700 911 911
              </a>
            </div>
          </div>
        )}

        {tab === "Settings" && (
          <div className="max-w-lg space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-bold text-slate-900 mb-5">Profile Information</h2>
              <div className="space-y-4">
                {[
                  { label: "Full Name", value: "Sarah Njoroge" },
                  { label: "Email", value: "sarah@example.com" },
                  { label: "Phone", value: "+254 700 123 456" },
                  { label: "Location", value: "Nairobi, Kenya" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">{f.label}</label>
                    <input defaultValue={f.value} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                ))}
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
