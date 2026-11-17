"use client";

import { useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import type { Appointment } from "@carebora/api-client";
import { api } from "@/lib/api";

export default function ScheduleMeetingModal({ clientEmail = "", clients, onClose, onDone }: {
  clientEmail?: string;
  clients: { email: string; fullName: string }[];
  onClose: () => void;
  onDone: (appointment: Appointment, meetNow: boolean) => void;
}) {
  const [email, setEmail] = useState(clientEmail);
  const [meetNow, setMeetNow] = useState(true);
  const [dateTime, setDateTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const appointment = await api.scheduleProviderMeeting({
        clientEmail: email,
        durationMinutes: duration,
        ...(meetNow ? {} : { startsAt: new Date(`${dateTime}:00+03:00`).toISOString() }),
      });
      onDone(appointment, meetNow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule the meeting.");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="schedule-meeting-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 id="schedule-meeting-title" className="text-lg font-bold text-slate-900">Schedule a meeting</h2>
          <button onClick={onClose} disabled={busy} aria-label="Close meeting form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-60"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-2 text-sm text-slate-500">Invite any registered client. Your client won&apos;t need to pay for this meeting.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Client email
            <input type="email" required autoFocus autoComplete="off" list="meeting-clients" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            <datalist id="meeting-clients">{clients.map((c) => <option key={c.email} value={c.email}>{c.fullName}</option>)}</datalist>
            <span className="mt-1 block text-xs font-normal text-slate-500">Use the email they registered with, or choose a recent client.</span>
          </label>
          <fieldset className="flex gap-4 text-sm text-slate-700">
            <legend className="mb-2 font-medium">When</legend>
            <label className="flex items-center gap-2"><input type="radio" name="meeting-time" checked={meetNow} onChange={() => setMeetNow(true)} />Meet now</label>
            <label className="flex items-center gap-2"><input type="radio" name="meeting-time" checked={!meetNow} onChange={() => setMeetNow(false)} />Schedule for later</label>
          </fieldset>
          {!meetNow && (
            <label className="block text-sm font-medium text-slate-700">
              Date and time (East Africa Time)
              <input type="datetime-local" required value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Duration (minutes)
            <input type="number" required min={5} max={240} step={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Free for the client · Automatically confirmed</div>
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{meetNow ? "Invite and start meeting" : "Schedule meeting"}
          </button>
        </form>
      </div>
    </div>
  );
}
