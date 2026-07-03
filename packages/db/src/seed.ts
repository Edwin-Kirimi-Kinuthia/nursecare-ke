/**
 * CareBora demo seed — creates a realistic dataset for investor demos and local dev.
 * Run: npm run db:seed  (from packages/db)  or  npx prisma db seed
 *
 * Accounts (all password: Demo1234!):
 *   admin@carebora.ke         — admin
 *   dr.amina@carebora.ke      — doctor (GP, Nairobi, verified)
 *   dr.james@carebora.ke      — doctor (Paediatrics, Mombasa, verified)
 *   dr.faith@carebora.ke      — doctor (OB-GYN, Nairobi, verified)
 *   nurse.peter@carebora.ke   — nurse (Nairobi, verified)
 *   nurse.grace@carebora.ke   — nurse (Kisumu, in_review)
 *   alice@example.com         — patient
 *   bob@example.com           — patient
 *   carol@example.com         — patient
 */

import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { db } from "./index";

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const DEMO_HASH = hashPassword("Demo1234!");

function mins(h: number, m = 0) {
  return h * 60 + m;
}

async function upsertUser(data: {
  email: string;
  fullName: string;
  role: "patient" | "doctor" | "nurse" | "physio" | "pharmacy" | "admin";
  phone?: string;
  avatarUrl?: string;
}) {
  return db.user.upsert({
    where: { email: data.email },
    update: { avatarUrl: data.avatarUrl ?? null },
    create: {
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      phone: data.phone ?? null,
      avatarUrl: data.avatarUrl ?? null,
      emailVerifiedAt: new Date(),
      credentials: { create: { passwordHash: DEMO_HASH } },
    },
  });
}

