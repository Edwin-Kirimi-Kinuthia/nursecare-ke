"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { doctors, MedicalNote } from "@/lib/data";

const MOCK_CONSULTATIONS = [
  { id: "CONS-847291", patientName: "Sarah Wanjiku", patientEmail: "sarah.w@gmail.com", date: "Today", time: "09:00 AM", status: "upcoming", complaint: "Persistent cough and fever for 3 days" },
  { id: "CONS-638104", patientName: "James Ochieng", patientEmail: "j.ochieng@gmail.com", date: "Today", time: "10:30 AM", status: "upcoming", complaint: "Hypertension follow-up" },
  { id: "CONS-519274", patientName: "Amina Hassan", patientEmail: "amina.h@outlook.com", date: "Today", time: "02:00 PM", status: "upcoming", complaint: "Antenatal check-up, 28 weeks" },
  { id: "CONS-382940", patientName: "Peter Kamau", patientEmail: "peter.k@gmail.com", date: "Yesterday", time: "11:00 AM", status: "completed", complaint: "Diabetic review and medication refill" },
  { id: "CONS-201837", patientName: "Grace Njeri", patientEmail: "g.njeri@gmail.com", date: "Yesterday", time: "03:30 PM", status: "completed", complaint: "Mental health check-in, anxiety" },
  { id: "CONS-194726", patientName: "David Mutua", patientEmail: "dmutua@yahoo.com", date: "2 days ago", time: "09:30 AM", status: "completed", complaint: "Chest pain evaluation" },
];

