"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Send, X, RotateCcw, Loader2, ArrowUpRight } from "lucide-react";
import { ApiError, ErrorCode, ASSISTANT_GREETING, assistantHistory, navigationActions, type NavigationReply, type NavigationTurn } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const subscribe = () => () => {};
type Turn = NavigationTurn & { reply?: NavigationReply };
const welcome = (): Turn[] => [{ role: "assistant", content: ASSISTANT_GREETING.message, reply: ASSISTANT_GREETING }];
export default function NavigationAssistant() {
  const { user } = useAuth();
  return <Assistant key={`${user?.id ?? "guest"}:${user?.role ?? "guest"}`} signedIn={Boolean(user)} />;
}
function Assistant({ signedIn }: { signedIn: boolean }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(welcome);
  const pending = useRef(false), sequence = useRef(0);
  const input = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null), log = useRef<HTMLDivElement>(null);
  const hidden = pathname.startsWith("/consultations/");
  const latest = turns.at(-1)?.reply;
  useEffect(() => {
    if (open || hidden) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") setNudge(true); }, 8_000);
    return () => clearInterval(timer);
  }, [open, hidden]);
  useEffect(() => { if (open && !busy) input.current?.focus(); }, [open, busy]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [turns, busy, open]);
  if (hidden) return null;
  function close() { setOpen(false); setNudge(false); trigger.current?.focus(); }
  function reset() { sequence.current++; pending.current = false; setBusy(false); setTurns(welcome()); setQuestion(""); input.current?.focus(); }
  async function ask(value: string) {
    const message = value.trim(); if (!message || pending.current) return;
    const request = ++sequence.current; pending.current = true; setBusy(true); setQuestion("");
    setTurns(current => [...current, { role: "user" as const, content: message }].slice(-24));
    try {
      // Refresh expired credentials before a public assistant request needs private account data.
      if (signedIn) await api.me();
      const reply = await api.navigateAssistant(message, { history: assistantHistory(turns), page: pathname });
      if (sequence.current === request) setTurns(current => [...current, { role: "assistant" as const, content: reply.message, reply }].slice(-24));
    } catch (error) {
      if (sequence.current === request) {
        const expired = error instanceof ApiError && error.code === ErrorCode.UNAUTHORIZED;
        const reply: NavigationReply = { message: expired ? "Your session has ended. Sign in again to check your personal orders. You can still ask general service questions." : "I couldn't connect just now. Your question is ready to retry, or you can contact the team below.", serviceIds: expired ? ["signin", "support"] : ["support"], source: "guide", suggestions: [] };
        setTurns(current => [...current, { role: "assistant" as const, content: reply.message, reply }].slice(-24)); setQuestion(message);
      }
    } finally { if (sequence.current === request) { pending.current = false; setBusy(false); } }
  }
  return <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 sm:right-6">
    {open && <section role="dialog" aria-label="Care Bora navigation assistant" onKeyDown={e => { if (e.key === "Escape") close(); }} className="mb-3 flex max-h-[min(72dvh,38rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-xl">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-teal-100 bg-[#234f34] px-4 py-3 text-white"><div><h2 className="font-semibold">Care Bora assistant</h2><p className="mt-0.5 text-xs text-white/80">Services, orders & account help</p></div><div className="flex gap-1"><button aria-label="Start new conversation" onClick={reset} className="rounded-lg p-2 hover:bg-white/10"><RotateCcw size={17} /></button><button aria-label="Close assistant" onClick={close} className="rounded-lg p-2 hover:bg-white/10"><X size={19} /></button></div></div>
      <div ref={log} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" className="min-h-16 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {turns.map((turn, i) => <div key={i} className={turn.role === "user" ? "ml-7" : "mr-4"}><span className="sr-only">{turn.role === "user" ? "You" : "Care Bora assistant"}: </span><p className={`whitespace-pre-line rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${turn.role === "user" ? "rounded-br-sm bg-[#234f34] text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"}`}>{turn.content}</p></div>)}
        {busy && <p role="status" className="flex items-center gap-2 text-xs text-teal-800"><Loader2 size={14} className="animate-spin" />Checking Care Bora…</p>}
      </div>
      {!busy && latest && <div className="max-h-52 min-h-0 space-y-2 overflow-y-auto border-t border-slate-100 px-4 py-3">
        <div className="flex flex-wrap gap-2">{navigationActions(latest).map(action => <Link key={action.id} href={action.web} onClick={close} className={`rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-900 ${action.detail ? "w-full" : ""}`}><span className="inline-flex items-center gap-1 font-semibold">{action.title}<ArrowUpRight size={13} aria-hidden="true" /></span>{action.detail && <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-600">{action.detail}</span>}</Link>)}</div>
        <div className="flex flex-wrap gap-1.5">{latest.suggestions?.map(suggestion => <button key={suggestion} onClick={() => void ask(suggestion)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-600 hover:border-teal-500">{suggestion}</button>)}</div>
      </div>}
      <form onSubmit={e => { e.preventDefault(); void ask(question); }} className="flex shrink-0 gap-2 border-t border-slate-100 bg-white p-3"><input ref={input} aria-label="Ask for help navigating" disabled={busy} maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about Care Bora…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" /><button type="submit" disabled={busy || !question.trim()} aria-label="Send question" className="rounded-xl bg-[#234f34] px-3 text-white disabled:opacity-40"><Send size={17} /></button></form>
      <p className="shrink-0 px-4 pb-3 text-[10px] text-slate-500">Service help. Never share passwords or verification codes.</p>
    </section>}
    <button ref={trigger} style={{ borderRadius: "50%" }} disabled={!hydrated} aria-label={open ? "Close navigation assistant" : "Open navigation assistant"} aria-expanded={open} onAnimationEnd={() => setNudge(false)} onClick={() => { setOpen(!open); setNudge(false); }} className={`ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#234f34] text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${nudge ? "assistant-nudge" : ""}`}><MessageCircle size={29} fill="white" stroke="#234f34" strokeWidth={1.5} /><span aria-hidden="true" className="absolute flex gap-0.5"><i className="h-1 w-1 rounded-full bg-[#234f34]" /><i className="h-1 w-1 rounded-full bg-[#234f34]" /><i className="h-1 w-1 rounded-full bg-[#234f34]" /></span></button>
  </div>;
}
