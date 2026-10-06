import { Resend } from "resend";

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
  if (!client) return;
  try {
    await client.emails.send({
      from: "CareBora <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
  } catch {
    console.error("[notify] email failed", { to, subject });
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

export const notificationService = {
  async emailVerificationCode(opts: { email: string; fullName: string; code: string }) {
    await sendEmail(opts.email, "Verify your email — CareBora", `
      <h2>Welcome to CareBora, ${opts.fullName}!</h2>
      <p>Thanks for signing up. Enter this code in the app to verify your email address:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0d9488">${opts.code}</p>
      <p>This code expires in 15 minutes. If you didn't create a CareBora account, you can ignore this email.</p>
      <p>— The CareBora Team</p>
    `);
  },

  async accountInvite(opts: { email: string; fullName: string; token: string }) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = `${base}/set-password?token=${opts.token}`;
    await sendEmail(opts.email, "You're invited to CareBora", `
      <h2>Hi ${opts.fullName},</h2>
      <p>An admin has created a CareBora account for you. Set your password to activate it:</p>
      <p><a href="${url}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Set your password</a></p>
      <p>This link expires in 7 days.</p>
      <p>— The CareBora Team</p>
    `);
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
    const slot = opts.slotTime.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "full", timeStyle: "short" });
    await sendEmail(opts.patientEmail, "Appointment Booked — CareBora", `
      <h2>Hi ${opts.patientName},</h2>
      <p>Your appointment with <strong>${opts.providerName}</strong>${opts.specialty ? ` (${opts.specialty})` : ""} has been requested.</p>
      <p><strong>Slot:</strong> ${slot}</p>
      <p><strong>Fee:</strong> KES ${opts.feeKes.toLocaleString()}</p>
      <p>You'll receive another notification once the provider confirms.</p>
      <p>— The CareBora Team</p>
    `);
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
    const slot = opts.slotTime.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "full", timeStyle: "short" });
    await sendEmail(opts.patientEmail, "Appointment Confirmed ✓ — CareBora", `
      <h2>Hi ${opts.patientName},</h2>
      <p>Your appointment with <strong>${opts.providerName}</strong> is <strong>confirmed</strong>.</p>
      <p><strong>Slot:</strong> ${slot}</p>
      <p><strong>Fee:</strong> KES ${opts.feeKes.toLocaleString()}</p>
      <p>Please pay via M-Pesa on the CareBora app to complete your booking.</p>
      <p>— The CareBora Team</p>
    `);
    void sendSms(opts.patientPhone, `CareBora: Appointment CONFIRMED with ${opts.providerName} on ${slot}. Please pay KES ${opts.feeKes} on the app.`);
  },

  async consultationStarted(opts: {
    patientEmail: string;
    patientPhone?: string | null;
    patientName: string;
    providerName: string;
    joinUrl: string;
  }) {
    await sendEmail(opts.patientEmail, "Your doctor is ready — join now — CareBora", `
      <h2>Hi ${opts.patientName},</h2>
      <p><strong>${opts.providerName}</strong> has started your video consultation and is waiting for you.</p>
      <p><a href="${opts.joinUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Join the consultation</a></p>
      <p>Or open the CareBora app and tap “Join consultation” on your appointment.</p>
      <p>— The CareBora Team</p>
    `);
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
    await sendEmail(opts.patientEmail, "Payment Received — CareBora", `
      <h2>Hi ${opts.patientName},</h2>
      <p>We've received your M-Pesa payment of <strong>KES ${opts.amountKes.toLocaleString()}</strong> for your ${opts.context} with ${opts.providerName}.</p>
      ${opts.receiptNumber ? `<p><strong>M-Pesa Receipt:</strong> ${opts.receiptNumber}</p>` : ""}
      <p>Thank you for choosing CareBora!</p>
      <p>— The CareBora Team</p>
    `);
    void sendSms(opts.patientPhone, `CareBora: Payment of KES ${opts.amountKes} received${opts.receiptNumber ? ` (${opts.receiptNumber})` : ""}. Thank you!`);
  },

  async prescriptionIssued(opts: {
    patientEmail: string;
    patientName: string;
    providerName: string;
    medicationCount: number;
  }) {
    await sendEmail(opts.patientEmail, "Prescription Issued — CareBora", `
      <h2>Hi ${opts.patientName},</h2>
      <p>Dr. ${opts.providerName} has issued you a prescription with <strong>${opts.medicationCount} medication(s)</strong>.</p>
      <p>You can view and download your prescription on the CareBora app. You can also use it to order medications from our pharmacy.</p>
      <p>— The CareBora Team</p>
    `);
  },

  async homeVisitAssigned(opts: {
    patientEmail: string;
    patientPhone?: string | null;
    patientName: string;
    providerName: string;
    scheduledAt: Date | null;
    feeKes: number;
  }) {
    const slot = opts.scheduledAt
      ? opts.scheduledAt.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "full", timeStyle: "short" })
      : "To be confirmed";
    await sendEmail(opts.patientEmail, "Home Visit Assigned — CareBora", `
      <h2>Hi ${opts.patientName},</h2>
      <p>A healthcare provider has been assigned to your home visit request.</p>
      <p><strong>Provider:</strong> ${opts.providerName}</p>
      <p><strong>Scheduled:</strong> ${slot}</p>
      <p><strong>Fee:</strong> KES ${opts.feeKes.toLocaleString()}</p>
      <p>Please pay via M-Pesa on the CareBora app to confirm your visit.</p>
      <p>— The CareBora Team</p>
    `);
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
    await sendEmail(opts.providerEmail, "New Review — CareBora", `
      <h2>Hi ${opts.providerName},</h2>
      <p>${opts.patientName} left you a <strong>${stars} (${opts.rating}/5)</strong> review.</p>
      ${opts.comment ? `<blockquote>"${opts.comment}"</blockquote>` : ""}
      <p>— The CareBora Team</p>
    `);
  },
};
