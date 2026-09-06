# Care Bora Kenya — Investor Demo Script

> **Live URL:** https://nursecare-ke-five.vercel.app
> **Duration:** ~12–15 minutes
> **Demo accounts (password: `Demo1234!`)** — full list in [ACCOUNTS.md](./ACCOUNTS.md):
>
> | Account | Role |
> |---|---|
> | `alice@example.com` | Patient |
> | `dr.amina@carebora.ke` | Doctor (GP, Nairobi, verified) |
> | `nurse.peter@carebora.ke` | Nurse (home care) |
> | `physio.daniel@carebora.ke` | Physiotherapist (home sessions) |
> | `admin@carebora.ke` | Admin |
> | `owner.wellcare@example.com` | Vendor — Wellcare Pharmacy (Nairobi CBD) |
> | `owner.medipoint@example.com` | Vendor — MediPoint Pharmacy (Westlands) |
> | `owner.coastmeds@example.com` | Vendor — Coast Meds Pharmacy (Mombasa) |
> | `owner.rapidresponse@example.com` | Vendor — Rapid Response Ambulance |
> | `owner.precisionlab@example.com` | Vendor — Precision Diagnostics Lab |
>
> **M-Pesa sandbox test number:** `0708374149` — the sandbox accepts the STK push but sends **no real phone prompt**, so each pay screen has a **"Simulate M-Pesa payment (sandbox)"** button that completes the payment for the demo.

---

## Act 1 — Sign up & Browse Providers (2 min)

1. Open the live URL → **Log in** as `alice@example.com` / `Demo1234!`
2. Click **Providers** — real provider **photos**, specialties, fees, **star ratings backed by real reviews**, and verified badges
3. Open **Dr. Amina Wanjiku** → full profile: bio, qualifications, consultation fee (KES 1,500), languages, and live bookable slots

**Talking point:** *"Every provider passes a licence-verification queue before they appear. The whole roster — GP, paediatrics, OB-GYN, nursing, physiotherapy — is here."*

---

## Act 2 — Book a Teleconsultation + Notifications (2 min)

1. On Dr. Amina's profile, pick a slot in the next 7 days → **Book appointment** → status `requested`
2. Switch tab → log in as `dr.amina@carebora.ke` → the **🔔 bell** shows *"New appointment request"*
3. Go to **/appointments** → **Confirm** → status `confirmed`
4. Back as Alice: the bell shows *"Appointment confirmed"* (also sent by email + SMS)

**Talking point:** *"Booking uses a DB-level unique constraint — no double-booking, even under concurrent load. Every step fires an in-app notification plus email (Resend) and SMS (Africa's Talking)."*

---

## Act 3 — Pay with M-Pesa (1.5 min)

1. As Alice on **/appointments**, click **Pay KES 1,500** on the confirmed appointment
2. Enter `0708374149` → **Pay** → *"STK push sent"*
3. Click **Simulate M-Pesa payment (sandbox)** → status flips to **Paid ✓**

**Talking point:** *"Daraja STK push is the rail behind most Kenyan transactions. One unified webhook settles appointment payments, pharmacy orders, and home-visit fees, and it's idempotent — a settled payment is never double-charged or reversed by a duplicate callback."*

---

## Act 4 — Live Video Consultation, Clinical Records & AI Assist (3 min)

1. As Alice, a **"Your doctor is ready — join now"** notification will arrive once the doctor starts (email + SMS + bell, linking straight to the room).
2. As **Dr. Amina**, /appointments → **Start consultation** → the LiveKit video room opens.
3. Open a second window as **Alice** → **Join consultation** → live video + in-call chat.
4. As the doctor, use the side panel tabs:
   - **Treatment Sheet** (role-based) — a WHO-aligned structured record: presenting complaint, history, examination, **diagnosis**, treatment plan, follow-up. Each field **autosaves**. *(A nurse would see a **Cardex**; a physio a SOAP **Assessment**.)*
   - **Prescriptions** — issue meds (e.g. Amoxicillin 500 mg, 3×/day, 7 days) → **download the prescription PDF**.
   - **AI assist** — ask a clinical question (e.g. *"amoxicillin dose for adult CAP?"*) → evidence-based answer that also cross-references your pharmacy stock.
5. Click **Download PDF** on the treatment sheet → a branded A4 **treatment sheet that includes the prescription**.

**Talking point:** *"The doctor documents a proper medical record, not a free-text box — and it flows straight into the patient's history and a printable treatment sheet (great for sick-off notes). The AI assist is a free, self-hostable model, so clinical decision support costs us nothing per query."*

