"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import ClinicalPdfLink from "@/components/ClinicalPdfLink";
import type { SickOffCertificate } from "@carebora/api-client";
import { issueSickOffSchema } from "@carebora/shared";
import { api } from "@/lib/api";
import { Signature } from "@/components/SignatureInput";

export default function SickOffPanel({ consultationId, canIssue }: { consultationId: string; canIssue: boolean }) {
  const [open, setOpen] = useState(false);
  const [certificates, setCertificates] = useState<SickOffCertificate[]>([]);
  const [issuing, setIssuing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [throughDate, setThroughDate] = useState("");
  const [advice, setAdvice] = useState("");
  const [signature, setSignature] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!issuing || !canIssue) return;
    let active = true;
    api.getDocumentSignature().then((saved) => {
      if (active && saved) setSignature((current) => current || saved.signatureDataUrl);
    }).catch(() => { /* The provider can still draw a signature for this certificate. */ });
    return () => { active = false; };
  }, [issuing, canIssue]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    api.listSickOffs(consultationId).then((list) => { if (active) setCertificates(list); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [open, consultationId]);

  async function issue(e: FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const result = issueSickOffSchema.safeParse({ fromDate, throughDate, advice, signatureDataUrl: signature, confirm });
      if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Check the certificate details.");
      const c = await api.issueSickOff(consultationId, result.data);
      setCertificates((prev) => [c, ...prev]); setIssuing(false); setSignature(""); setConfirm(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not issue the certificate."); }
    finally { setBusy(false); }
  }

  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)} className="w-full rounded-xl border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold text-teal-700">Sick-off certificates</summary>
      {open && <div className="mt-3 space-y-3">
        {certificates.length === 0 && <p className="text-sm text-slate-500">No sick-off certificate issued for this session.</p>}
        {certificates.map((c) => <ClinicalPdfLink key={c.id} href={api.sickOffPdfUrl(consultationId, c.id)} className="block rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 hover:underline">
          Download signed sick-off · {c.fromDate.slice(0, 10)} to {c.throughDate.slice(0, 10)} · {c.providerName}
        </ClinicalPdfLink>)}
        {canIssue && !issuing && <button onClick={() => { setIssuing(true); setError(null); }} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white">Issue signed sick-off</button>}
        {issuing && <form onSubmit={issue} className="space-y-4 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">Your name, licensing body and number will be taken from your <Link href="/profile" className="text-teal-700 underline">professional profile</Link>. An issued certificate cannot be edited.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">First day off<input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
            <label className="text-sm font-medium">Last day off (inclusive)<input type="date" required min={fromDate} value={throughDate} onChange={(e) => setThroughDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
          </div>
          <label className="block text-sm font-medium">Additional advice (optional)<textarea value={advice} onChange={(e) => setAdvice(e.target.value)} maxLength={1000} rows={3} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /><span className="text-xs font-normal text-slate-500">Included on the employer copy. Clinical notes and diagnosis are not copied automatically.</span></label>
          <Signature value={signature} onChange={setSignature} onError={setError} />
          <p className="text-sm text-slate-500">Stamp the certificate after printing. The PDF leaves space for your physical stamp.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" />I assessed this patient in this session and authorize this signed certificate.</label>
          <div className="flex gap-2"><button disabled={busy} type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Issuing…" : "Sign and issue certificate"}</button><button disabled={busy} type="button" onClick={() => setIssuing(false)} className="px-3 text-sm text-slate-600">Cancel</button></div>
        </form>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </div>}
    </details>
  );
}
