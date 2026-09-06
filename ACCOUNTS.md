# CareBora — Seeded Accounts

Every account created by `npm run db:seed`, what it can do, and which one to use
for which flow.

> **Password for every seeded account: `Demo1234!`**
>
> Log in at `/login`, or via the API:
> ```bash
> curl -X POST http://localhost:3000/api/v1/auth/login \
>   -H "Content-Type: application/json" \
>   -d '{"email":"alice@example.com","password":"Demo1234!"}'
> ```

These are demo credentials for local and staging use. **Never seed this data into
a production database** — the password is public, in this file and in the repo.

---

## At a glance

| Role | Count | Sign in to see |
|---|---|---|
| [Admin](#admin) | 1 | Verification queues, vendor approvals, payments, platform stats |
| [Doctors](#doctors) | 3 | Appointments, video consults, treatment sheets, prescriptions |
| [Nurses](#nurses) | 2 | Home visits, nursing care plans |
| [Physiotherapist](#physiotherapist) | 1 | Home sessions, SOAP assessments |
| [Vendors](#vendors) | 5 | A vendor dashboard scoped to one business |
| [Patients](#patients) | 13 | Booking, records, pharmacy, ambulance, labs |

---

## Admin

| Email | Name |
|---|---|
| `admin@carebora.ke` | Admin CareBora |

The only account that can reach `/admin`. Use it to approve provider licences
and vendor applications, verify Till payments, view the ledger and platform
revenue, and read audit logs.

Admin **cannot** silently read a patient's medical record — opening one requires
an explicit written reason, and every access is written to the patient-visible
access log. See [Medical records](#medical-records-access-control).

---

## Doctors

All three are `verified` and appear in the public provider directory.

| Email | Name | Specialty | County | Consult fee | Home visit |
|---|---|---|---|---|---|
| `dr.amina@carebora.ke` | Dr. Amina Wanjiku | General Practice | Nairobi | KES 1,500 | KES 3,500 |
| `dr.james@carebora.ke` | Dr. James Otieno | Paediatrics | Mombasa | KES 2,000 | KES 4,500 |
| `dr.faith@carebora.ke` | Dr. Faith Muthoni | Obstetrics & Gynaecology | Nairobi | KES 2,500 | KES 5,000 |

Each has 30 days of bookable teleconsult slots generated from the seed date.
Doctors document consultations on a **treatment sheet** — presenting complaint,
history, examination, investigations, diagnosis, treatment plan, follow-up —
which the patient then sees in their own record, and can download as a PDF.

---

## Nurses

| Email | Name | Specialty | County | Verification | Home visit |
|---|---|---|---|---|---|
| `nurse.peter@carebora.ke` | Peter Kamau RN | General Nursing | Nairobi | **verified** | KES 2,000 |
| `nurse.grace@carebora.ke` | Grace Achieng RN | Community Health Nursing | Kisumu | **in_review** | KES 1,800 |

`nurse.grace` is deliberately left **in_review** so the admin verification queue
has something in it — she will not appear in the public directory until approved.

Nurses document on a **nursing cardex / care plan** — assessment, vital signs,
nursing diagnosis, care plan and interventions, medications administered, fluid
balance, notes, handover.

---

## Physiotherapist

| Email | Name | Specialty | County | Consult fee | Home visit |
|---|---|---|---|---|---|
| `physio.daniel@carebora.ke` | Daniel Kiptoo | Physiotherapy | Nairobi | KES 1,200 | KES 2,500 |

Documents on a **SOAP assessment** — subjective, objective, assessment,
treatment given, home exercise programme, plan.

---

## Vendors

Each vendor owns exactly one business and sees only that business's data in
`/vendor`. All five are `approved`, so their listings are live on the storefront.

A vendor of one type **cannot** act on another type's resources — a pharmacy
owner can't accept ambulance requests or enter lab results, and can't touch
another pharmacy's branches, listings or orders.

### Pharmacies

| Email | Owner | Business | Branch | Listings |
|---|---|---|---|---|
| `owner.wellcare@example.com` | Grace Muthoni | Wellcare Pharmacy | CBD Branch, Nairobi | 15 |
| `owner.medipoint@example.com` | Kevin Otieno | MediPoint Pharmacy | Westlands Branch, Nairobi | 10 |
| `owner.coastmeds@example.com` | Fatuma Said | Coast Meds Pharmacy | Nyali Branch, Mombasa | 8 |

The three are deliberately spread across locations so **nearest-pharmacy
matching** is visible: a buyer in Nairobi CBD is matched to Wellcare first
(~0.3 km) then MediPoint (~2.4 km); a buyer in Mombasa gets Coast Meds. Their
catalogues overlap at different prices, so the same drug shows several offers.

### Ambulance

| Email | Owner | Business | Base |
|---|---|---|---|
| `owner.rapidresponse@example.com` | Samuel Kiptoo | Rapid Response Ambulance | Upper Hill Base, Nairobi |

Fleet: `KDA 001A` (advanced life support, crew of 3) and `KDA 002B` (basic, crew
of 2). Sign in to see the dispatch queue and move a request through
accepted → dispatched → en route → arrived → completed.

### Laboratory

| Email | Owner | Business | Branch |
|---|---|---|---|
| `owner.precisionlab@example.com` | Dr. Wanjiku Kamau | Precision Diagnostics Lab | Hurlingham Branch, Nairobi |

Test menu:

| Code | Test | Price |
|---|---|---|
| `RBS` | Random Blood Sugar | KES 250 |
| `MP` | Malaria Parasites (BS) | KES 300 |
| `HIV` | HIV Test (Rapid) | KES 500 |
| `FBC` | Full Blood Count | KES 800 |
| `LFT` | Liver Function Test | KES 1,500 |
| `UECR` | Urea, Electrolytes & Creatinine | KES 1,800 |

A lab **cannot accept an order until it has been paid for** — that guard is
intentional, so expect a `400` if you try to accept an unpaid order.

---

## Patients

### Main demo patients

Use these for walkthroughs — they have phone numbers set and existing history.

| Email | Name | Phone |
|---|---|---|
| `alice@example.com` | Alice Njeri | +254 733 000 001 |
| `bob@example.com` | Bob Mwangi | +254 733 000 002 |
| `carol@example.com` | Carol Wairimu | +254 733 000 003 |

Alice has completed appointments with Dr. Amina and Dr. James, which matters for
[records access control](#medical-records-access-control): those care
relationships are what let those doctors read her record.

Bob is useful as the **unrelated third party** — he has no care relationship
with Alice, so using him to request her record demonstrates the denial path.

### Review authors

Ten further patients exist so seeded provider reviews carry varied, realistic
names. They log in with the same password but have no history of their own.

`brian.maina@example.com` · `david.mutua@example.com` ·
`esther.wanjiru@example.com` · `john.omondi@example.com` ·
`lucy.atieno@example.com` · `mary.kioko@example.com` ·
`peter.njoroge@example.com` · `ruth.chebet@example.com` ·
`samuel.kiprop@example.com` · `sarah.adhiambo@example.com`

---

## Which account for which flow

| To see this | Sign in as |
|---|---|
| Book a teleconsult | `alice@example.com`, then confirm as `dr.amina@carebora.ke` |
| Video consultation | `alice@example.com` + `dr.amina@carebora.ke` in two browsers |
| Treatment sheet → patient record → PDF | Write as `dr.amina@carebora.ke`, read at `/records` as `alice@example.com` |
| Nursing care plan | `nurse.peter@carebora.ke` |
| Home visit, end to end | Request as `alice@example.com`, assign as `admin@carebora.ke`, deliver as `nurse.peter@carebora.ke` |
| Nearest-pharmacy matching | Any patient at `/pharmacy` — set location to Nairobi, then Mombasa |
| Multi-vendor cart split | Add items from Wellcare **and** MediPoint, then check out |
| Vendor order fulfilment | `owner.wellcare@example.com` |
| Ambulance dispatch | Request as `alice@example.com`, dispatch as `owner.rapidresponse@example.com` |
| Lab order → result → record | Order as `alice@example.com`, fulfil as `owner.precisionlab@example.com` |
| Provider verification queue | `admin@carebora.ke` — `nurse.grace` is waiting |
| Vendor approval queue | `admin@carebora.ke`, after applying at `/vendors/apply` |
| Till payment verification | `admin@carebora.ke` → Payments |

---

## Medical records access control

Worth exercising deliberately, since it's the most safety-critical behaviour:

| Who | Result |
|---|---|
| `alice@example.com` reading her own record | **Allowed** — logged as `view` |
| `dr.amina@carebora.ke` (has treated Alice) | **Allowed** — logged as `view` |
| `bob@example.com` (no relationship) | **Denied 403** — logged as `denied` |
| `admin@carebora.ke` with no reason | **Refused 400** — a reason is mandatory |
| `admin@carebora.ke` with `?reason=…` | **Allowed** — logged as `break_glass` with the reason |

Alice can read the whole audit trail at `/records` → Access, including who was
denied. Access can also be granted to any user by email and revoked at any time.

---

## Payments

The seed doesn't hard-code a payment mode — it follows `PAYMENTS_MODE`.

| Mode | How to complete a payment |
|---|---|
| `mpesa_daraja` | Real Daraja STK push. Sandbox sends **no prompt to your phone** — use the sandbox test number `0708374149` and complete it with the simulate helper |
| `till` | Patient enters any M-Pesa-shaped code (8–15 alphanumerics, e.g. `QGJ5T5LAB1`), then `admin@carebora.ke` approves it under Payments |
| `jenga` | Jenga UAT credentials required |

The `/api/v1/payments/mpesa/simulate` helper completes a pending payment without
a real gateway. It is **disabled whenever `NODE_ENV=production`**, so it works
under `npm run dev` but not against a production build.

---

## Re-seeding and cleanup

```bash
npm run db:seed          # safe to re-run; upserts rather than duplicating
```

Re-seed after the slot window lapses — slots are generated for the 30 days
following the seed date, so an old database eventually has none bookable and
booking will fail with `Invalid slot ID`.

Running the Playwright suite leaves behind accounts and businesses named
`*@carebora.test` / `E2E …`. They're harmless, but they clutter the admin queues
and show up as the "nearest vendor" on the public storefront. To clear them:

```bash
npm run db:cleanup
```

It removes only test users, `E2E …` organizations and the orphaned drugs those
vendors invented — never seeded or real data — and recomputes provider ratings
from the reviews that remain. Safe to run repeatedly.

---

## Production

Do not run the seed against production. Create the first real admin directly
against the production database with a strong password, then use the admin UI to
onboard everyone else — providers via the verification queue, businesses via
`/vendors/apply` and the vendor approval queue.