---

## Act 5 — Pharmacy: Real Products, Details & Checkout (2 min)

1. As Alice → **/pharmacy** — real **product photos**, OTC/Rx badges, stock states; hover a card for the **zoom** effect.
2. Click a drug → **detail modal**: large image, generic name, price, stock, description, Rx notice.
3. Add items → tap the **cart icon** → the **slide-over cart drawer** (works on mobile).
4. Enter address → **Pay via M-Pesa** → **Simulate M-Pesa payment (sandbox)** → order **paid**.

**Talking point:** *"Admins manage the catalogue and upload drug photos themselves. Prescription-only items are gated — attach an in-app prescription or book a consult. Stock is decremented transactionally and restored on a failed payment."*

---

## Act 6 — Home-Based Care (nurse / physio / doctor) (1.5 min)

1. As Alice → **Home visits** → **Request visit** → choose **Physiotherapist — home session** (or Nurse / Doctor), set urgency to **Emergency**, describe the need, add address.
2. As **admin** → **Home visits** tab → **Assign** a provider, fee, and time.
3. Back as Alice → **Pay** → **Simulate** → visit paid; provider is notified.

**Talking point:** *"Nurses deliver home-based care, physiotherapists run home sessions, and there's an emergency tier — all on the same assignment and payment engine."*

---

## Act 7 — AI Health Assistant + Pharmacy Match (1.5 min)

1. As Alice → **AI Health Check** → type *"burning when urinating and lower abdominal pain for 2 days"*.
2. Result card: **urgency**, recommended **specialist**, practical advice, disclaimer.
3. **"Available at our pharmacy"** — over-the-counter items matched to the symptoms, with prices, linking to the shop.

**Talking point:** *"Triage runs on a free Hugging Face model (Llama 3.1) — no per-call AI bill. It never diagnoses; it triages, recommends a specialist, routes to booking, and up-sells relevant OTC products from our own pharmacy."*

---

## Act 8 — Full Admin Operations (2 min)

Log in as `admin@carebora.ke` → **Operations dashboard**. Every section loads independently (one failure never blanks the rest):

- **Overview** — users by role, appointments, revenue + platform fees, orders, home visits
- **Appointments** — platform-wide oversight with status filter
- **Users** — filter by role; **enable/disable** any account
- **Applications** — provider licence queue → **Approve / Reject**
- **Pharmacy** — **add / edit / remove products, manage stock & price, upload images**
- **Orders** — oversee orders; advance status (paid → processing → dispatched → delivered)
- **Reviews** — moderate (hide/show); provider rating recomputes
- **Audit log** — every clinical/admin action, timestamped and actor-attributed

**Talking point:** *"An admin runs the entire business from here — clinicians, catalogue, orders, verifications, moderation — with an immutable audit trail, built with Kenya's Data Protection Act 2019 in mind."*

---

## Close — Mobile-Readiness (30 sec)

Open **/api/v1/docs** (Swagger UI).

> *"Everything you saw is a versioned, Zod-validated, JWT (bearer) API with CORS enabled — a React Native or Flutter app imports our typed `@carebora/api-client` SDK and calls the same URLs with zero backend changes. The web app is just the first client."*

---

## Key Numbers to Cite

| Metric | Value |
|---|---|
| API surface | 60+ versioned REST endpoints, OpenAPI + Swagger docs, **CORS enabled** |
| Flows | Auth · booking · **video consults** · **structured clinical records + PDF** · payments · **pharmacy (real photos)** · **home care (nurse/physio/doctor + emergency)** · **AI triage + fact-check** · reviews · **in-app + email + SMS notifications** |
| Test coverage | Playwright E2E — **50/50** passing against production |
| Kenya payment rail | M-Pesa Daraja STK push (sandbox live; idempotent webhook; one-tap simulate for demos) |
| Video | LiveKit Cloud (native RN + Flutter SDKs) |
| AI | **Free Hugging Face model** (Llama 3.1) — symptom triage, clinician fact-check, pharmacy matching; $0/query |
| Database | Neon PostgreSQL (serverless) |
| Notifications | In-app bell + Resend email + Africa's Talking SMS |
| Clinical records | Role-based Treatment Sheet / Nursing Cardex / Physio Assessment + branded PDF with prescription |
| Mobile-ready | Same API, typed SDK, bearer auth, CORS |
| Compliance | Audit logs, RBAC, HSTS, CSP, httpOnly cookies |
