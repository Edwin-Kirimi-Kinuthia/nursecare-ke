"use client";
import { useState } from "react";
import { api } from "@/lib/api";
export default function RequestClientReview({ serviceType, subjectId }: { serviceType: "appointment" | "home_visit"; subjectId: string }) {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState("");
  async function send() { setBusy(true); setError(""); try { const r = await api.requestProviderReview(serviceType, subjectId); setNotice(r.status === "already_reviewed" ? "Client has already left a review" : "Review email sent"); } catch(e) { setError(e instanceof Error ? e.message : "Could not send review email"); } finally { setBusy(false); } }
  return <div><button className="button-secondary text-sm" disabled={busy || !!notice} onClick={send}>{busy ? "Sending…" : notice || "Request client review"}</button>{error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}</div>;
}
