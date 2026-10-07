"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare, FileText, Send, Loader2, CheckCircle2, AlertCircle,
  Phone, Mail, Ambulance, Clock, ChevronDown,
} from "lucide-react";
import type { SupportTicket } from "@carebora/api-client";
import {
  ApiError,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_DOCUMENT_LABELS,
  SUPPORT_STATUS_LABELS,
  type SupportCategory,
  type SupportDocumentType,
} from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PhoneField } from "@/components/PhoneField";
import {
  AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY,
  SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, SUPPORT_EMAIL,
} from "@/lib/contact";

const CATEGORY_ORDER: SupportCategory[] = [
  "document_request",
  "appointment_help",
  "payment_issue",
  "general_enquiry",
  "technical_issue",
  "complaint",
];

const STATUS_STYLE: Record<string, string> = {
  open: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  awaiting_client: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short",
  });
}

export default function ContactPage() {
  const { user, loading: authLoading } = useAuth();

  const [category, setCategory] = useState<SupportCategory>("document_request");
  const [documentType, setDocumentType] = useState<SupportDocumentType>("sick_off");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SupportTicket | null>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  // Prefill from the account once it's loaded, but never clobber typing.
  // Deferred to a microtask so the setState calls land after the effect rather
  // than synchronously inside it — the same pattern as useSection.
  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      setName((n) => n || user.fullName);
      setEmail((e) => e || user.email);
      setPhone((p) => p || user.phone || "");
    });
  }, [user]);

  const loadTickets = useCallback(async () => {
    if (!user) { setTickets([]); return; }
    try {
      const res = await api.listMySupportTickets({ limit: 25 });
      setTickets(res.tickets);
    } catch {
      setTickets([]);
    }
  }, [user]);

  useEffect(() => { queueMicrotask(() => { loadTickets(); }); }, [loadTickets]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ticket = await api.createSupportTicket({
        category,
        documentType: category === "document_request" ? documentType : undefined,
        subject: subject.trim(),
        message: message.trim(),
        contactName: name.trim(),
        contactEmail: email.trim(),
        contactPhone: phone.trim() || undefined,
      });
      setSent(ticket);
      setSubject(""); setMessage("");
      await loadTickets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-2 text-sm font-semibold text-teal-600">
        <MessageSquare className="h-4 w-4" /> Contact us
      </div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        Message us directly
      </h1>
      <p className="mt-2 max-w-2xl text-slate-500">
        Ask us anything, or request a medical document — a sick-off sheet, medical report,
        fit-to-work or school form. A verified clinician reviews every document request.
      </p>

      {/* Emergency first: nobody with a real emergency should be filling in a form. */}
      <a
        href={`tel:${AMBULANCE_PHONE}`}
        className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 transition hover:bg-rose-100"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
          <Ambulance className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-rose-900">Medical emergency? Call {AMBULANCE_PHONE_DISPLAY}</div>
          <div className="text-sm text-rose-600">24/7 ambulance dispatch — don&apos;t wait for an email reply.</div>
        </div>
      </a>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* ── Form ─────────────────────────────────────────────────────── */}
        <div>
          {sent ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="mt-3 text-lg font-extrabold text-emerald-900">Message sent</h2>
              <p className="mt-1 text-sm text-emerald-700">
                We&apos;ve emailed a confirmation to <strong>{sent.contactEmail}</strong> and our team
                will reply there.
              </p>
              <p className="mt-3 inline-block rounded-lg bg-white/70 px-3 py-1 font-mono text-xs text-emerald-800">
                Reference {sent.id.slice(0, 8).toUpperCase()}
              </p>
              <button
                onClick={() => setSent(null)}
                className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
              <div>
                <span className="text-sm font-medium text-slate-700">What can we help with?</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {CATEGORY_ORDER.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition ${
                        category === c
                          ? "border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {SUPPORT_CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              {category === "document_request" && (
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    <FileText className="mr-1 inline h-3.5 w-3.5 text-teal-600" />
                    Which document?
                  </span>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as SupportDocumentType)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    {(Object.keys(SUPPORT_DOCUMENT_LABELS) as SupportDocumentType[]).map((d) => (
                      <option key={d} value={d}>{SUPPORT_DOCUMENT_LABELS[d]}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Subject</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={150}
                  placeholder={category === "document_request" ? "Sick-off for 2 days" : "Briefly, what's this about?"}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Your message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  maxLength={4000}
                  placeholder={
                    category === "document_request"
                      ? "Tell us what the document is for, the dates it needs to cover, and any employer or school requirements."
                      : "Give us as much detail as you can so we can help first time."
                  }
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <span className="mt-1 block text-right text-xs text-slate-400">{message.length}/4000</span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Your name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <PhoneField label="Phone (optional)" value={phone} onChange={setPhone} />

              {error && (
                <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </p>
              )}

              {!authLoading && !user && (
                <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                  You don&apos;t need an account to message us — we&apos;ll reply to the email above.
                  Signing in lets you follow the conversation here.
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-60"
              >
                {busy
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  : <><Send className="h-4 w-4" /> Send message</>}
              </button>
            </form>
          )}

          {/* ── The client's own threads ──────────────────────────────── */}
          {user && tickets.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900">Your messages</h2>
              <div className="mt-3 space-y-2">
                {tickets.map((t) => (
                  <TicketThread
                    key={t.id}
                    ticket={t}
                    open={openId === t.id}
                    onToggle={() => setOpenId(openId === t.id ? null : t.id)}
                    onReplied={loadTickets}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Other ways to reach us ───────────────────────────────────── */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Other ways to reach us</h2>
            <div className="mt-3 space-y-3 text-sm">
              <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-2.5 text-slate-600 hover:text-teal-700">
                <Phone className="h-4 w-4 shrink-0 text-teal-600" /> {SUPPORT_PHONE_DISPLAY}
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2.5 text-slate-600 hover:text-teal-700">
                <Mail className="h-4 w-4 shrink-0 text-teal-600" /> {SUPPORT_EMAIL}
              </a>
              <div className="flex items-start gap-2.5 text-slate-600">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  Customer care 8am–8pm daily
                  <span className="block text-xs text-slate-400">Ambulance dispatch is 24/7</span>
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">About document requests</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2"><span className="text-teal-600">•</span> A licensed clinician reviews every request — we can&apos;t issue a document without one.</li>
              <li className="flex gap-2"><span className="text-teal-600">•</span> Most need a short consultation first, which we&apos;ll arrange when we reply.</li>
              <li className="flex gap-2"><span className="text-teal-600">•</span> Signed documents arrive as a PDF in your records.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── One expandable thread with its reply box ─────────────────────────────── */
function TicketThread({
  ticket, open, onToggle, onReplied,
}: {
  ticket: SupportTicket;
  open: boolean;
  onToggle: () => void;
  onReplied: () => void;
}) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api.replySupportTicket(ticket.id, { body: reply.trim() });
      setReply("");
      onReplied();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-slate-900">{ticket.subject}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {SUPPORT_CATEGORY_LABELS[ticket.category]} · {ticket.messages.length} message
            {ticket.messages.length === 1 ? "" : "s"} · {when(ticket.lastReplyAt)}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[ticket.status] ?? "bg-slate-100 text-slate-600"}`}>
          {SUPPORT_STATUS_LABELS[ticket.status]}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4">
          <ul className="space-y-3">
            {ticket.messages.map((m) => (
              <li key={m.id} className={`flex ${m.fromStaff ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.fromStaff
                      ? "rounded-tl-sm bg-white text-slate-700 ring-1 ring-slate-200"
                      : "rounded-tr-sm bg-teal-600 text-white"
                  }`}
                >
                  <div className={`mb-0.5 text-[11px] font-semibold ${m.fromStaff ? "text-teal-700" : "text-teal-50"}`}>
                    {m.fromStaff ? "Care Bora" : "You"}
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <div className={`mt-1 text-[10px] ${m.fromStaff ? "text-slate-400" : "text-teal-100"}`}>
                    {when(m.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {ticket.status !== "closed" ? (
            <form onSubmit={send} className="mt-4 flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Write a reply…"
                className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="submit"
                disabled={busy || !reply.trim()}
                aria-label="Send reply"
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          ) : (
            <p className="mt-4 text-center text-xs text-slate-400">
              This conversation is closed. Send a new message if you need anything else.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
