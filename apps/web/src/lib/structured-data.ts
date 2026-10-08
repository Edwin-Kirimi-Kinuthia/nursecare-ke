import { AMBULANCE_PHONE, SUPPORT_PHONE, SUPPORT_EMAIL } from "@/lib/contact";
import { SITE_NAME, SITE_URL, absoluteUrl, tidy } from "@/lib/seo";

/**
 * schema.org descriptions of the business.
 *
 * Everything here has to be true of the product, and visible on the page it
 * describes. Structured data that claims more than the site delivers is worse
 * than none: it can draw a manual action, and on a health site a false claim
 * ("we issue yellow fever certificates") sends someone to rely on something
 * that doesn't exist. When a feature changes, change it here too.
 */
const SERVICES = [
  {
    name: "Online doctor consultation",
    path: "/online-doctor-kenya",
    description: "Video consultations with doctors whose practice licences have been checked, booked and paid for with M-Pesa.",
  },
  {
    name: "Sick-off sheet",
    path: "/sick-off-sheet-online-kenya",
    description: "After a consultation, the doctor can issue a signed sick-off sheet (medical certificate) where it is clinically appropriate.",
  },
  {
    name: "Ambulance line",
    path: "/ambulance-nairobi",
    description: "A dedicated ambulance phone line for emergencies, and an in-app request for non-urgent transport.",
  },
  {
    name: "Home visits",
    path: "/home-visits-nairobi",
    description: "Request a nurse, physiotherapist or doctor to visit you at home.",
  },
  {
    name: "Online pharmacy",
    path: "/pharmacy",
    description: "Order medication from participating pharmacies, delivered to you. Prescription-only medicines need a valid prescription.",
  },
];

/** The organisation itself — the anchor entity every other node references. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    "@id": absoluteUrl("/#organization"),
    name: SITE_NAME,
    alternateName: "CareBora",
    url: SITE_URL,
    logo: absoluteUrl("/logo-full.png"),
    image: absoluteUrl("/og-image.png"),
    description:
      "Care Bora is a Kenyan telehealth platform: video consultations with licence-checked doctors, sick-off sheets, home visits, laboratory tests, an ambulance line and pharmacy delivery, paid for with M-Pesa.",
    slogan: "Quality care, made accessible.",
    email: SUPPORT_EMAIL,
    telephone: SUPPORT_PHONE,
    address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressCountry: "KE" },
    areaServed: { "@type": "Country", name: "Kenya" },
    availableLanguage: ["en"],
    contactPoint: [
      { "@type": "ContactPoint", telephone: AMBULANCE_PHONE, contactType: "emergency", areaServed: "KE" },
      { "@type": "ContactPoint", telephone: SUPPORT_PHONE, email: SUPPORT_EMAIL, contactType: "customer support", areaServed: "KE" },
    ],
    sameAs: [
      "https://www.facebook.com/share/1GneyXiB15/",
      "https://www.instagram.com/carebora_ke/",
    ],
    // Services, not procedures: an ambulance line or a pharmacy isn't a
    // MedicalProcedure, and mistyping them muddies what the entity is.
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Care Bora services",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, description: s.description, url: absoluteUrl(s.path) },
      })),
    },
  };
}

/** The site itself. No SearchAction: there is no site search to advertise. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "en-KE",
    publisher: { "@id": absoluteUrl("/#organization") },
  };
}

export interface Faq { q: string; a: string }

/**
 * The homepage FAQ. Rendered visibly on the page *and* emitted as FAQPage
 * markup from this one list — Google requires the markup to match what a
 * visitor can read, so they must never be maintained separately.
 */
