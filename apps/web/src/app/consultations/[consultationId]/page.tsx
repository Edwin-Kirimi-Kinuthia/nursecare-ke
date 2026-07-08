"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LiveKitRoom, GridLayout, ParticipantTile, RoomAudioRenderer, ControlBar, useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import {
  FileText, Pill, MessageSquare, Loader2, Plus, X, Download, PhoneOff, Check, Send, AlertCircle, Sparkles,
} from "lucide-react";
import type { Consultation, Message, RxRecord, MedicationRecord, FactCheckResult } from "@carebora/api-client";
import { clinicalTemplateFor, type ClinicalRecord } from "@carebora/shared";
import { api, kes, when } from "@/lib/api";
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
  const [tab, setTab] = useState<"notes" | "rx" | "chat" | "ai">("chat");

  // AI clinical fact-check (provider only)
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<FactCheckResult | null>(null);

  async function askAi(e: FormEvent) {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiBusy(true);
    try { setAiResult(await api.factCheck(aiQuestion.trim())); }
    catch { setAiResult({ answer: "Could not reach the AI service.", disclaimer: "", pharmacySuggestions: [] }); }
    finally { setAiBusy(false); }
  }

  // structured clinical record (provider) — treatment sheet / cardex / assessment
  const template = clinicalTemplateFor(user?.role);
  const [record, setRecord] = useState<ClinicalRecord>({});
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
        setRecord((c.clinicalRecord as ClinicalRecord) ?? {});
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

  // Keep the chat pinned to the latest message by scrolling the chat container
  // itself — never scrollIntoView, which would scroll the whole page/window.
  useEffect(() => {
    const el = chatEndRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onSectionChange(key: string, value: string) {
    const next = { ...record, [key]: value };
    setRecord(next);
    setNoteState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await api.patchConsultation(consultationId, { clinicalRecord: next }); setNoteState("saved"); }
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
      // Only the doctor ends the consultation (and completes the appointment).
      // A patient tapping "Leave" simply exits — it must not end the room or
      // complete the appointment for everyone.
      if (isDoctor) {
        await api.patchConsultation(consultationId, { status: "ended" });
        if (consultation) {
          try { await api.patchAppointment(consultation.appointmentId, { status: "completed" }); } catch { /* non-fatal */ }
        }
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

  const tabs: { key: "notes" | "rx" | "chat" | "ai"; label: string; Icon: typeof FileText }[] = [
    ...(isDoctor ? [{ key: "notes" as const, label: template.shortLabel, Icon: FileText }] : []),
    { key: "rx", label: "Prescriptions", Icon: Pill },
    { key: "chat", label: "Chat", Icon: MessageSquare },
    ...(isDoctor ? [{ key: "ai" as const, label: "AI assist", Icon: Sparkles }] : []),
  ];

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden lg:flex-row">
      {/* Video */}
      <div className="relative h-[42dvh] shrink-0 bg-slate-950 lg:h-auto lg:min-h-0 lg:flex-1">
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
      <div className="flex min-h-0 w-full flex-1 flex-col border-t border-slate-200 bg-white lg:w-[380px] lg:flex-none lg:border-l lg:border-t-0">
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

        {/* Structured clinical record (doctor treatment sheet / nurse cardex / physio assessment) */}
        {tab === "notes" && isDoctor && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{template.title}</h3>
                <p className="text-xs text-slate-400">Saves automatically · appears in the patient&apos;s records</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <a
                  href={api.treatmentSheetPdfUrl(consultationId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
                <span className="text-xs">
                  {noteState === "saving" && <span className="text-slate-400">Saving…</span>}
                  {noteState === "saved" && <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> Saved</span>}
                  {noteState === "error" && <span className="text-rose-600">Save failed</span>}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {template.sections.map((s) => (
                <div key={s.key}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</label>
                  <textarea
                    value={record[s.key] ?? ""}
                    onChange={(e) => onSectionChange(s.key, e.target.value)}
                    placeholder={s.placeholder}
                    rows={s.key === "diagnosis" || s.key === "treatmentPlan" || s.key === "examination" ? 3 : 2}
                    className="w-full resize-y rounded-xl border border-slate-200 p-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prescriptions */}
        {tab === "rx" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
          <div className="flex min-h-0 flex-1 flex-col">
            <div ref={chatEndRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
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

        {/* AI clinical assist (doctor) */}
        {tab === "ai" && isDoctor && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            <form onSubmit={askAi} className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Clinical fact-check</label>
              <textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="e.g. First-line antibiotic for adult community-acquired pneumonia? Amoxicillin dose in a 30kg child?"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button type="submit" disabled={aiBusy} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Ask AI
              </button>
            </form>

            {aiResult && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{aiResult.answer}</p>
                </div>
                {aiResult.pharmacySuggestions.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700"><Pill className="h-3.5 w-3.5" /> In the CareBora pharmacy</div>
                    <div className="mt-2 space-y-1.5">
                      {aiResult.pharmacySuggestions.map((d) => (
                        <div key={d.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{d.name} {d.requiresPrescription && <span className="ml-1 rounded bg-violet-100 px-1 text-[10px] font-bold text-violet-700">Rx</span>}</span>
                          <span className="font-semibold text-teal-700">{kes(d.priceKes)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiResult.disclaimer && <p className="text-xs text-slate-400">{aiResult.disclaimer}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
