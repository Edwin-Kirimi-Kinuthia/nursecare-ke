"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminStats, pendingVerifications } from "@/lib/data";
import VerifiedBadge from "@/components/VerifiedBadge";

const tabs = ["Dashboard", "Verifications", "Users", "Providers", "Reports"];

export default function AdminPage() {
  const [tab, setTab] = useState("Dashboard");
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("nc_admin_auth") !== "true") {
      router.replace("/admin/login");
    } else {
      setAuthed(true);
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem("nc_admin_auth");
    router.replace("/admin/login");
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }
  const [verifications, setVerifications] = useState(pendingVerifications);

  const approve = (id: string) =>
    setVerifications((v) => v.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
  const reject = (id: string) =>
    setVerifications((v) => v.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)));

  return (
    <div className="pt-16 min-h-screen bg-slate-50">
      {/* Sidebar + Content layout */}
      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 hidden lg:flex flex-col flex-shrink-0">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">NurseCare Admin</p>
                <p className="text-slate-400 text-xs">Management Panel</p>
              </div>
            </div>
          </div>

          <nav className="p-4 flex-1 space-y-1">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${tab === t ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                {t === "Dashboard" && "📊 "}
                {t === "Verifications" && "✅ "}
                {t === "Users" && "👥 "}
                {t === "Providers" && "🩺 "}
                {t === "Reports" && "📈 "}
                {t}
                {t === "Verifications" && verifications.filter(v => v.status === "pending" || v.status === "review").length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {verifications.filter(v => v.status === "pending" || v.status === "review").length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
              <div>
                <p className="text-white text-xs font-semibold">Admin User</p>
                <p className="text-slate-400 text-xs">admin@nursecare.ke</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {/* Mobile tab bar */}
          <div className="lg:hidden bg-white border-b border-slate-100 px-4 overflow-x-auto">
            <div className="flex items-center gap-1 py-2">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {/* ── DASHBOARD ──────────────────────────────────────────── */}
            {tab === "Dashboard" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
                  <p className="text-slate-500 text-sm mt-1">Platform statistics — April 2026</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Providers", value: adminStats.totalProviders, sub: `${adminStats.verifiedProviders} verified`, icon: "🩺", color: "bg-blue-50 border-blue-100" },
                    { label: "Total Patients", value: adminStats.totalPatients.toLocaleString(), sub: "Registered users", icon: "👥", color: "bg-teal-50 border-teal-100" },
                    { label: "Active Bookings", value: adminStats.activeBookings, sub: "Right now", icon: "📋", color: "bg-green-50 border-green-100" },
                    { label: "Pending Reviews", value: adminStats.pendingVerification, sub: "Need action", icon: "⏳", color: "bg-amber-50 border-amber-100" },
                    { label: "Emergency Requests", value: adminStats.emergencyRequests, sub: "Today", icon: "🚨", color: "bg-red-50 border-red-100" },
                    { label: "Monthly Revenue", value: `KES ${(adminStats.monthlyRevenue / 1000000).toFixed(2)}M`, sub: "April 2026", icon: "💰", color: "bg-purple-50 border-purple-100" },
                    { label: "Platform Rating", value: `${adminStats.averageRating} ★`, sub: "Average from all reviews", icon: "⭐", color: "bg-amber-50 border-amber-100" },
                    { label: "Verification Rate", value: `${Math.round((adminStats.verifiedProviders / adminStats.totalProviders) * 100)}%`, sub: "Providers verified", icon: "✅", color: "bg-sky-50 border-sky-100" },
                  ].map((s) => (
                    <div key={s.label} className={`${s.color} border rounded-2xl p-5`}>
                      <span className="text-2xl">{s.icon}</span>
                      <p className="font-bold text-slate-900 text-2xl mt-3">{s.value}</p>
                      <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Quick actions */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-bold text-slate-900 mb-4">Quick Actions</h2>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setTab("Verifications")} className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
                      ⏳ Review Pending ({adminStats.pendingVerification})
                    </button>
                    <button onClick={() => setTab("Users")} className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
                      👥 Manage Users
                    </button>
                    <button className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-800 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
                      📤 Export Report
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── VERIFICATIONS ──────────────────────────────────────── */}
            {tab === "Verifications" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Provider Verifications</h1>
                    <p className="text-slate-500 text-sm mt-1">Review and approve healthcare provider applications</p>
                  </div>
                  <span className="bg-amber-100 text-amber-700 font-bold text-sm px-3 py-1.5 rounded-full">
                    {verifications.filter(v => v.status === "pending" || v.status === "review").length} Pending
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {["Provider", "Specialty", "Submitted", "Documents", "Status", "Actions"].map((h) => (
                            <th key={h} className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {verifications.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xs">
                                  {v.name.split(" ").map(n => n[0]).join("")}
                                </div>
                                <span className="font-semibold text-slate-900 text-sm">{v.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm">{v.specialty}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{v.submitted}</td>
                            <td className="px-6 py-4">
                              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{v.docs} files</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                v.status === "approved" ? "bg-green-100 text-green-700" :
                                v.status === "rejected" ? "bg-red-100 text-red-700" :
                                v.status === "review" ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {v.status === "approved" ? "✓ Approved" :
                                 v.status === "rejected" ? "✗ Rejected" :
                                 v.status === "review" ? "In Review" : "Pending"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {v.status !== "approved" && v.status !== "rejected" ? (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => approve(v.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                                    Approve
                                  </button>
                                  <button onClick={() => reject(v.id)} className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                                    Reject
                                  </button>
                                  <button className="text-blue-600 hover:text-blue-700 text-xs font-semibold">View Docs</button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Action taken</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* What happens on approval */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                  <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <VerifiedBadge size="sm" /> What happens when you approve?
                  </h3>
                  <ul className="text-blue-800 text-sm space-y-1.5">
                    <li>✓ Provider receives a Verified badge on their profile (sky blue checkmark)</li>
                    <li>✓ They appear in provider search results</li>
                    <li>✓ An email notification is sent to the provider</li>
                    <li>✓ Their license number is logged in the audit trail</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── USERS ──────────────────────────────────────────────── */}
            {tab === "Users" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                  <p className="text-slate-500 text-sm mt-1">{adminStats.totalPatients.toLocaleString()} registered patients</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <div className="relative max-w-sm">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input placeholder="Search users…" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {["User", "Email", "Phone", "Bookings", "Joined", "Status"].map(h => (
                            <th key={h} className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {[
                          { name: "Sarah Njoroge", initials: "SN", email: "sarah@example.com", phone: "+254 700 123 456", bookings: 12, joined: "Jan 2026", active: true },
                          { name: "David Mutua", initials: "DM", email: "david@example.com", phone: "+254 711 987 654", bookings: 8, joined: "Feb 2026", active: true },
                          { name: "Fatuma Ali", initials: "FA", email: "fatuma@example.com", phone: "+254 722 456 789", bookings: 15, joined: "Dec 2025", active: true },
                          { name: "Brian Otieno", initials: "BO", email: "brian@example.com", phone: "+254 733 111 222", bookings: 3, joined: "Mar 2026", active: false },
                        ].map((u) => (
                          <tr key={u.name} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center text-white font-bold text-xs">{u.initials}</div>
                                <span className="font-semibold text-slate-900 text-sm">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{u.email}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{u.phone}</td>
                            <td className="px-6 py-4 text-slate-700 font-semibold text-sm">{u.bookings}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{u.joined}</td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                {u.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROVIDERS ──────────────────────────────────────────── */}
            {tab === "Providers" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Provider Management</h1>
                  <p className="text-slate-500 text-sm mt-1">{adminStats.totalProviders} total · {adminStats.verifiedProviders} verified</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Providers", value: adminStats.totalProviders, color: "bg-blue-50 border-blue-100 text-blue-700" },
                    { label: "Verified", value: adminStats.verifiedProviders, color: "bg-green-50 border-green-100 text-green-700" },
                    { label: "Pending", value: adminStats.pendingVerification, color: "bg-amber-50 border-amber-100 text-amber-700" },
                  ].map(s => (
                    <div key={s.label} className={`${s.color} border rounded-2xl p-5 text-center`}>
                      <p className="font-bold text-3xl">{s.value}</p>
                      <p className="text-sm font-semibold mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <p className="text-slate-500 text-sm">Full provider management table — use the Verifications tab to approve new providers. Active provider profiles can be suspended, edited, or have their verification status revoked from here.</p>
                </div>
              </div>
            )}

            {/* ── REPORTS ──────────────────────────────────────────────── */}
            {tab === "Reports" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { title: "Monthly Revenue", value: `KES ${(adminStats.monthlyRevenue/1000000).toFixed(2)}M`, change: "+18% vs last month", up: true },
                    { title: "New Registrations", value: "843", change: "+24% vs last month", up: true },
                    { title: "Booking Completion Rate", value: "94.3%", change: "+2.1% vs last month", up: true },
                    { title: "Emergency Response Time", value: "< 28 min avg", change: "-3 min vs last month", up: true },
                  ].map((r) => (
                    <div key={r.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                      <p className="text-slate-500 text-sm mb-2">{r.title}</p>
                      <p className="text-3xl font-bold text-slate-900 mb-2">{r.value}</p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {r.up ? "↑" : "↓"} {r.change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
