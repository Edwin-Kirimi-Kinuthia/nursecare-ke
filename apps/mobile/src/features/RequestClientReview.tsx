import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/ui/Button";
import { Banner } from "@/ui/parts";
export function RequestClientReview({ serviceType, subjectId }: { serviceType: "appointment" | "home_visit"; subjectId: string }) {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState("");
  async function send() { setBusy(true); setError(""); try { const r = await api.requestProviderReview(serviceType,subjectId); setNotice(r.status === "already_reviewed" ? "Client has already left a review" : "Review email sent"); } catch(e) { setError(e instanceof Error ? e.message : "Could not send review email"); } finally { setBusy(false); } }
  return <>{error && <Banner tone="danger">{error}</Banner>}<Button title={notice || "Request client review"} variant="secondary" loading={busy} disabled={!!notice} onPress={send} /></>;
}