const EMPTY_NOTE: Omit<MedicalNote, "id" | "doctorId" | "doctorName" | "date"> = {
  patientName: "",
  patientEmail: "",
  chiefComplaint: "",
  history: "",
  examination: "",
  diagnosis: "",
  treatment: "",
  prescription: "",
  followUp: "",
  consultationType: "Video",
};

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-4`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DoctorDashboardPage() {
  const [tab, setTab] = useState<"overview" | "consultations" | "notes" | "profile">("overview");
  const [notes, setNotes] = useState<MedicalNote[]>([]);
  const [noteTab, setNoteTab] = useState<"list" | "new">("list");
  const [noteForm, setNoteForm] = useState({ ...EMPTY_NOTE });
  const [noteSaved, setNoteSaved] = useState(false);
  const [searchNote, setSearchNote] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "completed">("all");
  const [doctorName, setDoctorName] = useState("Dr. Sarah Mwangi");
  const [doctorEmail, setDoctorEmail] = useState("doctor@nursecare.ke");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("nc_doctor_auth") !== "true") {
      window.location.href = "/auth/login";
      return;
    }
    const raw = localStorage.getItem("nc_medical_notes");
    if (raw) {
      try { setNotes(JSON.parse(raw)); } catch { /* ignore */ }
    }
    const profile = localStorage.getItem("nc_doctor_profile");
    if (profile) {
      try {
        const p = JSON.parse(profile);
        if (p.name) setDoctorName(p.name);
        if (p.email) setDoctorEmail(p.email);
      } catch { /* ignore */ }
    }
  }, []);

  const handleSaveNote = () => {
    if (!noteForm.patientName || !noteForm.chiefComplaint) return;
    const newNote: MedicalNote = {
      id: `NOTE-${Date.now()}`,
      doctorId: "d1",
      doctorName,
      date: new Date().toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }),
      ...noteForm,
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem("nc_medical_notes", JSON.stringify(updated));
    setNoteForm({ ...EMPTY_NOTE });
    setNoteSaved(true);
    setTimeout(() => { setNoteSaved(false); setNoteTab("list"); }, 1800);
  };

  const filteredConsultations = MOCK_CONSULTATIONS.filter(c =>
    filterStatus === "all" || c.status === filterStatus
  );
  const filteredNotes = notes.filter(n =>
    n.patientName.toLowerCase().includes(searchNote.toLowerCase()) ||
    n.patientEmail.toLowerCase().includes(searchNote.toLowerCase()) ||
    n.diagnosis.toLowerCase().includes(searchNote.toLowerCase())
  );

  const todayConsultations = MOCK_CONSULTATIONS.filter(c => c.date === "Today");
  const upcomingToday = todayConsultations.filter(c => c.status === "upcoming");

  return (
    <div className="pt-16 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-800 px-4 py-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-teal-300 text-sm font-medium mb-1">Doctor Portal</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{doctorName}</h1>
            <p className="text-teal-200 text-sm mt-1">{doctorEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 bg-teal-700/60 border border-teal-600 text-teal-100 text-sm font-semibold px-4 py-2 rounded-xl">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              On Duty
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto mt-6 flex gap-1 overflow-x-auto">
          {[
            { key: "overview", label: "Overview" },
            { key: "consultations", label: "Consultations" },
            { key: "notes", label: "Medical Notes" },
            { key: "profile", label: "My Profile" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? "bg-white text-teal-800 shadow-sm" : "text-teal-200 hover:bg-teal-700/50"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                label="Today's Sessions" value={todayConsultations.length} sub={`${upcomingToday.length} upcoming`} color="bg-teal-100"
              />
              <StatCard
                icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                label="Total Patients" value="1,248" sub="All time" color="bg-blue-100"
              />
              <StatCard
                icon={<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                label="Medical Notes" value={notes.length} sub="Stored records" color="bg-purple-100"
              />
              <StatCard
                icon={<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                label="Patient Rating" value="4.8 ★" sub="Based on 312 reviews" color="bg-amber-100"
              />
            </div>

            {/* Today's schedule */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-5">Today&apos;s Schedule</h2>
              {todayConsultations.length === 0 ? (
                <p className="text-slate-500 text-sm">No consultations scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {todayConsultations.map((c) => (
                    <div key={c.id} className={`flex items-center justify-between p-4 rounded-xl border ${c.status === "upcoming" ? "border-teal-200 bg-teal-50" : "border-slate-100 bg-slate-50"}`}>
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-sm font-bold text-slate-900">{c.time}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === "upcoming" ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-slate-600"}`}>
                            {c.status === "upcoming" ? "Upcoming" : "Done"}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{c.patientName}</p>
                          <p className="text-slate-500 text-xs">{c.complaint}</p>
                        </div>
                      </div>
                      {c.status === "upcoming" && (
                        <Link href={`/consultations/room/${c.id}`}
                          className="flex-shrink-0 flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Join
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Write Medical Note", icon: "📝", action: () => { setTab("notes"); setNoteTab("new"); } },
                { label: "View All Notes", icon: "📋", action: () => { setTab("notes"); setNoteTab("list"); } },
                { label: "Consultation History", icon: "📅", action: () => setTab("consultations") },
                { label: "Update Profile", icon: "👤", action: () => setTab("profile") },
              ].map((a) => (
                <button key={a.label} onClick={a.action}
                  className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 text-center hover:border-teal-300 hover:shadow-md transition-all">
                  <div className="text-2xl mb-2">{a.icon}</div>
                  <p className="text-sm font-semibold text-slate-700">{a.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CONSULTATIONS ── */}
        {tab === "consultations" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold text-slate-900 text-xl">Consultations</h2>
              <div className="flex gap-2">
                {(["all", "upcoming", "completed"] as const).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${filterStatus === s ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-300"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredConsultations.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${c.status === "upcoming" ? "bg-teal-500" : "bg-slate-400"}`}>
                      {c.patientName.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{c.patientName}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.status === "upcoming" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                          {c.status === "upcoming" ? "Upcoming" : "Completed"}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">{c.complaint}</p>
                      <p className="text-slate-400 text-xs mt-0.5 font-mono">{c.id} · {c.date} at {c.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.status === "upcoming" && (
                      <Link href={`/consultations/room/${c.id}`}
                        className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Join
                      </Link>
                    )}
                    <button onClick={() => { setNoteForm({ ...EMPTY_NOTE, patientName: c.patientName, patientEmail: c.patientEmail, chiefComplaint: c.complaint }); setTab("notes"); setNoteTab("new"); }}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-all">
                      Write Note
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MEDICAL NOTES ── */}
        {tab === "notes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold text-slate-900 text-xl">Medical Notes</h2>
              <div className="flex gap-2">
                <button onClick={() => setNoteTab("list")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${noteTab === "list" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                  All Notes ({notes.length})
                </button>
                <button onClick={() => setNoteTab("new")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${noteTab === "new" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                  + New Note
                </button>
              </div>
            </div>

            {noteTab === "list" && (
              <>
                <div className="relative max-w-sm">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Search by patient or diagnosis…" value={searchNote} onChange={(e) => setSearchNote(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="font-semibold text-slate-700">No medical notes yet</p>
                    <p className="text-slate-500 text-sm mt-1">Notes you write during consultations will appear here.</p>
                    <button onClick={() => setNoteTab("new")} className="mt-4 bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-700 transition-colors">
                      Write Your First Note
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredNotes.map((note) => (
                      <details key={note.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group">
                        <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 list-none">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                              {note.patientName.split(" ").map(w => w[0]).slice(0, 2).join("")}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{note.patientName}</p>
                              <p className="text-slate-500 text-xs">{note.patientEmail}</p>
                              <p className="text-teal-700 text-xs font-semibold mt-0.5">{note.diagnosis || "No diagnosis recorded"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-xs">{note.date}</span>
                            <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </summary>
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3 text-sm">
                          {[
                            { label: "Chief Complaint", value: note.chiefComplaint },
                            { label: "History of Presenting Illness", value: note.history },
                            { label: "Examination Findings", value: note.examination },
                            { label: "Diagnosis", value: note.diagnosis },
                            { label: "Treatment Plan", value: note.treatment },
                            { label: "Prescription", value: note.prescription },
                            { label: "Follow-up", value: note.followUp },
                          ].filter(f => f.value).map((field) => (
                            <div key={field.label}>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{field.label}</p>
                              <p className="text-slate-800 bg-slate-50 rounded-xl px-3 py-2">{field.value}</p>
                            </div>
                          ))}
                          <p className="text-xs text-slate-400 pt-1 font-mono">{note.id} · {note.consultationType} Consultation</p>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </>
            )}

            {noteTab === "new" && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
                <h3 className="font-bold text-slate-900 text-lg mb-6">New Medical Note</h3>

                {noteSaved && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Medical note saved successfully!
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Patient Name *</label>
                    <input type="text" value={noteForm.patientName} onChange={(e) => setNoteForm({ ...noteForm, patientName: e.target.value })}
                      placeholder="Full name" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Patient Email</label>
                    <input type="email" value={noteForm.patientEmail} onChange={(e) => setNoteForm({ ...noteForm, patientEmail: e.target.value })}
                      placeholder="patient@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  </div>
                </div>

                {[
                  { key: "chiefComplaint", label: "Chief Complaint *", placeholder: "Main reason for consultation" },
                  { key: "history", label: "History of Presenting Illness", placeholder: "Duration, progression, associated symptoms..." },
                  { key: "examination", label: "Examination Findings", placeholder: "Vital signs, physical examination findings..." },
                  { key: "diagnosis", label: "Diagnosis / Assessment", placeholder: "Working or confirmed diagnosis" },
                  { key: "treatment", label: "Treatment Plan", placeholder: "Management approach, referrals, investigations..." },
                  { key: "prescription", label: "Prescription", placeholder: "Medications, dosages, duration..." },
                  { key: "followUp", label: "Follow-up Instructions", placeholder: "When to return, warning signs, lifestyle advice..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="mb-4">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">{label}</label>
                    <textarea
                      value={(noteForm as Record<string, string>)[key]}
                      onChange={(e) => setNoteForm({ ...noteForm, [key]: e.target.value })}
                      rows={key === "history" || key === "treatment" ? 3 : 2}
                      placeholder={placeholder}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                    />
                  </div>
                ))}

                <div className="flex gap-3 mt-6">
                  <button onClick={handleSaveNote} disabled={!noteForm.patientName || !noteForm.chiefComplaint}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl transition-colors">
                    Save Medical Note
                  </button>
                  <button onClick={() => setNoteForm({ ...EMPTY_NOTE })}
                    className="px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm">
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab === "profile" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
              <h2 className="font-bold text-slate-900 text-lg mb-6">Doctor Profile</h2>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                  {doctorName.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{doctorName}</p>
                  <p className="text-slate-500 text-sm">{doctorEmail}</p>
                  <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full mt-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Verified Doctor
                  </span>
                </div>
              </div>

              {/* Linked profile */}
              {doctors.find(d => d.id === "d1") && (() => {
                const doc = doctors.find(d => d.id === "d1")!;
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: "Specialty", value: doc.specialty },
                        { label: "Sub-specialty", value: doc.subSpecialty || "—" },
                        { label: "Experience", value: `${doc.experience} years` },
                        { label: "Consultation Fee", value: `KES ${doc.consultationFee.toLocaleString()}` },
                        { label: "Total Patients", value: doc.totalPatients.toLocaleString() },
                        { label: "Rating", value: `${doc.rating} / 5.0 (${doc.reviews} reviews)` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-4">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                          <p className="text-sm font-semibold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Qualifications</p>
                      <div className="space-y-1">
                        {doc.qualifications.map(q => (
                          <div key={q} className="flex items-center gap-2 text-sm text-slate-700">
                            <div className="w-4 h-4 bg-teal-100 rounded flex items-center justify-center flex-shrink-0">
                              <svg className="w-2.5 h-2.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">Session</h3>
              <button onClick={() => { localStorage.removeItem("nc_doctor_auth"); localStorage.removeItem("nc_doctor_profile"); window.location.href = "/"; }}
                className="flex items-center gap-2 text-red-600 font-semibold text-sm hover:text-red-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out of Doctor Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
