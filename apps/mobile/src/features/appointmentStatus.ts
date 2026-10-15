import type { Appointment } from "@carebora/api-client";

export type StatusView = { label: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" };

/**
 * One plain-language state for an appointment, from the viewer's side. The raw
 * status ("confirmed") isn't enough on its own: a confirmed appointment is
 * "Pay now" to the patient until it's paid, and "Waiting for payment" to the
 * doctor, and the screens need to agree on which.
 */
export function describeAppointment(a: Appointment, meId: string): StatusView {
  const isProvider = a.providerId === meId;
  const paid = a.payment?.status === "completed" || a.feeKes <= 0;
  const live = a.consultation && a.consultation.status !== "ended";

  switch (a.status) {
    case "requested": return isProvider ? { label: "Needs your reply", tone: "warn" } : { label: "Awaiting doctor", tone: "warn" };
    case "confirmed":
      if (live) return { label: "In progress", tone: "ok" };
      if (!paid) return isProvider ? { label: "Awaiting payment", tone: "warn" } : { label: "Pay now", tone: "warn" };
      return { label: "Paid · ready", tone: "ok" };
    case "completed": return { label: "Completed", tone: "neutral" };
    case "cancelled": return { label: "Cancelled", tone: "danger" };
    case "no_show": return { label: "Missed", tone: "danger" };
    default: return { label: a.status, tone: "neutral" };
  }
}
