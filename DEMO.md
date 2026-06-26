# CareBora — Investor Demo Script

> **Live URL:** https://nursecare-ke-five.vercel.app  
> **Duration:** ~10 minutes  
> **Demo accounts (password: `Demo1234!`):**
>
> | Account | Role |
> |---|---|
> | `alice@example.com` | Patient |
> | `dr.amina@carebora.ke` | Doctor (GP, Nairobi, verified) |
> | `admin@carebora.ke` | Admin |

---

## Act 1 — Sign up & Browse Providers (2 min)

1. Open https://nursecare-ke-five.vercel.app → click **Log in**
2. Sign in as `alice@example.com` / `Demo1234!`
3. Click **Providers** in the nav
4. Show the provider cards — specialties, fees, ratings, verified badges
5. Click **Dr. Amina Wanjiku** → show her full profile: bio, qualifications, consultation fee (KES 1,500), available slots

**Talking point:** *"Every provider goes through a licence verification queue before they appear here. Investors and regulators can see the audit trail in the admin dashboard."*

---

## Act 2 — Book a Teleconsultation (1.5 min)

1. On Dr. Amina's profile, click a slot in the next 7 days → **Book appointment**
2. Note the appointment status: `requested`
3. Switch tab — log in as `dr.amina@carebora.ke`
4. Go to **/appointments** → confirm the booking → status moves to `confirmed`

**Talking point:** *"Slot booking uses a DB-level unique constraint — no double-booking is possible even under concurrent load."*

---

## Act 3 — Pay with M-Pesa (1.5 min)

1. Still as Alice, go to **/appointments** → click **Pay** on the confirmed appointment
2. Enter phone `0712345678` (Safaricom sandbox test number) → **Pay KES 1,500**
3. Show the "STK push sent" message
4. *(In a real demo, enter the sandbox PIN on the phone — code `1234` for Daraja sandbox)*
5. The payment status updates to `completed`; a receipt appears

**Talking point:** *"We use Daraja STK push — the same rail that processes 90% of transactions in Kenya. The callback is a single unified webhook that handles appointment payments, pharmacy orders, and home visit fees."*

---

## Act 4 — Live Video Consultation + Prescription (2 min)

1. As Dr. Amina, go to **/appointments** → click **Start consultation** on the paid appointment
2. The LiveKit video room opens — show the camera/mic UI
3. Open a second browser window as Alice → join the same room
4. Show live video feed + in-call chat
5. As Dr. Amina, click **Issue prescription** → fill in medications (e.g. Amoxicillin 500mg, 3x/day, 7 days)
6. Click **Download prescription PDF** → A4 CareBora-branded prescription appears

**Talking point:** *"LiveKit is used by companies like Slack and Discord. It has native React Native and Flutter SDKs, so our same backend tokens work for the mobile app on day one."*

---

## Act 5 — Pharmacy Order (1.5 min)

1. As Alice, go to **/pharmacy**
2. Browse the catalogue — show OTC vs Rx categories
3. Add **Paracetamol 500mg** to cart → **Checkout**
4. Enter delivery address + phone → **Pay KES 60 via M-Pesa**
5. Show order status: `pending` → *(after callback)* `paid`

**Talking point:** *"Prescription-linked orders are supported — a patient can attach an in-platform prescription to bypass the Rx check. Stock levels are decremented transactionally; a failed payment restores them."*

---

## Act 6 — Home-Based Care (1 min)

1. As Alice, click **Home visits** in the nav → **Request visit**
2. Choose **Nurse**, describe: *"Post-surgery wound dressing"*, enter address + county
3. Submit → status `pending`
4. Switch to `admin@carebora.ke` → **Admin dashboard** → **Home visits** tab
5. Click **Assign** on the request → enter Dr. Peter's ID, fee KES 2,000, scheduled time
6. Back as Alice: status updated to `assigned` → **Pay** button appears

**Talking point:** *"The same M-Pesa callback webhook handles home visit payments — no duplication of payment logic."*

---

## Act 7 — Admin & Observability (30 sec)

1. As admin, show the **Overview** tab: user counts by role, appointments, revenue, orders, home visits
2. Show the **Verifications** tab — pending provider licence queue with Approve/Reject
3. Show the **Audit log** — every clinical action is timestamped and actor-attributed

**Talking point:** *"We're building with Kenya's Data Protection Act 2019 in mind from day one. Every write to a clinical record lands in an immutable audit log."*

---

## Close — Mobile-Readiness (30 sec)

Open https://nursecare-ke-five.vercel.app/api/v1/docs in a new tab.

> *"Every feature you just saw is a versioned, Zod-validated, JWT-authenticated REST endpoint. A React Native or Flutter mobile app needs zero backend changes — it just imports our typed `@carebora/api-client` SDK and calls the same URLs. This is why we built API-first."*

---

## Key Numbers to Cite

| Metric | Value |
|---|---|
| API endpoints | 46 (all deployed, all documented) |
| Flows covered | 6 of 6 (auth, booking, video, payments, pharmacy, home care) |
| Test coverage | Playwright E2E across all 6 flows |
| Kenya payment rail | M-Pesa Daraja STK push (sandbox live) |
| Video stack | LiveKit Cloud (RN + Flutter SDK available) |
| Database | Neon PostgreSQL (serverless, Vercel-native) |
| Mobile-ready | Yes — same API, typed SDK, bearer + cookie auth |
| Data compliance | Audit logs, RBAC, HSTS, CSP, httpOnly cookies |
