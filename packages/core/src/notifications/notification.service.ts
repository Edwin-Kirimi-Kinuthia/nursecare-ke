import { Resend } from "resend";
import { greetingName } from "@carebora/shared";
import { renderEmail, p, otp, panel, rows } from "./email-layout";

// Instantiate lazily so a missing RESEND_API_KEY never crashes module import
// (e.g. during `next build` page-data collection when the key isn't present).
let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

async function sendEmail(to: string, subject: string, html: string) {
  const client = getResend();
  if (!client) {
    console.error("[notify] RESEND_API_KEY not set — email not sent", { to, subject });
    return;
  }
  try {
    // The Resend SDK resolves (doesn't throw) on an API-level rejection — it
    // returns { error } instead, e.g. the sandbox sender being restricted to
    // the account owner's own inbox until a domain is verified. Missing that
    // check means every such rejection fails completely silently.
    const { error } = await client.emails.send({
      from: "CareBora <noreply@app.carebora.co.ke>",
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[notify] email rejected by Resend", { to, subject, error });
    }
  } catch (err) {
    console.error("[notify] email failed", { to, subject, err: err instanceof Error ? err.message : err });
  }
}

async function sendSms(to: string | null | undefined, message: string) {
  if (!process.env.AT_API_KEY || !to) return;
  try {
    const phone = to.startsWith("0") ? "+254" + to.slice(1) : to.startsWith("+") ? to : `+${to}`;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AfricasTalking = require("africastalking");
    const at = AfricasTalking({ apiKey: process.env.AT_API_KEY!, username: process.env.AT_USERNAME ?? "sandbox" });
    await at.SMS.send({ to: [phone], message, from: process.env.AT_SENDER_ID });
  } catch {
    console.error("[notify] SMS failed", { to, message: message.slice(0, 40) });
  }
}

function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.carebora.co.ke").replace(/\/$/, "");
}

/**
 * Escape anything user-supplied before it goes into email HTML.
 *
 * Names, specialties and review comments are all typed by people. The previous
 * templates interpolated them raw — a review comment containing markup was
 * injected straight into the provider's inbox.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * "Edwin Kirimi Kinuthia" -> "Edwin"; "Dr. Mercy Chebet Limo" -> "Dr. Mercy".
 * A greeting reads better with one name, and a doctor is greeted as one — the
 * naive first word would give "Hi Dr.,".
 */
function firstName(fullName: string): string {
  return esc(greetingName(fullName));
}

function nairobi(date: Date): string {
  return date.toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "full",
    timeStyle: "short",
  });
}

function money(kes: number): string {
  return `KES ${kes.toLocaleString("en-KE")}`;
}

