"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Signature } from "./SignatureInput";

export default function DocumentSignatureSettings() {
  const [signature, setSignature] = useState("");
  const [authorize, setAuthorize] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api.getDocumentSignature().then((value) => { if (active) setSignature(value?.signatureDataUrl ?? ""); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);
  async function save() {
    setError(null); setSaved(false);
    if (!signature || !authorize) { setError("Add your signature and authorize its use on your clinical documents."); return; }
    setBusy(true);
    try { await api.saveDocumentSignature({ signatureDataUrl: signature, authorize: true }); setSaved(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save your signature."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 space-y-4 border-t border-slate-200 pt-5">
    <h3 className="font-bold text-slate-900">My document signature</h3>
    <p className="text-sm text-slate-500">Save your signature once for prescriptions and treatment sheets. Your licensing body and number above must also be saved. Issued sick-off certificates keep their original signature.</p>
    <Signature value={signature} onChange={(value) => { setSignature(value); setSaved(false); }} onError={setError} />
    {signature && <div>
      <p className="text-xs font-medium text-slate-500">Signature to be used</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={signature} alt="Your document signature preview" className="mt-2 max-h-24 max-w-full rounded-lg border border-slate-200 bg-white p-2" />
    </div>}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={authorize} onChange={(e) => setAuthorize(e.target.checked)} className="mt-1" />I authorize this signature on my prescriptions and clinical records.</label>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {saved && <p role="status" className="text-sm font-semibold text-emerald-700">Document signature saved.</p>}
    <button type="button" onClick={save} disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save document signature"}</button>
  </section>;
}
