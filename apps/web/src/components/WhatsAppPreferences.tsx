"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { ApiError, type WhatsAppPreferences as Preferences } from "@carebora/shared";
import { api } from "@/lib/api";

export default function WhatsAppPreferences() {
  const [preference, setPreference] = useState<Preferences | null>(null);
  const [phone, setPhone] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.getWhatsAppPreferences().then((data) => {
      if (cancelled) return;
      setPreference(data); setPhone(data.phoneNumber); setEnabled(data.enabled);
    }).catch(() => { if (!cancelled) setError("Couldn't load WhatsApp settings. Refresh this page to try again."); });
    return () => { cancelled = true; };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const data = await api.setWhatsAppPreferences({ enabled, ...(phone.trim() ? { phoneNumber: phone } : {}) });
      setPreference(data); setPhone(data.phoneNumber); setEnabled(data.enabled);
      setNotice(enabled ? "WhatsApp preference saved." : "WhatsApp notifications turned off.");
    } catch (err) { setError(err instanceof ApiError ? err.message : "Couldn't save your WhatsApp settings."); }
    finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="flex items-center gap-2 font-bold text-slate-900"><MessageCircle className="h-5 w-5 text-teal-600" /> WhatsApp notifications</h2>
    <p className="mt-2 text-sm text-slate-600">Receive appointment confirmations, provider invitations, meeting join alerts and updates to your website enquiries. You can turn these off here or reply STOP on WhatsApp.</p>
    {preference && <form onSubmit={save} className="mt-4 space-y-4">
      {!preference.deliveryAvailable && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">WhatsApp delivery is being set up. You can save your preference now; alerts will begin once it is available.</p>}
      {preference.suppressed && <p className="text-sm text-amber-900">This number has opted out by sending STOP. Send START to our WhatsApp business number before enabling it here.</p>}
      <label className="block text-sm font-medium text-slate-700">Your WhatsApp number
        <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" required={enabled} maxLength={40} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-600" />
        I agree to receive CareBora service notifications on this WhatsApp number.
      </label>
      <button disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save WhatsApp settings"}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-teal-700">{notice}</p>}
    {!preference && !error && <p className="mt-4 text-sm text-slate-500">Loading settings…</p>}
  </section>;
}