async function main() {
  console.log("🌱  Seeding CareBora demo data…");

  // ── Users ─────────────────────────────────────────────────────────────────
  await upsertUser({ email: "admin@carebora.ke",     fullName: "Admin CareBora",       role: "admin",  phone: "+254700000000" });
  const drAmina   = await upsertUser({ email: "dr.amina@carebora.ke",    fullName: "Dr. Amina Wanjiku",   role: "doctor", phone: "+254711000001", avatarUrl: "/avatars/amina.png" });
  const drJames   = await upsertUser({ email: "dr.james@carebora.ke",    fullName: "Dr. James Otieno",    role: "doctor", phone: "+254711000002", avatarUrl: "/avatars/james.png" });
  const drFaith   = await upsertUser({ email: "dr.faith@carebora.ke",    fullName: "Dr. Faith Muthoni",   role: "doctor", phone: "+254711000003", avatarUrl: "/avatars/faith.png" });
  const nursePeter = await upsertUser({ email: "nurse.peter@carebora.ke", fullName: "Peter Kamau RN",      role: "nurse",  phone: "+254722000001", avatarUrl: "/avatars/peter.png" });
  const nurseGrace = await upsertUser({ email: "nurse.grace@carebora.ke", fullName: "Grace Achieng RN",    role: "nurse",  phone: "+254722000002", avatarUrl: "/avatars/grace.png" });
  const physioDaniel = await upsertUser({ email: "physio.daniel@carebora.ke", fullName: "Daniel Kiptoo",  role: "physio", phone: "+254722000003", avatarUrl: "/avatars/daniel.png" });
  const alice     = await upsertUser({ email: "alice@example.com",  fullName: "Alice Njeri",   role: "patient", phone: "+254733000001" });
  const bob       = await upsertUser({ email: "bob@example.com",    fullName: "Bob Mwangi",    role: "patient", phone: "+254733000002" });
  const carol     = await upsertUser({ email: "carol@example.com", fullName: "Carol Wairimu", role: "patient", phone: "+254733000003" });

  // ── Provider profiles ─────────────────────────────────────────────────────
  const doctors = [
    {
      userId: drAmina.id,
      specialty: "General Practice",
      bio: "10 years of primary care in Nairobi. Fluent in English and Swahili.",
      licenceNumber: "MD-2015-001",
      licenceBody: "Kenya Medical Practitioners & Dentists Council",
      yearsExperience: 10,
      languages: ["English", "Swahili"],
      qualifications: ["MBChB – University of Nairobi", "Diploma in Family Medicine"],
      services: ["Teleconsultation", "Home Visit", "Prescription"],
      consultationFeeKes: 1500,
      homeVisitFeeKes: 3500,
      county: "Nairobi",
      town: "Westlands",
      verificationStatus: "verified" as const,
      isAvailable: true,
    },
    {
      userId: drJames.id,
      specialty: "Paediatrics",
      bio: "Paediatrician serving families in Mombasa and the coast.",
      licenceNumber: "MD-2018-045",
      licenceBody: "Kenya Medical Practitioners & Dentists Council",
      yearsExperience: 7,
      languages: ["English", "Swahili"],
      qualifications: ["MBChB – Moi University", "MMed Paediatrics"],
      services: ["Teleconsultation", "Child Wellness"],
      consultationFeeKes: 2000,
      homeVisitFeeKes: 4500,
      county: "Mombasa",
      town: "Nyali",
      verificationStatus: "verified" as const,
      isAvailable: true,
    },
    {
      userId: drFaith.id,
      specialty: "Obstetrics & Gynaecology",
      bio: "OB-GYN focused on maternal health and family planning.",
      licenceNumber: "MD-2016-022",
      licenceBody: "Kenya Medical Practitioners & Dentists Council",
      yearsExperience: 8,
      languages: ["English", "Swahili", "Kikuyu"],
      qualifications: ["MBChB – University of Nairobi", "MMed Obstetrics & Gynaecology"],
      services: ["Teleconsultation", "Antenatal Care", "Family Planning"],
      consultationFeeKes: 2500,
      homeVisitFeeKes: 5000,
      county: "Nairobi",
      town: "Karen",
      verificationStatus: "verified" as const,
      isAvailable: true,
    },
  ];

  for (const p of doctors) {
    await db.providerProfile.upsert({ where: { userId: p.userId }, update: {}, create: p });
  }

  const nurses = [
    {
      userId: nursePeter.id,
      specialty: "General Nursing",
      bio: "Registered nurse with home care and wound management expertise.",
      licenceNumber: "RN-2019-101",
      licenceBody: "Nursing Council of Kenya",
      yearsExperience: 5,
      languages: ["English", "Swahili"],
      qualifications: ["BSN – JKUAT"],
      services: ["Home Visit", "Wound Care", "IV Administration", "Vitals Monitoring"],
      homeVisitFeeKes: 2000,
      county: "Nairobi",
      town: "Eastleigh",
      verificationStatus: "verified" as const,
      isAvailable: true,
    },
    {
      userId: nurseGrace.id,
      specialty: "Community Health Nursing",
      bio: "Community health nurse specialising in maternal and child health.",
      licenceNumber: "RN-2020-210",
      licenceBody: "Nursing Council of Kenya",
      yearsExperience: 4,
      languages: ["English", "Swahili", "Dholuo"],
      qualifications: ["Diploma in Nursing – Kisumu Medical Training College"],
      services: ["Home Visit", "Child Health", "Immunisation", "Health Education"],
      homeVisitFeeKes: 1800,
      county: "Kisumu",
      town: "Milimani",
      verificationStatus: "in_review" as const,
      isAvailable: false,
    },
  ];

  for (const p of nurses) {
    await db.providerProfile.upsert({ where: { userId: p.userId }, update: {}, create: p });
  }

  // ── Physiotherapist (home rehabilitation sessions) ────────────────────────
  const physios = [
    {
      userId: physioDaniel.id,
      specialty: "Physiotherapy",
      bio: "Physiotherapist specialising in post-surgery rehab, sports injuries, and mobility for the elderly — delivered at home.",
      licenceNumber: "PT-2017-044",
      licenceBody: "Physiotherapy Council of Kenya",
      yearsExperience: 8,
      languages: ["English", "Swahili", "Kalenjin"],
      qualifications: ["BSc Physiotherapy – University of Nairobi", "Certified Manual Therapist"],
      services: ["Home Session", "Post-Surgery Rehab", "Sports Injury", "Mobility Training", "Elderly Care"],
      consultationFeeKes: 1200,
      homeVisitFeeKes: 2500,
      county: "Nairobi",
      town: "Kilimani",
      verificationStatus: "verified" as const,
      isAvailable: true,
    },
  ];
  for (const p of physios) {
    await db.providerProfile.upsert({ where: { userId: p.userId }, update: {}, create: p });
  }

  // ── Reviews & ratings (real backing rows, idempotent) ─────────────────────
  // Each review is backed by a real past completed appointment, so the
  // ratingAvg/ratingCount aggregates stay consistent when new reviews arrive
  // during a live demo. Seeding a provider is skipped if it already has reviews.

  // A pool of reviewer patients so seeded reviews show varied, realistic names.
  const reviewerSpecs = [
    { email: "mary.kioko@example.com",    fullName: "Mary Kioko" },
    { email: "john.omondi@example.com",   fullName: "John Omondi" },
    { email: "ruth.chebet@example.com",   fullName: "Ruth Chebet" },
    { email: "david.mutua@example.com",   fullName: "David Mutua" },
    { email: "sarah.adhiambo@example.com",fullName: "Sarah Adhiambo" },
    { email: "peter.njoroge@example.com", fullName: "Peter Njoroge" },
    { email: "esther.wanjiru@example.com",fullName: "Esther Wanjiru" },
    { email: "samuel.kiprop@example.com", fullName: "Samuel Kiprop" },
    { email: "lucy.atieno@example.com",   fullName: "Lucy Atieno" },
    { email: "brian.maina@example.com",   fullName: "Brian Maina" },
  ];
  const reviewers = [alice, bob, carol];
  for (const spec of reviewerSpecs) {
    reviewers.push(await upsertUser({ ...spec, role: "patient" }));
  }

  /** Creates a past completed appointment + review per entry, then recomputes the aggregate. */
  async function seedReviews(
    providerId: string,
    feeKes: number,
    entries: { rating: number; comment: string }[],
  ) {
    const existing = await db.review.count({ where: { providerId } });
    if (existing > 0) return; // already seeded

    const baseDay = new Date();
    baseDay.setHours(0, 0, 0, 0);
    // Anchor review slots well before any generated booking slot (which only
    // span seed-run-date → +30 days) and off the 30-min grid (:05) so they
    // never collide with the bookable-slot unique constraint (provider, startsAt).
    const HISTORY_OFFSET_DAYS = 60;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const { rating, comment } = entry;
      const reviewer = reviewers[i % reviewers.length]!;
      const daysAgo = HISTORY_OFFSET_DAYS + i;
      const startsAt = new Date(baseDay.getTime() - daysAgo * 86_400_000 + (mins(10) + 5) * 60_000);
      const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
      const slot = await db.slot.create({
        data: { providerId, appointmentType: "teleconsult", startsAt, endsAt, isBooked: true },
      });
      const appointment = await db.appointment.create({
        data: {
          patientId: reviewer.id,
          providerId,
          slotId: slot.id,
          appointmentType: "teleconsult",
          status: "completed",
          feeKes,
        },
      });
      await db.review.create({
        data: { appointmentId: appointment.id, patientId: reviewer.id, providerId, rating, comment },
      });
    }

    const stats = await db.review.aggregate({
      where: { providerId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await db.providerProfile.update({
      where: { userId: providerId },
      data: {
        ratingAvg: Math.round((stats._avg.rating ?? 0) * 10) / 10,
        ratingCount: stats._count.rating,
      },
    });
  }

  await seedReviews(drAmina.id, 1500, [
    { rating: 5, comment: "Dr. Amina was thorough and explained everything clearly. Highly recommend." },
    { rating: 5, comment: "Very professional and caring. Got my prescription sorted in minutes." },
    { rating: 4, comment: "Good consultation, slight wait but worth it." },
    { rating: 5, comment: "She listened patiently and gave practical advice. Asante sana." },
    { rating: 5, comment: "Excellent doctor. The video call was clear and convenient." },
    { rating: 4, comment: "Helpful and knowledgeable. Will book again." },
    { rating: 5, comment: "Best telehealth experience I've had in Kenya." },
    { rating: 5, comment: "Quick, kind, and very competent. Thank you Dr. Amina." },
    { rating: 4, comment: "Reassuring and clear. Follow-up was easy to arrange." },
  ]);

  await seedReviews(drJames.id, 2000, [
    { rating: 5, comment: "Great with my son. Patient and gentle with kids." },
    { rating: 4, comment: "Knowledgeable paediatrician, answered all my questions." },
    { rating: 5, comment: "Dr. James put my daughter at ease immediately. Wonderful." },
    { rating: 4, comment: "Solid advice on my child's nutrition. Recommended." },
    { rating: 5, comment: "Very reassuring during a stressful night. Grateful." },
    { rating: 5, comment: "Clear guidance and a calm manner. Five stars." },
    { rating: 4, comment: "Good consult, helped us avoid an unnecessary hospital trip." },
  ]);

  await seedReviews(drFaith.id, 2500, [
    { rating: 5, comment: "Dr. Faith is compassionate and incredibly knowledgeable." },
    { rating: 5, comment: "Made me feel comfortable discussing sensitive issues. Thank you." },
    { rating: 5, comment: "Outstanding care throughout my pregnancy questions." },
    { rating: 4, comment: "Very professional and thorough. Highly recommend." },
    { rating: 5, comment: "Warm, attentive, and clear. The best." },
    { rating: 5, comment: "Answered every concern with patience. Truly excellent." },
    { rating: 4, comment: "Great experience, easy to talk to." },
    { rating: 5, comment: "Felt genuinely cared for. Will definitely return." },
  ]);

  await seedReviews(nursePeter.id, 1800, [
    { rating: 5, comment: "Peter was punctual and very professional during the home visit." },
    { rating: 4, comment: "Gentle and skilled. Made my mother comfortable." },
    { rating: 5, comment: "Excellent home care. Clean, careful, and kind." },
    { rating: 5, comment: "Highly professional nurse. Wound dressing was painless." },
    { rating: 4, comment: "Reliable and friendly. Would request again." },
    { rating: 5, comment: "Took great care of my father. Asante." },
  ]);

  await seedReviews(physioDaniel.id, 2500, [
    { rating: 5, comment: "Daniel got me walking again after my knee surgery. Excellent home sessions." },
    { rating: 5, comment: "Very professional physiotherapist. My back pain is gone." },
    { rating: 4, comment: "Great mobility exercises for my elderly mum. Patient and thorough." },
    { rating: 5, comment: "Helped my son recover from a football injury. Highly recommend." },
    { rating: 5, comment: "Convenient home rehab and real results. Asante sana Daniel." },
    { rating: 4, comment: "Knowledgeable and encouraging throughout my recovery." },
    { rating: 5, comment: "Best physio in Nairobi. Comes to you and truly cares." },
  ]);

  // nurse.grace is still in_review with no completed visits — no reviews yet.
  await db.providerProfile.update({ where: { userId: nurseGrace.id }, data: { ratingAvg: 0, ratingCount: 0 } });

  // ── Patient profiles ──────────────────────────────────────────────────────
  await db.patientProfile.upsert({
    where: { userId: alice.id },
    update: {},
    create: { userId: alice.id, gender: "female", county: "Nairobi", town: "Lavington", bloodGroup: "A+", allergies: ["Penicillin"] },
  });
  await db.patientProfile.upsert({
    where: { userId: bob.id },
    update: {},
    create: { userId: bob.id, gender: "male", county: "Nairobi", town: "Kileleshwa", bloodGroup: "O+", chronicConditions: ["Hypertension"] },
  });

  // ── Availability (Mon–Fri 08:00–17:00, 30-min teleconsult) ───────────────
  // Also generates concrete bookable Slot rows for the next 30 days so the
  // booking flow is demoable straight from the seed.
  const SLOT_HORIZON_DAYS = 30;
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  for (const providerId of [drAmina.id, drJames.id, drFaith.id]) {
    for (const day of [1, 2, 3, 4, 5]) {
      let rule = await db.availability.findFirst({ where: { providerId, dayOfWeek: day, appointmentType: "teleconsult" } });
      if (!rule) {
        rule = await db.availability.create({
          data: { providerId, appointmentType: "teleconsult", dayOfWeek: day, startMinute: mins(8), endMinute: mins(17), slotDuration: 30 },
        });
      }

      // Generate slots for each matching weekday in the horizon.
      const slots: { providerId: string; availabilityId: string; appointmentType: "teleconsult"; startsAt: Date; endsAt: Date }[] = [];
      for (let d = 0; d < SLOT_HORIZON_DAYS; d++) {
        const dayDate = new Date(startToday.getTime() + d * 86_400_000);
        if (dayDate.getDay() !== day) continue;
        for (let m = mins(8); m + 30 <= mins(17); m += 30) {
          slots.push({
            providerId,
            availabilityId: rule.id,
            appointmentType: "teleconsult",
            startsAt: new Date(dayDate.getTime() + m * 60_000),
            endsAt: new Date(dayDate.getTime() + (m + 30) * 60_000),
          });
        }
      }
      if (slots.length) await db.slot.createMany({ data: slots, skipDuplicates: true });
    }
  }

  // ── Pharmacy products ─────────────────────────────────────────────────────
  const products = [
    { name: "Paracetamol 500mg (24 tabs)", genericName: "Paracetamol",   category: "Pain Relief",      priceKes:  60, stockQty: 500, requiresPrescription: false, description: "For mild to moderate pain and fever." },
    { name: "Ibuprofen 400mg (20 tabs)",   genericName: "Ibuprofen",     category: "Pain Relief",      priceKes: 120, stockQty: 300, requiresPrescription: false, description: "Anti-inflammatory pain relief." },
    { name: "ORS Sachets (10 pack)",       genericName: "ORS",           category: "Gastrointestinal", priceKes:  90, stockQty: 400, requiresPrescription: false, description: "Rehydration salts for diarrhoea." },
    { name: "Zinc 20mg (10 tabs)",         genericName: "Zinc Sulphate", category: "Supplements",      priceKes:  80, stockQty: 350, requiresPrescription: false, description: "Zinc supplement for children with diarrhoea." },
    { name: "Vitamin C 1000mg (30 tabs)",  genericName: "Ascorbic Acid", category: "Supplements",      priceKes: 280, stockQty: 600, requiresPrescription: false, description: "Immune support supplement." },
    { name: "Clotrimazole Cream 2% 30g",  genericName: "Clotrimazole",  category: "Dermatology",      priceKes: 220, stockQty: 150, requiresPrescription: false, description: "Antifungal cream for skin infections." },
    { name: "Saline Nasal Spray 30ml",    genericName: "NaCl 0.9%",     category: "ENT",              priceKes: 350, stockQty: 200, requiresPrescription: false, description: "Relieves nasal congestion." },
    { name: "Hydrocortisone Cream 1% 15g",genericName: "Hydrocortisone",category: "Dermatology",      priceKes: 180, stockQty: 180, requiresPrescription: false, description: "Mild topical steroid." },
    { name: "Amoxicillin 500mg (21 caps)",  genericName: "Amoxicillin",  category: "Antibiotics",      priceKes: 380, stockQty: 200, requiresPrescription: true,  description: "Broad-spectrum antibiotic." },
    { name: "Metformin 500mg (60 tabs)",    genericName: "Metformin",    category: "Diabetes",         priceKes: 450, stockQty: 150, requiresPrescription: true,  description: "First-line type 2 diabetes treatment." },
    { name: "Amlodipine 5mg (30 tabs)",     genericName: "Amlodipine",   category: "Cardiovascular",   priceKes: 520, stockQty: 120, requiresPrescription: true,  description: "Calcium channel blocker for hypertension." },
    { name: "Atorvastatin 40mg (30 tabs)",  genericName: "Atorvastatin", category: "Cardiovascular",   priceKes: 680, stockQty: 100, requiresPrescription: true,  description: "Statin for cholesterol." },
    { name: "Salbutamol Inhaler 100mcg",    genericName: "Salbutamol",   category: "Respiratory",      priceKes: 890, stockQty:  80, requiresPrescription: true,  description: "Reliever inhaler for asthma." },
    { name: "Omeprazole 20mg (28 caps)",    genericName: "Omeprazole",   category: "Gastrointestinal", priceKes: 490, stockQty: 200, requiresPrescription: true,  description: "Proton pump inhibitor for acid reflux." },
    { name: "Azithromycin 250mg (6 tabs)",  genericName: "Azithromycin", category: "Antibiotics",      priceKes: 550, stockQty: 160, requiresPrescription: true,  description: "Macrolide antibiotic." },
  ];

  for (const product of products) {
    const existing = await db.product.findFirst({ where: { name: product.name } });
    if (!existing) await db.product.create({ data: { ...product, isActive: true } });
  }

  console.log("\n✅  Seed complete.\n");
  console.log("  Accounts (password: Demo1234!)");
  console.log("  ──────────────────────────────────────────────");
  console.log("  admin@carebora.ke         admin");
  console.log("  dr.amina@carebora.ke      doctor · GP · Nairobi · verified");
  console.log("  dr.james@carebora.ke      doctor · Paediatrics · Mombasa · verified");
  console.log("  dr.faith@carebora.ke      doctor · OB-GYN · Nairobi · verified");
  console.log("  nurse.peter@carebora.ke   nurse · Nairobi · verified");
  console.log("  nurse.grace@carebora.ke   nurse · Kisumu · in_review");
  console.log("  physio.daniel@carebora.ke physio · Nairobi · verified · home sessions");
  console.log("  alice@example.com         patient");
  console.log("  bob@example.com           patient");
  console.log("  carol@example.com         patient");
  console.log("  ──────────────────────────────────────────────");
  console.log("  15 pharmacy products (8 OTC + 7 Rx)");
  console.log("  Teleconsult slots generated for 3 doctors (next 30 days)\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
