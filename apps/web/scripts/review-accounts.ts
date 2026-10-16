/**
 * Accounts for the App Store and Google Play reviewers.
 *
 * Reviewers must sign in, and every sign-in emails a one-time code, so each
 * account's address has to be a real mailbox whose password goes in the review
 * notes. Nothing in sign-in is bypassed.
 *
 *   REVIEW_PATIENT_EMAIL=... REVIEW_DOCTOR_EMAIL=... REVIEW_PASSWORD=... \
 *     npm run review:create  --workspace @carebora/web
 *   REVIEW_PATIENT_EMAIL=... REVIEW_DOCTOR_EMAIL=... \
 *     npm run review:disable --workspace @carebora/web
 *
 * `create` is repeatable. The doctor is listed in the public directory while it
 * exists (a reviewer has to be able to book them), so run `disable` once review
 * finishes or real patients could book a test doctor.
 *
 * REVIEW_PASSWORD is the Care Bora password for both accounts (not the mailbox
 * password). Choose a throwaway; it must satisfy the normal password rules.
 */
import { db } from "@carebora/db";
import { authService, availabilityService } from "@carebora/core";
import { PASSWORD_RULES } from "@carebora/shared";

const mode = process.argv[2];
const patientEmail = process.env.REVIEW_PATIENT_EMAIL?.trim().toLowerCase();
const doctorEmail = process.env.REVIEW_DOCTOR_EMAIL?.trim().toLowerCase();
const password = process.env.REVIEW_PASSWORD;

function need<T>(v: T | undefined, name: string): T {
  if (!v) { console.error(`Set ${name}.`); process.exit(1); }
  return v;
}

async function ensureUser(email: string, fullName: string, role: "patient" | "doctor") {
  const existing = await db.user.findUnique({ where: { email } });
  const id = existing
    ? existing.id
    : (await authService.register({ fullName, email, password: need(password, "REVIEW_PASSWORD"), role: "patient" } as never)).user.id;
  await db.user.update({
    where: { id },
    data: { role, isActive: true, deletedAt: null, emailVerifiedAt: new Date(), fullName },
  });
  return id;
}

async function main() {
  if (mode !== "create" && mode !== "disable") { console.error("Usage: review-accounts.ts create|disable"); process.exit(1); }
  const pe = need(patientEmail, "REVIEW_PATIENT_EMAIL");
  const de = need(doctorEmail, "REVIEW_DOCTOR_EMAIL");

  if (mode === "disable") {
    const u = await db.user.findUnique({ where: { email: de } });
    if (u) {
      await db.providerProfile.updateMany({ where: { userId: u.id }, data: { verificationStatus: "unverified", isAvailable: false } });
      await db.availability.updateMany({ where: { providerId: u.id }, data: { isActive: false } });
      await db.user.update({ where: { id: u.id }, data: { isActive: false } });
    }
    await db.user.updateMany({ where: { email: pe }, data: { isActive: false } });
    console.log("Review accounts disabled; the review doctor is no longer listed.");
    return;
  }

  const pw = need(password, "REVIEW_PASSWORD");
  const failed = PASSWORD_RULES.filter((r) => !r.test(pw));
  if (failed.length) { console.error("REVIEW_PASSWORD is too weak:", failed.map((r) => r.label).join("; ")); process.exit(1); }

  await ensureUser(pe, "App Review", "patient");
  const doctorId = await ensureUser(de, "Dr. Review Doctor", "doctor");

  await db.providerProfile.upsert({
    where: { userId: doctorId },
    create: { userId: doctorId },
    update: {},
  });
  await db.providerProfile.update({
    where: { userId: doctorId },
    data: {
      verificationStatus: "verified",
      isAvailable: true,
      specialty: "General Practice",
      bio: "Test account for app store review. Not a real clinician.",
      consultationFeeKes: 100,
      county: "Nairobi",
      town: "Nairobi",
      languages: ["English"],
    },
  });
  const cal = await availabilityService.ensureSchedule(doctorId);

  console.log(`Patient: ${pe}\nDoctor:  ${de} (fee KES 100, calendar ${cal.eligible ? `${cal.slotsOpen} open slots` : "NOT created"})`);
  console.log("Put both addresses, their MAILBOX passwords and REVIEW_PASSWORD in the store review notes.");
  console.log("Run `npm run review:disable` when review is over.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
