"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { NAVIGATION_SERVICES, type NavigationReply } from "@carebora/shared";
import { api } from "@/lib/api";

const subscribe = () => () => {};

export default function NavigationAssistant() {
  const pathname = usePathname();
  return <Assistant key={pathname} />;
}
function Assistant() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<NavigationReply>({ message: "Hi! What would you like to do today? I can help you find the right service.", serviceIds: NAVIGATION_SERVICES.slice(0, 6).map(s => s.id), source: "guide" });
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const hidden = pathname.startsWith("/consultations/");
  useEffect(() => {
    if (open || hidden) return;
    const timer = setTimeout(() => { if (document.visibilityState === "visible") setNudge(true); }, 30_000);
    return () => clearTimeout(timer);
  }, [open, hidden]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  if (hidden) return null;
  function close() { setOpen(false); setNudge(false); trigger.current?.focus(); }
  async function ask(e: React.FormEvent) {
    e.preventDefault(); if (!question.trim() || busy) return;
    setBusy(true);
    try { setReply(await api.navigateAssistant(question)); setQuestion(""); }
    catch { setReply({ message: "I couldn't connect. You can still open a service below or contact support.", serviceIds: ["consultations", "pharmacy", "home", "ambulance", "labs", "support"], source: "guide" }); }
    finally { setBusy(false); }
  }
  return <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 sm:right-6">
    {open && <section role="dialog" aria-label="Care Bora navigation assistant" onKeyDown={e => { if (e.key === "Escape") close(); }} className="mb-3 max-h-[65dvh] overflow-y-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-teal-100 bg-white p-5 shadow-xl">
      <div className="flex items-center justify-between"><h2 className="font-semibold text-teal-900">Care Bora assistant</h2><button aria-label="Close assistant" onClick={close} className="rounded-lg p-2"><X size={18} /></button></div>
      <p className="mt-1 text-xs text-slate-500">Navigation help · Please keep medical details private.</p>
      <div aria-live="polite" className="mt-4"><p className="text-sm leading-relaxed text-slate-700">{busy ? "Finding your next step…" : reply.message}</p></div>
      <div className="my-4 flex flex-wrap gap-2">{NAVIGATION_SERVICES.filter(s => reply.serviceIds.includes(s.id)).map(s => <Link key={s.id} href={s.web} onClick={close} className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">{s.title} ↗</Link>)}</div>
      <form onSubmit={ask} className="flex gap-2"><input ref={input} aria-label="Ask for help navigating" maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder="How do I book a doctor?" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="submit" disabled={busy || !question.trim()} aria-label="Send question" className="rounded-lg bg-teal-800 p-3 text-white disabled:opacity-50"><Send size={16} /></button></form>
    </section>}
    <button ref={trigger} style={{ borderRadius: "50%" }} disabled={!hydrated} aria-label={open ? "Close navigation assistant" : "Open navigation assistant"} aria-expanded={open} onAnimationEnd={() => setNudge(false)} onClick={() => { setOpen(!open); setNudge(false); }} className={`ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#087cff] text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${nudge ? "assistant-nudge" : ""}`}><MessageCircle size={29} fill="white" stroke="#087cff" strokeWidth={1.5} /><span aria-hidden="true" className="absolute flex gap-0.5"><i className="h-1 w-1 rounded-full bg-[#087cff]" /><i className="h-1 w-1 rounded-full bg-[#087cff]" /><i className="h-1 w-1 rounded-full bg-[#087cff]" /></span></button>
  </div>;
}
