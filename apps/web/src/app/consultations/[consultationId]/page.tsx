"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LiveKitRoom, GridLayout, ParticipantTile, RoomAudioRenderer, ControlBar, useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import {
  FileText, Pill, MessageSquare, Loader2, Plus, X, Download, PhoneOff, Check, Send, AlertCircle,
} from "lucide-react";
import type { Consultation, Message, RxRecord, MedicationRecord } from "@carebora/api-client";
import { api, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

/** LiveKit video grid — must render inside <LiveKitRoom>. */
function VideoStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

const EMPTY_MED: MedicationRecord = { name: "", dosage: "", frequency: "", duration: "" };

export default function ConsultationRoom() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const isDoctor = !!(consultation?.appointment && user && consultation.appointment.providerId === user.id);
  const [tab, setTab] = useState<"notes" | "rx" | "chat">("chat");

  // notes (doctor)
  const [notes, setNotes] = useState("");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // prescriptions
  const [rxList, setRxList] = useState<RxRecord[]>([]);
  const [meds, setMeds] = useState<MedicationRecord[]>([{ ...EMPTY_MED }]);
  const [rxInstructions, setRxInstructions] = useState("");
  const [rxBusy, setRxBusy] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);

  // chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    let cancelled = false;
    (async () => {
      try {
        const c = await api.getConsultation(consultationId);
        if (cancelled) return;
        setConsultation(c);
        setNotes(c.clinicalNotes ?? "");
        const isDoc = c.appointment?.providerId === user.id;
        setTab(isDoc ? "notes" : "chat");
        if (isDoc && c.status === "pending") {
          try { await api.patchConsultation(consultationId, { status: "active" }); } catch { /* non-fatal */ }
        }
        const t = await api.getLivekitToken(consultationId, user.fullName);
        if (cancelled) return;
        setToken(t.token);
        setServerUrl(t.livekitUrl);
        const [rx, msgs] = await Promise.all([
          api.listPrescriptions(consultationId),
          api.listMessages(consultationId),
        ]);
        if (cancelled) return;
        setRxList(rx);
        setMessages(msgs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load consultation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, consultationId, router]);

  // poll chat every 4s
  useEffect(() => {
    if (!consultation || ended) return;
    const iv = setInterval(async () => {
      try { setMessages(await api.listMessages(consultationId)); } catch { /* ignore */ }
    }, 4000);
    return () => clearInterval(iv);
  }, [consultation, consultationId, ended]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function onNotesChange(v: string) {
    setNotes(v);
    setNoteState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await api.patchConsultation(consultationId, { clinicalNotes: v }); setNoteState("saved"); }
      catch { setNoteState("error"); }
    }, 900);
  }

  async function issueRx(e: FormEvent) {
    e.preventDefault();
    setRxError(null);
    const valid = meds.filter((m) => m.name && m.dosage && m.frequency && m.duration);
    if (!valid.length) { setRxError("Add at least one complete medication."); return; }
    setRxBusy(true);
    try {
      await api.createPrescription(consultationId, { medications: valid, instructions: rxInstructions || undefined });
      setRxList(await api.listPrescriptions(consultationId));
      setMeds([{ ...EMPTY_MED }]);
      setRxInstructions("");
    } catch (e) {
      setRxError(e instanceof Error ? e.message : "Failed to issue prescription");
    } finally { setRxBusy(false); }
  }

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try { await api.sendMessage(consultationId, { content: text }); setMessages(await api.listMessages(consultationId)); }
    catch { /* ignore */ }
  }

  async function endConsult() {
    try {
      await api.patchConsultation(consultationId, { status: "ended" });
      if (isDoctor && consultation) {
        try { await api.patchAppointment(consultation.appointmentId, { status: "completed" }); } catch { /* non-fatal */ }
      }
    } finally { setEnded(true); router.push("/appointments"); }
  }

  function setMed(i: number, key: keyof MedicationRecord, val: string) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, [key]: val } : m)));
  }

  if (loading) {
    return <div className="grid h-[calc(100vh-4rem)] place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (error) {
    return (
      <div className="grid h-[calc(100vh-4rem)] place-items-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-rose-600" />
          <p className="mt-2 font-semibold text-rose-700">{error}</p>
          <button onClick={() => router.push("/appointments")} className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Back to appointments</button>
        </div>
      </div>
    );
  }

  const tabs: { key: "notes" | "rx" | "chat"; label: string; Icon: typeof FileText }[] = [
    ...(isDoctor ? [{ key: "notes" as const, label: "Notes", Icon: FileText }] : []),
    { key: "rx", label: "Prescriptions", Icon: Pill },
    { key: "chat", label: "Chat", Icon: MessageSquare },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Video */}
      <div className="relative min-h-[280px] flex-1 bg-slate-950">
        {token && serverUrl ? (
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect
            video
            audio
            data-lk-theme="default"
            style={{ height: "100%" }}
          >
            <div className="h-[calc(100%-56px)]"><VideoStage /></div>
            <RoomAudioRenderer />
            <ControlBar variation="minimal" controls={{ camera: true, microphone: true, screenShare: true, chat: false, leave: false, settings: false }} />
          </LiveKitRoom>
        ) : (
          <div className="grid h-full place-items-center text-slate-500">
            <div className="text-center"><AlertCircle className="mx-auto h-6 w-6" /><p className="mt-2 text-sm">Video is not configured.</p></div>
          </div>
        )}
        <button
          onClick={endConsult}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-rose-700"
        >
          <PhoneOff className="h-4 w-4" /> {isDoctor ? "End consultation" : "Leave"}
        </button>
      </div>

      {/* Side panel */}
      <div className="flex w-full flex-col border-t border-slate-200 bg-white lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="flex border-b border-slate-200">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition ${
                tab === key ? "border-b-2 border-teal-600 text-teal-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Notes (doctor) */}
        {tab === "notes" && isDoctor && (
          <div className="flex flex-1 flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Clinical notes</label>
              <span className="text-xs text-slate-400">
                {noteState === "saving" && "Saving…"}
                {noteState === "saved" && <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> Saved</span>}
                {noteState === "error" && <span className="text-rose-600">Save failed</span>}
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Document the consultation — history, examination, assessment, plan…"
              className="flex-1 resize-none rounded-xl border border-slate-200 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-2 text-xs text-slate-400">Notes save automatically and appear in the patient&apos;s medical history.</p>
          </div>
        )}

        {/* Prescriptions */}
        {tab === "rx" && (
          <div className="flex-1 overflow-y-auto p-4">
            {isDoctor && (
              <form onSubmit={issueRx} className="mb-4 rounded-xl border border-slate-200 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-700">New prescription</div>
                {meds.map((m, i) => (
                  <div key={i} className="mb-2 grid grid-cols-2 gap-2">
                    <input value={m.name} onChange={(e) => setMed(i, "name", e.target.value)} placeholder="Medication" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                    <input value={m.dosage} onChange={(e) => setMed(i, "dosage", e.target.value)} placeholder="Dosage e.g. 500mg" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                    <input value={m.frequency} onChange={(e) => setMed(i, "frequency", e.target.value)} placeholder="Frequency e.g. 3x daily" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                    <div className="flex gap-1">
                      <input value={m.duration} onChange={(e) => setMed(i, "duration", e.target.value)} placeholder="Duration e.g. 7 days" className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                      {meds.length > 1 && (
                        <button type="button" onClick={() => setMeds(meds.filter((_, idx) => idx !== i))} className="rounded-lg px-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setMeds([...meds, { ...EMPTY_MED }])} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700">
                  <Plus className="h-3.5 w-3.5" /> Add medication
                </button>
                <textarea value={rxInstructions} onChange={(e) => setRxInstructions(e.target.value)} placeholder="Instructions (optional)" rows={2} className="mb-2 w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                {rxError && <p className="mb-2 text-xs text-rose-600">{rxError}</p>}
                <button type="submit" disabled={rxBusy} className="w-full rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                  {rxBusy ? "Issuing…" : "Issue prescription"}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {rxList.length === 0 && <p className="text-sm text-slate-400">No prescriptions yet.</p>}
              {rxList.map((rx) => (
                <div key={rx.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{when(rx.issuedAt)}</span>
                    <a href={api.prescriptionPdfUrl(consultationId, rx.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </a>
                  </div>
                  {rx.medications.map((m, i) => (
                    <div key={i} className="text-sm text-slate-700">
                      <span className="font-semibold">{m.name}</span> {m.dosage} · {m.frequency} · {m.duration}
                    </div>
                  ))}
                  {rx.instructions && <p className="mt-1 text-xs text-slate-500">{rx.instructions}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        {tab === "chat" && (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet. Say hello 👋</p>}
              {messages.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                      {!mine && <div className="text-xs font-semibold opacity-70">{m.sender.fullName}</div>}
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 border-t border-slate-200 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Type a message…"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button onClick={send} className="grid place-items-center rounded-xl bg-teal-600 px-3 text-white hover:bg-teal-700"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