export const notificationService = {
  async emailVerificationCode(opts: { email: string; fullName: string; code: string }) {
    await sendEmail(opts.email, "Verify your email — CareBora", renderEmail({
      preheader: `Your verification code is ${opts.code}`,
      heading: `Welcome to Care Bora, ${firstName(opts.fullName)}`,
      body:
        p("Thanks for signing up. Enter this code in the app to verify your email address:")
        + otp(opts.code)
        + p("The code expires in 15 minutes."),
      footnote: "If you didn't create a Care Bora account, you can safely ignore this email.",
    }));
  },

  async loginOtpCode(opts: { email: string; fullName: string; code: string }) {
    await sendEmail(opts.email, "Your CareBora login code", renderEmail({
      preheader: `Your login code is ${opts.code}`,
      heading: "Finish signing in",
      body:
        p(`Hi ${firstName(opts.fullName)}, enter this code to complete your sign-in:`)
        + otp(opts.code)
        + p("The code expires in 10 minutes."),
      footnote:
        "If this wasn't you, someone may know your password — change it as soon as you can.",
    }));
  },

  async changePasswordOtp(opts: { email: string; fullName: string; code: string }) {
    await sendEmail(opts.email, "Confirm your CareBora password change", renderEmail({
      preheader: `Your confirmation code is ${opts.code}`,
      heading: "Confirm your password change",
      body:
        p(`Hi ${firstName(opts.fullName)}, enter this code in the app to confirm your new password:`)
        + otp(opts.code)
        + p("The code expires in 10 minutes."),
      footnote:
        "Didn't request this? Ignore this email — your password won't change without the code.",
    }));
  },

  async accountInvite(opts: { email: string; fullName: string; token: string }) {
    await sendEmail(opts.email, "You're invited to CareBora", renderEmail({
      preheader: "Set your password to activate your Care Bora account.",
      heading: `Your Care Bora account is ready, ${firstName(opts.fullName)}`,
      body: p("An administrator has created an account for you. Set a password to activate it and sign in."),
      button: { label: "Set your password", url: `${appBase()}/set-password?token=${opts.token}` },
      footnote: "This link expires in 7 days. If the button doesn't work, copy it into your browser.",
    }));
  },

  async passwordResetRequested(opts: { email: string; fullName: string; token: string }) {
    await sendEmail(opts.email, "Reset your CareBora password", renderEmail({
      preheader: "Choose a new Care Bora password.",
      heading: "Reset your password",
      body: p(`Hi ${firstName(opts.fullName)}, we received a request to reset your password. Choose a new one below.`),
      button: { label: "Reset password", url: `${appBase()}/set-password?token=${opts.token}` },
      footnote:
        "This link expires in 7 days. If you didn't request a reset, ignore this email — your password won't change.",
    }));
  },

  async appointmentBooked(opts: {
    patientEmail: string;
    patientPhone?: string | null;
    patientName: string;
    providerName: string;
    specialty: string | null;
    slotTime: Date;
    feeKes: number;
  }) {
    const slot = nairobi(opts.slotTime);
    await sendEmail(opts.patientEmail, "Appointment requested — CareBora", renderEmail({
      preheader: `${opts.providerName} · ${slot}`,
      heading: "Appointment requested",
      body:
        p(`Hi ${firstName(opts.patientName)}, your appointment request has been sent.`)
        + rows([
          ["Provider", esc(opts.providerName) + (opts.specialty ? ` <span style="font-weight:400;color:#64748b">(${esc(opts.specialty)})</span>` : "")],
          ["When", slot],
          ["Fee", money(opts.feeKes)],
        ])
        + p("We'll email you again as soon as the provider confirms."),
    }));
    void sendSms(opts.patientPhone, `CareBora: Appointment with ${opts.providerName} requested for ${slot}. Awaiting confirmation.`);
  },

  async appointmentConfirmed(opts: {
    patientEmail: string;
    patientPhone?: string | null;
    patientName: string;
    providerName: string;
    slotTime: Date;
    feeKes: number;
  }) {
    const slot = nairobi(opts.slotTime);
    await sendEmail(opts.patientEmail, "Appointment confirmed — CareBora", renderEmail({
      preheader: `Confirmed: ${opts.providerName} · ${slot}`,
      heading: "Your appointment is confirmed",
      body:
        p(`Hi ${firstName(opts.patientName)}, ${esc(opts.providerName)} has confirmed your appointment.`)
        + rows([["Provider", esc(opts.providerName)], ["When", slot], ["Fee", money(opts.feeKes)]])
        + panel("Pay with M-Pesa in the app to complete your booking. You'll get an M-Pesa prompt on your phone."),
      button: { label: "Pay for your appointment", url: `${appBase()}/appointments` },
    }));
    void sendSms(opts.patientPhone, `CareBora: Appointment CONFIRMED with ${opts.providerName} on ${slot}. Please pay KES ${opts.feeKes} on the app.`);
  },

  async consultationStarted(opts: {
    patientEmail: string;
    patientPhone?: string | null;
    patientName: string;
    providerName: string;
    joinUrl: string;
  }) {
    await sendEmail(opts.patientEmail, "Your provider is ready — join now", renderEmail({
      preheader: `${opts.providerName} is waiting for you.`,
      heading: "Your provider is ready",
      body: p(`Hi ${firstName(opts.patientName)}, <strong>${esc(opts.providerName)}</strong> has started your video consultation and is waiting for you.`),
      button: { label: "Join the consultation", url: opts.joinUrl },
      footnote: "You can also open the Care Bora app and tap “Join consultation” on your appointment.",
    }));
    void sendSms(opts.patientPhone, `CareBora: ${opts.providerName} has started your consultation — join now: ${opts.joinUrl}`);
  },

  async paymentReceived(opts: {
    patientEmail: string;
    patientPhone?: string | null;
    patientName: string;
    providerName: string;
    amountKes: number;
    receiptNumber: string | null;
    context: string;
  }) {
    await sendEmail(opts.patientEmail, "Payment received — CareBora", renderEmail({
      preheader: `${money(opts.amountKes)} received. Thank you.`,
      heading: "Payment received",
      body:
        p(`Hi ${firstName(opts.patientName)}, thank you — your M-Pesa payment has gone through.`)
        + rows([
          ["Amount", money(opts.amountKes)],
          ["For", `${esc(opts.context)} with ${esc(opts.providerName)}`],
          ...(opts.receiptNumber
            ? ([["M-Pesa receipt", `<span style="font-family:monospace">${esc(opts.receiptNumber)}</span>`]] as [string, string][])
            : []),
        ]),
      footnote: "Keep this email as your receipt.",
    }));
    void sendSms(opts.patientPhone, `CareBora: Payment of KES ${opts.amountKes} received${opts.receiptNumber ? ` (${opts.receiptNumber})` : ""}. Thank you!`);
  },

  async prescriptionIssued(opts: {
    patientEmail: string;
    patientName: string;
    providerName: string;
    medicationCount: number;
  }) {
    const n = opts.medicationCount;
    await sendEmail(opts.patientEmail, "Prescription issued — CareBora", renderEmail({
      preheader: `${n} medication${n === 1 ? "" : "s"} prescribed.`,
      heading: "Your prescription is ready",
      body:
        p(`Hi ${firstName(opts.patientName)}, ${esc(opts.providerName)} has issued you a prescription with <strong>${n} medication${n === 1 ? "" : "s"}</strong>.`)
        + p("View and download it in the app, or use it to order from a licensed pharmacy with delivery to your door."),
      button: { label: "View prescription", url: `${appBase()}/records` },
    }));
  },

  async homeVisitAssigned(opts: {
    patientEmail: string;
    patientPhone?: string | null;
    patientName: string;
    providerName: string;
    scheduledAt: Date | null;
    feeKes: number;
  }) {
    const slot = opts.scheduledAt ? nairobi(opts.scheduledAt) : "To be confirmed";
    await sendEmail(opts.patientEmail, "Home visit assigned — CareBora", renderEmail({
      preheader: `${opts.providerName} · ${slot}`,
      heading: "A provider is on the way",
      body:
        p(`Hi ${firstName(opts.patientName)}, a provider has been assigned to your home visit request.`)
        + rows([["Provider", esc(opts.providerName)], ["Scheduled", slot], ["Fee", money(opts.feeKes)]])
        + panel("Pay with M-Pesa in the app to confirm your visit."),
      button: { label: "Pay for your visit", url: `${appBase()}/home-visits` },
    }));
    void sendSms(opts.patientPhone, `CareBora: Home visit assigned to ${opts.providerName} on ${slot}. Pay KES ${opts.feeKes} on the app.`);
  },

  async reviewReceived(opts: {
    providerEmail: string;
    providerName: string;
    patientName: string;
    rating: number;
    comment?: string | null;
  }) {
    const stars = "★".repeat(opts.rating) + "☆".repeat(5 - opts.rating);
    await sendEmail(opts.providerEmail, "You have a new review — CareBora", renderEmail({
      preheader: `${opts.patientName} rated you ${opts.rating}/5.`,
      heading: "You have a new review",
      body:
        p(`Hi ${firstName(opts.providerName)}, ${esc(opts.patientName)} reviewed a recent appointment.`)
        + `<div style="margin:18px 0 6px;font-size:26px;letter-spacing:3px;color:#f59e0b">${stars}</div>`
        + p(`<strong>${opts.rating} out of 5</strong>`)
        + (opts.comment ? panel(`“${esc(opts.comment)}”`) : ""),
      button: { label: "See your profile", url: `${appBase()}/providers` },
    }));
  },
  /** Sent to the old address after a self-service deletion — the owner's alarm if it wasn't them. */
  async accountDeleted(opts: { email: string; fullName: string }) {
    await sendEmail(opts.email, "Your Care Bora account was deleted", renderEmail({
      preheader: "Your account and personal details have been removed.",
      heading: "Your account has been deleted",
      body:
        p(`Hi ${firstName(opts.fullName)}, your Care Bora account has been deleted and you have been signed out everywhere.`)
        + p("We removed your profile, contact details and the health information you recorded yourself. Clinical notes, prescriptions and payment records are kept without your name for as long as the law requires, and are then deleted.")
        + panel("If you didn't do this, contact us straight away on the number below. We may be able to help if you tell us within a few days."),
      footnote: "You can create a new account with this address at any time.",
    }));
  },

  // ── Support: client messages and document requests ────────────────────────

  /** Acknowledge a new ticket to the client, so they know it landed. */
  async supportTicketReceived(opts: {
    email: string; name: string; subject: string; what: string; reference: string;
  }) {
    await sendEmail(opts.email, "We've got your message — CareBora", renderEmail({
      preheader: "Our team will get back to you shortly.",
      heading: "We've got your message",
      body:
        p(`Hi ${firstName(opts.name)}, thanks for writing to Care Bora. Our team has your message and will reply by email.`)
        + rows([
          ["Subject", esc(opts.subject)],
          ["About", esc(opts.what)],
          ["Reference", `<span style="font-family:monospace;font-size:13px">${opts.reference.slice(0, 8).toUpperCase()}</span>`],
        ])
        + p("You can follow the conversation and reply in the app at any time."),
      button: { label: "View your messages", url: `${appBase()}/contact` },
      footnote: "For a medical emergency, call our 24/7 ambulance line on +254 717 231 721 — don't wait for an email reply.",
    }));
  },

  /** Tell the team a ticket needs attention. */
  async supportTicketForStaff(opts: {
    subject: string; what: string; message: string;
    contactName: string; contactEmail: string; contactPhone: string | null;
    ticketId: string; isRegistered: boolean;
  }) {
    const to = process.env.SUPPORT_INBOX_EMAIL ?? "customercare@carebora.co.ke";
    await sendEmail(to, `[Support] ${opts.subject}`, renderEmail({
      preheader: `${opts.what} — from ${opts.contactName}`,
      heading: "New client message",
      body:
        rows([
          ["About", esc(opts.what)],
          ["From", `${esc(opts.contactName)}${opts.isRegistered ? "" : ' <span style="font-weight:400;color:#64748b">(no account)</span>'}`],
          ["Email", esc(opts.contactEmail)],
          ...(opts.contactPhone ? ([["Phone", esc(opts.contactPhone)]] as [string, string][]) : []),
          ["Reference", `<span style="font-family:monospace;font-size:13px">${opts.ticketId.slice(0, 8).toUpperCase()}</span>`],
        ])
        + panel(esc(opts.message).replace(/\n/g, "<br>")),
      button: { label: "Open in the admin inbox", url: `${appBase()}/admin` },
    }));
  },

  /** A staff reply, delivered to the client's inbox as well as the app. */
  async supportTicketReplied(opts: {
    email: string; name: string; subject: string; body: string; ticketId: string;
  }) {
    await sendEmail(opts.email, `Re: ${opts.subject} — CareBora`, renderEmail({
      preheader: opts.body.slice(0, 120),
      heading: "Care Bora replied to your message",
      body:
        p(`Hi ${firstName(opts.name)}, our team has replied about <strong>${esc(opts.subject)}</strong>:`)
        + panel(esc(opts.body).replace(/\n/g, "<br>"))
        + p("Reply in the app and we'll pick it up from there."),
      button: { label: "Reply in the app", url: `${appBase()}/contact` },
    }));
  },

  async supportTicketResolved(opts: { email: string; name: string; subject: string; ticketId: string }) {
    await sendEmail(opts.email, `Resolved: ${opts.subject} — CareBora`, renderEmail({
      preheader: "We've marked your request as resolved.",
      heading: "Your request is resolved",
      body:
        p(`Hi ${firstName(opts.name)}, we've marked <strong>${esc(opts.subject)}</strong> as resolved.`)
        + p("If there's anything still outstanding, reply on the thread and it reopens automatically."),
      button: { label: "View the conversation", url: `${appBase()}/contact` },
    }));
  },
};
