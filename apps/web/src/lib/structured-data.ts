import { EMERGENCY_PHONE } from "@/lib/contact";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

/**
 * schema.org descriptions of the business.
 *
 * These are what let a search engine understand CareBora as a *medical
 * organisation operating in Kenya* offering specific named services, rather
 * than as an unclassified website. That distinction drives rich results and
 * local/health-intent matching, which plain page copy alone won't earn.
 */

const SERVICES = [
  {
    name: "Teleconsultation",
    description: "Secure video and chat consultations with verified Kenyan doctors, nurses and physiotherapists.",
  },
  {
    name: "Emergency ambulance",
    description: "24/7 ambulance dispatch — call directly or request in-app and the nearest available crew is sent.",
  },
  {
    name: "Yellow fever and travel certificates",
    description: "Yellow fever vaccination certificates for international travel, fitness-to-fly and embassy clearance certificates.",
  },
  {
    name: "Medical forms and reports",
    description: "School admission, employment and insurance medical forms completed, signed and stamped by verified clinicians.",
  },
  {
    name: "Sick-off sheet",
    description: "Online consultation with a signed sick-off sheet (medical certificate) for work or school.",
  },
  {
    name: "Home-based care",
    description: "Nurses and physiotherapists who visit patients at home for treatment, dressing and rehabilitation.",
  },
  {
    name: "Pharmacy delivery",
    description: "Prescription and over-the-counter medication from the nearest licensed pharmacy, delivered to your door.",
  },
  {
    name: "Laboratory tests",
    description: "Book laboratory tests at accredited diagnostic labs and receive results in your medical record.",
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
      "Kenya's telehealth platform: video consultations with verified doctors and nurses, emergency ambulance dispatch, home-based care, medical reports and certificates, laboratory tests, and pharmacy delivery — paid for with M-Pesa.",
    slogan: "Quality care, made accessible.",
    email: "customercare@carebora.co.ke",
    telephone: EMERGENCY_PHONE,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
    areaServed: { "@type": "Country", name: "Kenya" },
    availableLanguage: ["en", "sw"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: EMERGENCY_PHONE,
        contactType: "emergency",
        areaServed: "KE",
        availableLanguage: ["en", "sw"],
      },
      {
        "@type": "ContactPoint",
        telephone: EMERGENCY_PHONE,
        email: "customercare@carebora.co.ke",
        contactType: "customer support",
        areaServed: "KE",
      },
    ],
    sameAs: [
      "https://www.facebook.com/share/1GneyXiB15/",
      "https://www.instagram.com/carebora_ke/",
    ],
    availableService: SERVICES.map((s) => ({
      "@type": "MedicalProcedure",
      name: s.name,
      description: s.description,
    })),
  };
}

/** The site, with a search action so Google can offer a sitelinks search box. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "en-KE",
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/providers?specialty={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Questions people actually type before booking. Eligible for FAQ rich results,
 * and each answer targets a real search intent the homepage copy also covers.
 */
export function faqSchema() {
  const faqs = [
    {
      q: "Can I get a yellow fever certificate for travel?",
      a: "Yes. Verified clinicians on CareBora issue yellow fever vaccination certificates required for international travel, as well as fitness-to-fly and embassy clearance certificates.",
    },
    {
      q: "Can you fill and stamp school admission medical forms?",
      a: "Yes. Upload the form and a verified clinician will complete, sign and stamp it — school admission, employment and insurance medical forms are all supported.",
    },
    {
      q: "How do I get an ambulance in an emergency?",
      a: `Call ${EMERGENCY_PHONE} and our dispatch team will send the nearest available crew, or request an ambulance in the app and track it to your door.`,
    },
    {
      q: "Can I get a sick-off sheet online?",
      a: "Yes. After a video consultation, the doctor can issue a signed sick-off sheet (medical certificate) for work or school, downloadable as a PDF.",
    },
    {
      q: "How do I pay for care on CareBora?",
      a: "Payments are made with M-Pesa. You receive an STK push on your phone and confirm with your M-Pesa PIN — no cards required.",
    },
    {
      q: "How does pharmacy delivery work?",
      a: "Order medication and CareBora matches you to the nearest licensed pharmacy stocking it, then delivers to your door. Prescription-only medicines require a valid prescription.",
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": absoluteUrl("/#faq"),
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
