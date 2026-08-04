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
  role: "patient" | "doctor" | "nurse" | "physio" | "pharmacy" | "vendor" | "admin";
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

  // ── Demo booked appointment ───────────────────────────────────────────────
  // A confirmed teleconsult (Alice ↔ Dr. Amina) so a doctor logging into the
  // demo immediately has a booking they can start a video consultation for.
  const demoAppt = await db.appointment.findFirst({
    where: { patientId: alice.id, providerId: drAmina.id, status: { in: ["requested", "confirmed"] } },
  });
  if (demoAppt) {
    // Ensure it's confirmed so the doctor can Start the consultation directly.
    if (demoAppt.status !== "confirmed") {
      await db.appointment.update({ where: { id: demoAppt.id }, data: { status: "confirmed" } });
    }
  } else {
    const slot = await db.slot.findFirst({
      where: { providerId: drAmina.id, appointmentType: "teleconsult", isBooked: false, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    if (slot) {
      await db.appointment.create({
        data: {
          patientId: alice.id,
          providerId: drAmina.id,
          slotId: slot.id,
          appointmentType: "teleconsult",
          status: "confirmed",
          feeKes: 1500,
          patientNotes: "Persistent dry cough for 3 days, mild chest tightness.",
        },
      });
      await db.slot.update({ where: { id: slot.id }, data: { isBooked: true } });
    }
  }

  // ── Canonical drug catalogue (shared across every vendor) ────────────────
  const drugSpecs = [
    { name: "Paracetamol 500mg (24 tabs)", genericName: "Paracetamol",   category: "Pain Relief",      requiresPrescription: false, description: "For mild to moderate pain and fever." },
    { name: "Ibuprofen 400mg (20 tabs)",   genericName: "Ibuprofen",     category: "Pain Relief",      requiresPrescription: false, description: "Anti-inflammatory pain relief." },
    { name: "ORS Sachets (10 pack)",       genericName: "ORS",           category: "Gastrointestinal", requiresPrescription: false, description: "Rehydration salts for diarrhoea." },
    { name: "Zinc 20mg (10 tabs)",         genericName: "Zinc Sulphate", category: "Supplements",      requiresPrescription: false, description: "Zinc supplement for children with diarrhoea." },
    { name: "Vitamin C 1000mg (30 tabs)",  genericName: "Ascorbic Acid", category: "Supplements",      requiresPrescription: false, description: "Immune support supplement." },
    { name: "Clotrimazole Cream 2% 30g",  genericName: "Clotrimazole",  category: "Dermatology",      requiresPrescription: false, description: "Antifungal cream for skin infections." },
    { name: "Saline Nasal Spray 30ml",    genericName: "NaCl 0.9%",     category: "ENT",              requiresPrescription: false, description: "Relieves nasal congestion." },
    { name: "Hydrocortisone Cream 1% 15g",genericName: "Hydrocortisone",category: "Dermatology",      requiresPrescription: false, description: "Mild topical steroid." },
    { name: "Amoxicillin 500mg (21 caps)",  genericName: "Amoxicillin",  category: "Antibiotics",      requiresPrescription: true,  description: "Broad-spectrum antibiotic." },
    { name: "Metformin 500mg (60 tabs)",    genericName: "Metformin",    category: "Diabetes",         requiresPrescription: true,  description: "First-line type 2 diabetes treatment." },
    { name: "Amlodipine 5mg (30 tabs)",     genericName: "Amlodipine",   category: "Cardiovascular",   requiresPrescription: true,  description: "Calcium channel blocker for hypertension." },
    { name: "Atorvastatin 40mg (30 tabs)",  genericName: "Atorvastatin", category: "Cardiovascular",   requiresPrescription: true,  description: "Statin for cholesterol." },
    { name: "Salbutamol Inhaler 100mcg",    genericName: "Salbutamol",   category: "Respiratory",      requiresPrescription: true,  description: "Reliever inhaler for asthma." },
    { name: "Omeprazole 20mg (28 caps)",    genericName: "Omeprazole",   category: "Gastrointestinal", requiresPrescription: true,  description: "Proton pump inhibitor for acid reflux." },
    { name: "Azithromycin 250mg (6 tabs)",  genericName: "Azithromycin", category: "Antibiotics",      requiresPrescription: true,  description: "Macrolide antibiotic." },
  ];

  const IMAGE_SLUGS: Record<string, string> = {
    "Paracetamol 500mg (24 tabs)": "paracetamol",
    "Ibuprofen 400mg (20 tabs)": "ibuprofen",
    "ORS Sachets (10 pack)": "ors",
    "Zinc 20mg (10 tabs)": "zinc",
    "Vitamin C 1000mg (30 tabs)": "vitamin-c",
    "Clotrimazole Cream 2% 30g": "clotrimazole",
    "Saline Nasal Spray 30ml": "saline-spray",
    "Hydrocortisone Cream 1% 15g": "hydrocortisone",
    "Amoxicillin 500mg (21 caps)": "amoxicillin",
    "Metformin 500mg (60 tabs)": "metformin",
    "Amlodipine 5mg (30 tabs)": "amlodipine",
    "Atorvastatin 40mg (30 tabs)": "atorvastatin",
    "Salbutamol Inhaler 100mcg": "salbutamol",
    "Omeprazole 20mg (28 caps)": "omeprazole",
    "Azithromycin 250mg (6 tabs)": "azithromycin",
  };

  const drugs: Record<string, Awaited<ReturnType<typeof db.drug.upsert>>> = {};
  for (const spec of drugSpecs) {
    const slug = IMAGE_SLUGS[spec.name];
    const imageUrl = slug ? `/products/${slug}.jpg` : undefined;
    const images = imageUrl ? [imageUrl] : [];
    const existing = await db.drug.findFirst({ where: { name: spec.name } });
    drugs[spec.name] = existing
      ? await db.drug.update({ where: { id: existing.id }, data: { imageUrl, images } })
      : await db.drug.create({ data: { ...spec, imageUrl, images, isActive: true } });
  }

  // ── Vendor pharmacies (Organizations) — demonstrates multi-vendor + proximity ──
  async function upsertVendorOrg(spec: {
    slug: string; name: string; ownerEmail: string; ownerName: string;
    branchName: string; county: string; town: string; lat: number; lng: number;
    type?: "pharmacy" | "ambulance" | "lab" | "clinic"; licencePrefix?: string;
  }) {
    const owner = await upsertUser({ email: spec.ownerEmail, fullName: spec.ownerName, role: "vendor", phone: "+254700100" + spec.slug.length });
    let org = await db.organization.findUnique({ where: { slug: spec.slug } });
    if (!org) {
      org = await db.organization.create({
        data: {
          type: spec.type ?? "pharmacy", name: spec.name, slug: spec.slug, status: "approved",
          licenceNumber: `${spec.licencePrefix ?? "PPB"}-SEED-${spec.slug}`, contactEmail: spec.ownerEmail,
        },
      });
      await db.orgBranch.create({
        data: {
          orgId: org.id, name: spec.branchName, county: spec.county, town: spec.town,
          latitude: spec.lat, longitude: spec.lng, deliveryRadiusKm: 15, deliveryFeeKes: 100,
        },
      });
    }
    // Independent of org creation — an existing org (found by slug) might still
    // be missing this owner's membership (e.g. the owner user was just created).
    await db.orgMember.upsert({
      where: { orgId_userId: { orgId: org.id, userId: owner.id } },
      update: {},
      create: { orgId: org.id, userId: owner.id, role: "owner" },
    });
    return org;
  }

  const wellcare = await upsertVendorOrg({
    slug: "wellcare-pharmacy", name: "Wellcare Pharmacy", ownerEmail: "owner.wellcare@example.com", ownerName: "Grace Muthoni",
    branchName: "CBD Branch", county: "Nairobi", town: "CBD", lat: -1.2841, lng: 36.8155,
  });
  const medipoint = await upsertVendorOrg({
    slug: "medipoint-pharmacy", name: "MediPoint Pharmacy", ownerEmail: "owner.medipoint@example.com", ownerName: "Kevin Otieno",
    branchName: "Westlands Branch", county: "Nairobi", town: "Westlands", lat: -1.2673, lng: 36.8065,
  });
  const coastMeds = await upsertVendorOrg({
    slug: "coast-meds-pharmacy", name: "Coast Meds Pharmacy", ownerEmail: "owner.coastmeds@example.com", ownerName: "Fatuma Said",
    branchName: "Nyali Branch", county: "Mombasa", town: "Nyali", lat: -4.0435, lng: 39.6682,
  });

  /** Idempotently claims a listing for an org, with a price nudge so vendors don't all match exactly. */
  async function upsertListing(orgId: string, drugName: string, priceKes: number, stockQty: number) {
    const drug = drugs[drugName];
    if (!drug) return;
    const existing = await db.listing.findUnique({ where: { orgId_drugId: { orgId, drugId: drug.id } } });
    if (existing) return existing;
    return db.listing.create({ data: { orgId, drugId: drug.id, priceKes, stockQty } });
  }

  const wellcarePrices: Record<string, number> = {
    "Paracetamol 500mg (24 tabs)": 60, "Ibuprofen 400mg (20 tabs)": 120, "ORS Sachets (10 pack)": 90,
    "Zinc 20mg (10 tabs)": 80, "Vitamin C 1000mg (30 tabs)": 280, "Clotrimazole Cream 2% 30g": 220,
    "Saline Nasal Spray 30ml": 350, "Hydrocortisone Cream 1% 15g": 180, "Amoxicillin 500mg (21 caps)": 380,
    "Metformin 500mg (60 tabs)": 450, "Amlodipine 5mg (30 tabs)": 520, "Atorvastatin 40mg (30 tabs)": 680,
    "Salbutamol Inhaler 100mcg": 890, "Omeprazole 20mg (28 caps)": 490, "Azithromycin 250mg (6 tabs)": 550,
  };
  for (const [name, price] of Object.entries(wellcarePrices)) {
    await upsertListing(wellcare.id, name, price, 200);
  }

  // MediPoint stocks a subset, slightly cheaper on OTC items (undercuts Wellcare on price).
  const medipointPrices: Record<string, number> = {
    "Paracetamol 500mg (24 tabs)": 55, "Ibuprofen 400mg (20 tabs)": 110, "ORS Sachets (10 pack)": 85,
    "Vitamin C 1000mg (30 tabs)": 260, "Clotrimazole Cream 2% 30g": 210, "Amoxicillin 500mg (21 caps)": 360,
    "Metformin 500mg (60 tabs)": 430, "Amlodipine 5mg (30 tabs)": 500, "Omeprazole 20mg (28 caps)": 470,
    "Azithromycin 250mg (6 tabs)": 530,
  };
  for (const [name, price] of Object.entries(medipointPrices)) {
    await upsertListing(medipoint.id, name, price, 150);
  }

  // Coast Meds (Mombasa) — far from Nairobi buyers, demonstrates distance ranking.
  const coastPrices: Record<string, number> = {
    "Paracetamol 500mg (24 tabs)": 65, "ORS Sachets (10 pack)": 95, "Zinc 20mg (10 tabs)": 85,
    "Amoxicillin 500mg (21 caps)": 400, "Azithromycin 250mg (6 tabs)": 560,
    "Salbutamol Inhaler 100mcg": 900, "Omeprazole 20mg (28 caps)": 500,
    "Saline Nasal Spray 30ml": 340,
  };
  for (const [name, price] of Object.entries(coastPrices)) {
    await upsertListing(coastMeds.id, name, price, 120);
  }

  // ── Ambulance operator (demonstrates request + dispatch) ──────────────────
  const rapidResponse = await upsertVendorOrg({
    slug: "rapid-response-ambulance", name: "Rapid Response Ambulance", ownerEmail: "owner.rapidresponse@example.com",
    ownerName: "Samuel Kiptoo", type: "ambulance", licencePrefix: "NASA",
    branchName: "Upper Hill Base", county: "Nairobi", town: "Upper Hill", lat: -1.2963, lng: 36.8172,
  });
  const existingAmbulances = await db.ambulance.count({ where: { orgId: rapidResponse.id } });
  if (existingAmbulances === 0) {
    await db.ambulance.create({
      data: { orgId: rapidResponse.id, plateNumber: "KDA 001A", type: "advanced_life_support", crewSize: 3, equipment: ["Defibrillator", "Oxygen", "Stretcher"] },
    });
    await db.ambulance.create({
      data: { orgId: rapidResponse.id, plateNumber: "KDA 002B", type: "basic", crewSize: 2, equipment: ["Oxygen", "First Aid"] },
    });
  }

  // ── Diagnostic lab (demonstrates lab-order request + result flow) ─────────
  const precisionLab = await upsertVendorOrg({
    slug: "precision-diagnostics-lab", name: "Precision Diagnostics Lab", ownerEmail: "owner.precisionlab@example.com",
    ownerName: "Dr. Wanjiku Kamau", type: "lab", licencePrefix: "KMLTTB",
    branchName: "Hurlingham Branch", county: "Nairobi", town: "Hurlingham", lat: -1.2977, lng: 36.7889,
  });
  const existingLabTests = await db.labTest.count({ where: { orgId: precisionLab.id } });
  if (existingLabTests === 0) {
    await db.labTest.createMany({
      data: [
        { orgId: precisionLab.id, code: "FBC", name: "Full Blood Count", category: "Haematology", priceKes: 800, turnaroundHours: 4, sampleType: "Blood" },
        { orgId: precisionLab.id, code: "MP", name: "Malaria Parasites (BS)", category: "Parasitology", priceKes: 300, turnaroundHours: 2, sampleType: "Blood" },
        { orgId: precisionLab.id, code: "RBS", name: "Random Blood Sugar", category: "Chemistry", priceKes: 250, turnaroundHours: 1, sampleType: "Blood" },
        { orgId: precisionLab.id, code: "LFT", name: "Liver Function Test", category: "Chemistry", priceKes: 1500, turnaroundHours: 6, sampleType: "Blood" },
        { orgId: precisionLab.id, code: "UECR", name: "Urea, Electrolytes & Creatinine", category: "Chemistry", priceKes: 1800, turnaroundHours: 6, sampleType: "Blood" },
        { orgId: precisionLab.id, code: "HIV", name: "HIV Test (Rapid)", category: "Serology", priceKes: 500, turnaroundHours: 1, sampleType: "Blood" },
      ],
    });
  }

  // ── Sample pharmacy orders (so the admin Orders tab has content) ──────────
  const existingOrders = await db.order.count();
  if (existingOrders === 0) {
    const paracetamolListing = await db.listing.findFirst({ where: { orgId: wellcare.id, drugId: drugs["Paracetamol 500mg (24 tabs)"]!.id } });
    const vitaminCListing = await db.listing.findFirst({ where: { orgId: wellcare.id, drugId: drugs["Vitamin C 1000mg (30 tabs)"]!.id } });
    const orsListing = await db.listing.findFirst({ where: { orgId: medipoint.id, drugId: drugs["ORS Sachets (10 pack)"]!.id } });

    type Line = { listing: typeof paracetamolListing; drugName: string; qty: number };
    const demoOrders: {
      patient: typeof alice; orgId: string; status: "delivered" | "dispatched" | "paid";
      address: string; phone: string; daysAgo: number; lines: Line[];
    }[] = [
      { patient: alice, orgId: wellcare.id, status: "delivered", address: "House 12, Maple Ave, Lavington, Nairobi", phone: "+254733000001", daysAgo: 6,
        lines: [{ listing: paracetamolListing, drugName: "Paracetamol 500mg (24 tabs)", qty: 2 }, { listing: vitaminCListing, drugName: "Vitamin C 1000mg (30 tabs)", qty: 1 }] },
      { patient: bob, orgId: medipoint.id, status: "dispatched", address: "Apt 4B, Kileleshwa, Nairobi", phone: "+254733000002", daysAgo: 2,
        lines: [{ listing: orsListing, drugName: "ORS Sachets (10 pack)", qty: 3 }] },
      { patient: alice, orgId: wellcare.id, status: "paid", address: "House 12, Maple Ave, Lavington, Nairobi", phone: "+254733000001", daysAgo: 0,
        lines: [{ listing: paracetamolListing, drugName: "Paracetamol 500mg (24 tabs)", qty: 1 }] },
    ];

    for (const o of demoOrders) {
      const items = o.lines.filter((l): l is { listing: NonNullable<Line["listing"]>; drugName: string; qty: number } => l.listing !== null);
      if (!items.length) continue;
      const subtotal = items.reduce((sum, l) => sum + l.listing.priceKes * l.qty, 0);
      const createdAt = new Date(Date.now() - o.daysAgo * 86_400_000);
      const order = await db.order.create({
        data: {
          patientId: o.patient.id,
          totalKes: subtotal,
          phoneNumber: o.phone,
          deliveryAddress: o.address,
          createdAt,
          vendorOrders: {
            create: [{
              orgId: o.orgId,
              status: o.status,
              subtotalKes: subtotal,
              ...(o.status === "dispatched" ? { dispatchedAt: new Date(createdAt.getTime() + 3_600_000) } : {}),
              ...(o.status === "delivered"
                ? { dispatchedAt: new Date(createdAt.getTime() + 3_600_000), deliveredAt: new Date(createdAt.getTime() + 2 * 86_400_000) }
                : {}),
              items: {
                create: items.map((l) => ({
                  listingId: l.listing.id,
                  drugName: l.drugName,
                  unitPriceKes: l.listing.priceKes,
                  qty: l.qty,
                })),
              },
            }],
          },
        },
      });
      // Every paid/dispatched/delivered order needs a matching Payment (the
      // polymorphic Payment table is now the sole source of receipt/paidAt data).
      const payment = await db.payment.create({
        data: {
          subjectType: "order",
          subjectId: order.id,
          patientId: o.patient.id,
          orgId: o.orgId,
          gateway: "till",
          method: "till",
          status: "completed",
          amountKes: subtotal,
          phoneNumber: o.phone,
          gatewayRef: `TILL-SEED-${order.id}`,
          receiptNumber: `SDE${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
          commissionPercentSnapshot: 10,
          paidAt: createdAt,
          createdAt,
        },
      });
      const platformFee = Math.round(subtotal * 0.1);
      await db.ledgerEntry.create({
        data: { paymentId: payment.id, type: "gross_sale", amountKes: subtotal, description: "Gross sale (seed)" },
      });
      await db.ledgerEntry.create({
        data: { paymentId: payment.id, type: "platform_fee", orgId: o.orgId, amountKes: platformFee, description: "10% platform commission (seed)" },
      });
      await db.ledgerEntry.create({
        data: { paymentId: payment.id, type: "vendor_payout", orgId: o.orgId, amountKes: subtotal - platformFee, description: "Vendor net payout (seed)" },
      });
    }
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
  console.log("  owner.wellcare@example.com   vendor · Wellcare Pharmacy · Nairobi CBD");
  console.log("  owner.medipoint@example.com  vendor · MediPoint Pharmacy · Westlands");
  console.log("  owner.coastmeds@example.com  vendor · Coast Meds Pharmacy · Mombasa");
  console.log("  owner.rapidresponse@example.com vendor · Rapid Response Ambulance · Nairobi");
  console.log("  owner.precisionlab@example.com  vendor · Precision Diagnostics Lab · Nairobi");
  console.log("  ──────────────────────────────────────────────");
  console.log("  15 drugs in the shared catalogue (8 OTC + 7 Rx)");
  console.log("  3 approved pharmacy vendors with overlapping + distance-varied listings");
  console.log("  1 ambulance operator with 2 vehicles (ALS + basic)");
  console.log("  1 diagnostic lab with 6 tests");
  console.log("  Teleconsult slots generated for 3 doctors (next 30 days)\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