export const HOME_FAQS: Faq[] = [
  {
    q: "How does an online consultation work?",
    a: "Browse providers, choose a time that suits you and pay the consultation fee with M-Pesa. At your time you join a private video call from your phone or computer — there is nothing to install. If a provider is busy with another patient, they confirm your booking first and you pay once they have.",
  },
  {
    q: "Do I pay before I see the doctor?",
    a: "Yes. The consultation fee is paid when your booking is confirmed, and the doctor can start your consultation once it has been paid.",
  },
  {
    q: "Are the doctors on Care Bora really qualified?",
    a: "Every provider submits their practice licence number and a copy of their licence, and our team reviews it before they appear on the site. You can also check any clinician yourself on the public register of their regulator — the Kenya Medical Practitioners and Dentists Council for doctors, or the Nursing Council of Kenya for nurses.",
  },
  {
    q: "Can I get a sick-off sheet online?",
    a: "After a video consultation, the doctor can issue a signed sick-off sheet (medical certificate) for work or school, downloadable as a PDF. Whether one is appropriate is the doctor's clinical decision.",
  },
  {
    q: "Can I request a medical report or a form completed?",
    a: "Yes. Use the Contact page to request a medical report, or a school, employment or insurance form. A licensed clinician reviews each request, and some will need a consultation first.",
  },
  {
    q: "How do I reach an ambulance?",
    a: `Call our ambulance line on ${AMBULANCE_PHONE.replace("+254", "0")}, or send a request in the app and follow its status. In a life-threatening emergency, call the line first rather than filling in a form.`,
  },
  {
    q: "Is Care Bora for emergencies?",
    a: "No. An online consultation can't replace emergency care. For chest pain, difficulty breathing, severe bleeding, heavy bleeding in pregnancy, or loss of consciousness, call the ambulance line or go to the nearest hospital straight away.",
  },
  {
    q: "How do I pay?",
    a: "With M-Pesa. You receive a payment prompt on your phone and confirm it with your M-Pesa PIN. We never see or store your PIN, and no card is needed.",
  },
];

export function faqSchema(faqs: Faq[] = HOME_FAQS, path = "/") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": absoluteUrl(`${path === "/" ? "" : path}#faq`),
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Breadcrumbs: [name, path] pairs from the home page down. */
export function breadcrumbSchema(trail: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

/** A service page: what it is, who provides it, and that it is available in Kenya. */
export function serviceSchema(opts: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": absoluteUrl(`${opts.path}#service`),
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    provider: { "@id": absoluteUrl("/#organization") },
    areaServed: { "@type": "Country", name: "Kenya" },
  };
}

interface ProviderForSchema {
  userId: string;
  specialty: string | null;
  subSpecialty: string | null;
  bio: string | null;
  town: string | null;
  county: string | null;
  languages: string[];
  consultationFeeKes: number | null;
  licenceBody: string | null;
  ratingAvg: number;
  ratingCount: number;
  user: { fullName: string; avatarUrl: string | null };
}

/**
 * A clinician's profile as a Physician. Only fields we actually hold are
 * emitted, and a rating only once there are real reviews — a made-up or
 * zero-review aggregateRating is exactly what review-markup policies prohibit.
 */
export function physicianSchema(p: ProviderForSchema) {
  const url = absoluteUrl(`/providers/${p.userId}`);
  const town = tidy(p.town);
  const county = tidy(p.county);
  const place = [town, county].filter(Boolean).join(", ");
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    "@id": `${url}#physician`,
    name: p.user.fullName,
    url,
    ...(p.user.avatarUrl && !p.user.avatarUrl.startsWith("data:")
      ? { image: p.user.avatarUrl.startsWith("/") ? absoluteUrl(p.user.avatarUrl) : p.user.avatarUrl }
      : {}),
    ...(p.bio ? { description: p.bio } : {}),
    ...([p.specialty, p.subSpecialty].filter(Boolean).length
      ? { medicalSpecialty: [p.specialty, p.subSpecialty].filter(Boolean) }
      : {}),
    ...(p.languages.length ? { knowsLanguage: p.languages } : {}),
    ...(place ? { address: { "@type": "PostalAddress", addressLocality: town || county, addressRegion: county, addressCountry: "KE" } } : {}),
    areaServed: { "@type": "Country", name: "Kenya" },
    ...(p.consultationFeeKes ? { priceRange: `KES ${p.consultationFeeKes.toLocaleString("en-KE")}` } : {}),
    memberOf: { "@id": absoluteUrl("/#organization") },
    ...(p.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount, bestRating: 5, worstRating: 1 } }
      : {}),
  };
}

/** The directory as a list, so the page declares what it contains. */
export function providerListSchema(providers: { userId: string; user: { fullName: string }; specialty: string | null }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Care Bora providers",
    itemListElement: providers.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/providers/${p.userId}`),
      name: p.specialty ? `${p.user.fullName} — ${p.specialty}` : p.user.fullName,
    })),
  };
}
