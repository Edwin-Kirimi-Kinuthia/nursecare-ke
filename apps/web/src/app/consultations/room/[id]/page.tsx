"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function VideoCallRoom() {
  const { id } = useParams<{ id: string }>();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sidePanel, setSidePanel] = useState<"chat" | "notes" | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [ended, setEnded] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([
    { from: "doctor", text: "Hello! I can see and hear you clearly. How are you feeling today?", time: "now" },
  ]);

  const [note, setNote] = useState({
    chiefComplaint: "",
    history: "",
    examination: "",
    diagnosis: "",
    treatment: "",
    prescription: "",
    followUp: "",
  });
  const [noteSaved, setNoteSaved] = useState(false);

  // Timer
  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [ended]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const sendMessage = () => {
    if (!chatMsg.trim()) return;
    setMessages((prev) => [...prev, { from: "patient", text: chatMsg, time: formatTime(seconds) }]);
    setChatMsg("");
    // Simulate doctor reply after 2s
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: "doctor", text: "I see. Let me note that down.", time: formatTime(seconds + 2) }]);
    }, 2000);
  };

  const saveNote = () => {
    const existing = JSON.parse(localStorage.getItem("nc_medical_notes") || "[]");
    const newNote = {
      id: `note-${Date.now()}`,
      consultationId: id,
      date: new Date().toISOString().split("T")[0],
      ...note,
    };
    localStorage.setItem("nc_medical_notes", JSON.stringify([...existing, newNote]));
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  };

  if (ended) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Consultation Ended</h1>
          <p className="text-slate-500 mb-2">Duration: <strong>{formatTime(seconds)}</strong></p>
          <p className="text-slate-500 text-sm mb-8">Thank you for using NurseCare Kenya. A summary will be sent to your email.</p>
          <div className="space-y-3">
            <Link href="/dashboard" className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition-colors">Go to Dashboard</Link>
            <Link href="/consultations" className="w-full inline-flex items-center justify-center border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-2xl hover:bg-slate-50 transition-colors">Book Another</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-800/80 backdrop-blur border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-semibold text-sm">Live Consultation</span>
          <span className="bg-slate-700 text-slate-300 text-xs font-mono px-2.5 py-1 rounded-lg">{formatTime(seconds)}</span>
        </div>
        <div className="text-slate-400 text-xs font-mono">ID: {id}</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-slate-300 text-xs">Encrypted</span>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative p-4 flex flex-col gap-4">
          {/* Doctor video (large) */}
          <div className="flex-1 bg-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center min-h-0">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-3 shadow-xl">
                DO
              </div>
              <p className="text-white font-semibold">Dr. Daniel Omondi</p>
              <p className="text-slate-400 text-sm">Medical Officer · General Medicine</p>
            </div>
            {/* Mic indicator */}
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur text-white text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Doctor
            </div>
          </div>

          {/* Patient self-view (small) */}
          <div className="absolute bottom-24 right-8 w-40 h-28 bg-slate-700 rounded-xl overflow-hidden border-2 border-slate-600 shadow-xl flex items-center justify-center">
            {camOn ? (
              <div className="text-center">
                <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-sm mx-auto mb-1">You</div>
                <p className="text-slate-300 text-xs">Camera on</p>
              </div>
            ) : (
              <div className="text-center">
                <svg className="w-8 h-8 text-slate-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
                </svg>
                <p className="text-slate-500 text-xs mt-1">Cam off</p>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0">
            {/* Panel tabs */}
            <div className="flex border-b border-slate-700">
              {(["chat", "notes"] as const).map((p) => (
                <button key={p} onClick={() => setSidePanel(p)}
                  className={`flex-1 py-3 text-sm font-semibold capitalize transition-all ${sidePanel === p ? "text-white border-b-2 border-blue-500" : "text-slate-400 hover:text-slate-200"}`}>
                  {p === "chat" ? "💬 Chat" : "📋 Medical Notes"}
                </button>
              ))}
              <button onClick={() => setSidePanel(null)} className="px-3 text-slate-500 hover:text-slate-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Chat panel */}
            {sidePanel === "chat" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.from === "patient" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.from === "patient" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-100"}`}>
                        <p>{m.text}</p>
                        <p className="text-xs opacity-50 mt-1">{m.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-slate-700 flex gap-2">
                  <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message…"
                    className="flex-1 bg-slate-700 text-white text-sm px-3 py-2.5 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500" />
                  <button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            )}

            {/* Medical notes panel */}
            {sidePanel === "notes" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Doctor&apos;s Medical Notes</p>
                {noteSaved && (
                  <div className="bg-green-900/40 border border-green-700 text-green-400 text-xs font-semibold px-3 py-2 rounded-xl">✓ Notes saved successfully</div>
                )}
                {[
                  { key: "chiefComplaint", label: "Chief Complaint" },
                  { key: "history", label: "History of Presenting Illness" },
                  { key: "examination", label: "Examination Findings" },
                  { key: "diagnosis", label: "Diagnosis" },
                  { key: "treatment", label: "Treatment Plan" },
                  { key: "prescription", label: "Prescription" },
                  { key: "followUp", label: "Follow-up Instructions" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">{label}</label>
                    <textarea rows={2} value={note[key as keyof typeof note]}
                      onChange={(e) => setNote({ ...note, [key]: e.target.value })}
                      className="w-full bg-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-slate-500"
                      placeholder={`Enter ${label.toLowerCase()}…`} />
                  </div>
                ))}
                <button onClick={saveNote} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Save Notes
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-800/90 backdrop-blur border-t border-slate-700 px-6 py-4 flex items-center justify-center gap-3 flex-shrink-0">
        {/* Mic */}
        <button onClick={() => setMicOn(!micOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
          title={micOn ? "Mute mic" : "Unmute mic"}>
          {micOn ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
          )}
        </button>

        {/* Camera */}
        <button onClick={() => setCamOn(!camOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
          title={camOn ? "Turn off camera" : "Turn on camera"}>
          {camOn ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" /></svg>
          )}
        </button>

        {/* Chat toggle */}
        <button onClick={() => setSidePanel(sidePanel === "chat" ? null : "chat")}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${sidePanel === "chat" ? "bg-blue-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
          title="Toggle chat">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        </button>

        {/* Notes toggle */}
        <button onClick={() => setSidePanel(sidePanel === "notes" ? null : "notes")}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${sidePanel === "notes" ? "bg-blue-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
          title="Medical notes">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
        </button>

        {/* End call */}
        <button onClick={() => setEnded(true)}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all shadow-lg ml-4"
          title="End call">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
