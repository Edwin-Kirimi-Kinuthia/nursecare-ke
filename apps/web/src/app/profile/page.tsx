"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Profile {
  name: string;
  email: string;
  phone: string;
  location: string;
  dob: string;
  blood: string;
  allergies: string;
  conditions: string;
  medications: string;
  ec_name: string;
  ec_relationship: string;
  ec_phone: string;
}

const defaultProfile: Profile = {
  name: "", email: "", phone: "", location: "", dob: "",
  blood: "", allergies: "", conditions: "", medications: "",
  ec_name: "", ec_relationship: "", ec_phone: "",
};

const tabs = ["Personal Info", "Medical Info", "Emergency Contact", "Security"];

function initials(name: string) {
  return name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";
}

function avatarColor(name: string) {
  const colors = ["bg-blue-500", "bg-teal-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
  let hash = 0;
  for (const c of name) hash += c.charCodeAt(0);
  return colors[hash % colors.length];
}

export default function ProfilePage() {
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [tab, setTab] = useState("Personal Info");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("nc_user_auth") !== "true") {
      window.location.href = "/auth/login";
      return;
    }
    setAuthed(true);
    const raw = localStorage.getItem("nc_user_profile");
    if (raw) {
      const parsed = { ...defaultProfile, ...JSON.parse(raw) };
      setProfile(parsed);
      setDraft(parsed);
    }
  }, []);

  const saveProfile = () => {
    localStorage.setItem("nc_user_profile", JSON.stringify(draft));
    setProfile(draft);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setEditing(false);
  };

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

  const inp = "w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="pt-16 min-h-screen bg-slate-50">
      {/* Header banner */}
      <div className="bg-gradient-to-br from-blue-950 to-blue-900 pt-12 pb-28 px-4" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ── Sidebar: Profile card ────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 text-center">
              {/* Avatar */}
              <div className={`w-24 h-24 ${avatarColor(profile.name)} rounded-3xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg`}>
                {initials(profile.name)}
              </div>

              <h2 className="font-bold text-slate-900 text-xl leading-tight">{profile.name || "Your Name"}</h2>
              <p className="text-slate-500 text-sm mt-1">{profile.email}</p>

              <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mt-3">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                NurseCare Member
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-100">
                {[
                  { label: "Bookings", value: "12" },
                  { label: "Reviews", value: "9" },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 rounded-xl py-3">
                    <p className="font-bold text-slate-900 text-lg">{s.value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-1">
              {[
                { label: "My Dashboard", href: "/dashboard", icon: "📋" },
                { label: "Book a Nurse", href: "/providers", icon: "🩺" },
                { label: "Emergency Help", href: "/emergency", icon: "🚨" },
              ].map((l) => (
                <Link key={l.label} href={l.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all">
                  <span>{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Saved toast */}
            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-5 py-3.5 rounded-2xl flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Profile saved successfully!
              </div>
            )}

            {/* Tab bar + edit button */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6">
                <div className="flex overflow-x-auto">
                  {tabs.map((t) => (
                    <button key={t} onClick={() => { setTab(t); setEditing(false); setDraft(profile); }}
                      className={`px-4 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {tab !== "Security" && !editing && (
                  <button onClick={() => setEditing(true)} className="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              <div className="p-6 sm:p-8">

                {/* ── Personal Info ──────────────────────────────────── */}
                {tab === "Personal Info" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Full Name</label>
                        <input className={inp} value={editing ? draft.name : profile.name} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Jane Wanjiku" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Email Address</label>
                        <input className={inp} value={editing ? draft.email : profile.email} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="jane@example.com" type="email" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Phone Number</label>
                        <input className={inp} value={editing ? draft.phone : profile.phone} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Date of Birth</label>
                        <input className={inp} value={editing ? draft.dob : profile.dob} disabled={!editing} type="date"
                          onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Location / Address</label>
                        <input className={inp} value={editing ? draft.location : profile.location} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="e.g. Westlands, Nairobi" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Medical Info ───────────────────────────────────── */}
                {tab === "Medical Info" && (
                  <div className="space-y-5">
                    <p className="text-slate-500 text-sm bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      This information helps your nurse prepare and provide better care. It is only visible to you and your booked healthcare providers.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Blood Group</label>
                        {editing ? (
                          <select className={inp} value={draft.blood} onChange={(e) => setDraft({ ...draft, blood: e.target.value })}>
                            <option value="">Select blood group…</option>
                            {["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map(b => <option key={b}>{b}</option>)}
                          </select>
                        ) : (
                          <div className={`${inp} ${!profile.blood ? "text-slate-400" : ""}`}>{profile.blood || "Not set"}</div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Known Allergies</label>
                        <input className={inp} value={editing ? draft.allergies : profile.allergies} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, allergies: e.target.value })} placeholder="e.g. Penicillin, Latex, None" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Chronic Conditions</label>
                        <input className={inp} value={editing ? draft.conditions : profile.conditions} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, conditions: e.target.value })} placeholder="e.g. Diabetes, Hypertension, None" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Current Medications</label>
                        <input className={inp} value={editing ? draft.medications : profile.medications} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, medications: e.target.value })} placeholder="e.g. Metformin 500mg, None" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Emergency Contact ──────────────────────────────── */}
                {tab === "Emergency Contact" && (
                  <div className="space-y-5">
                    <p className="text-slate-500 text-sm bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      In the event of a medical emergency, this person will be contacted on your behalf.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Contact Name</label>
                        <input className={inp} value={editing ? draft.ec_name : profile.ec_name} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, ec_name: e.target.value })} placeholder="e.g. John Wanjiku" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Relationship</label>
                        {editing ? (
                          <select className={inp} value={draft.ec_relationship} onChange={(e) => setDraft({ ...draft, ec_relationship: e.target.value })}>
                            <option value="">Select relationship…</option>
                            {["Spouse", "Parent", "Child", "Sibling", "Friend", "Guardian", "Other"].map(r => <option key={r}>{r}</option>)}
                          </select>
                        ) : (
                          <div className={`${inp} ${!profile.ec_relationship ? "text-slate-400" : ""}`}>{profile.ec_relationship || "Not set"}</div>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Contact Phone Number</label>
                        <input className={inp} value={editing ? draft.ec_phone : profile.ec_phone} disabled={!editing}
                          onChange={(e) => setDraft({ ...draft, ec_phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Security ───────────────────────────────────────── */}
                {tab === "Security" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Current Password</label>
                        <input type="password" className={inp} placeholder="••••••••" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">New Password</label>
                        <input type="password" className={inp} placeholder="Min 8 characters" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Confirm New Password</label>
                        <input type="password" className={inp} placeholder="Repeat new password" />
                      </div>
                      <div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
                          Update Password
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="font-bold text-slate-900 text-sm mb-3">Danger Zone</h3>
                      <button className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete My Account
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit action buttons */}
                {editing && (
                  <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100">
                    <button onClick={saveProfile} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </button>
                    <button onClick={cancelEdit} className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
