import type { Metadata } from "next";
import type { ServicePageProps } from "@/components/ServicePage";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY } from "@/lib/contact";

/**
 * Content for the public service pages.
 *
 * Every statement here describes something the product actually does. When a
 * feature changes, change the page — a landing page that promises more than the
 * service delivers is worse than no page, for visitors and for ranking.
 *
 * Deliberately absent: lab tests (no laboratory is onboarded yet) and any
 * promised response time, price or coverage area. Add a page only once the
 * service behind it works.
 */

/** When these pages were last checked against the product. Also feeds the sitemap. */
export const SERVICE_PAGES_UPDATED = "2026-10-08";

const EMERGENCY_NUMBERS =
  "In Kenya you can also call 999 or 112.";

export function serviceMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · Care Bora Kenya`, description, url: path, type: "website" },
  };
}

export const ONLINE_DOCTOR: ServicePageProps = {
  path: "/online-doctor-kenya",
  name: "Online doctor consultation",
  eyebrow: "Online doctor in Kenya",
  h1: "See a doctor online in Kenya",
  intro:
    "Book a video consultation with a doctor whose practice licence has been checked, pay with M-Pesa, and talk from your phone or laptop. No travel, no queue, and nothing to install.",
  schemaDescription:
    "Video consultations with doctors whose practice licences have been checked, booked and paid for with M-Pesa.",
  cta: { label: "Find a doctor", href: "/providers" },
  stepsHeading: "How an online consultation works",
  steps: [
    {
      title: "Choose a doctor",
      body: "Browse the provider directory. Each profile shows the doctor's specialty, languages, location, consultation fee and reviews from patients they have seen. You can filter by specialty.",
    },
    {
      title: "Pick a time and pay",
      body: "Choose an open time and pay the consultation fee with M-Pesa. If the doctor is available, your booking is confirmed straight away. If they are with another patient, they confirm it first and you pay once they have.",
    },
    {
      title: "Join the video call",
      body: "At your time, open Care Bora and join the call from your browser. You can also message the doctor during the consultation. Care Bora does not record the call.",
    },
    {
      title: "Keep your records",
      body: "Notes and any prescription from your visit are saved in your medical record so you can find them later. Where the doctor thinks it is appropriate, you can also receive a sick-off sheet, or use a prescription to order from the pharmacy where it is stocked.",
    },
  ],
  sections: [
    {
      heading: "What an online consultation is good for",
      paragraphs: [
        "Talking to a doctor by video works well for many everyday concerns, and for conversations that don't need a physical examination.",
      ],
      bullets: [
        "Advice and assessment for common, short-term illnesses",
        "Follow-up after treatment, and reviewing medication you already take",
        "Talking through test results or a diagnosis you have already received",
        "Getting a sick-off sheet when you have been unwell",
        "A second opinion, or a simple question you would rather ask than guess at",
      ],
    },
    {
      heading: "What it can't do",
      paragraphs: [
        "A video call cannot replace an examination, tests or emergency care. If your doctor decides you need to be examined in person, have a laboratory test, or go to a hospital, they will tell you so. That is a good outcome of the consultation, not a failure of it.",
      ],
    },
    {
      heading: "Who you will be seeing",
      paragraphs: [
        "Every provider submits their practice licence number and a copy of their licence, and our team reviews it before they appear in the directory. You can read exactly how this works on our page about how we verify providers, and you can check any clinician yourself on the public register of their regulator.",
      ],
    },
    {
      heading: "What it costs",
      paragraphs: [
        "Each provider sets their own consultation fee, and it is shown on their profile before you book. You pay by M-Pesa; no card is needed and there is no subscription.",
      ],
    },
  ],
  safety: {
    title: "Not for emergencies",
    body: `If you have chest pain, difficulty breathing, severe bleeding, heavy bleeding in pregnancy, signs of a stroke, or someone has lost consciousness, do not book a consultation. Call the ambulance line now or go to the nearest hospital. ${EMERGENCY_NUMBERS}`,
  },
  faqs: [
    {
      q: "Is an online consultation as good as seeing a doctor in person?",
      a: "For many everyday concerns it is a convenient way to get advice, an assessment or a prescription. It cannot replace an examination when one is needed, and your doctor will tell you if you should be seen in person or have tests.",
    },
    {
      q: "Do I need to download an app?",
      a: "No. Care Bora works in the browser on your phone or computer. You will be asked to allow your camera and microphone for the video call.",
    },
    {
      q: "How do I pay?",
      a: "With M-Pesa. You receive a payment prompt on your phone and confirm it with your M-Pesa PIN. We never see or store your PIN.",
    },
    {
      q: "Will I get a prescription?",
      a: "If the doctor decides medicine is appropriate, they issue the prescription through Care Bora and it is saved in your records. Prescription-only medicines still need a valid prescription when you order them.",
    },
    {
      q: "Is my consultation private?",
      a: "Yes. The video call is between you and your provider and is not recorded by Care Bora. Our privacy policy explains how we handle the rest of your information.",
    },
  ],
  related: [
    { label: "Sick-off sheet online", href: "/sick-off-sheet-online-kenya", blurb: "How a doctor can issue a sick-off sheet after assessing you." },
    { label: "Home visits", href: "/home-visits-nairobi", blurb: "A nurse, physiotherapist or doctor who comes to you." },
    { label: "How we verify providers", href: "/how-we-verify-providers", blurb: "What we check before a clinician is listed." },
    { label: "Ambulance line", href: "/ambulance-nairobi", blurb: "For emergencies, call rather than book." },
  ],
  updated: SERVICE_PAGES_UPDATED,
};

export const SICK_OFF: ServicePageProps = {
  path: "/sick-off-sheet-online-kenya",
  name: "Sick-off sheet",
  eyebrow: "Medical certificate",
  h1: "Get a sick-off sheet online in Kenya",
  intro:
    "If you are unwell and your employer or school needs a note, a doctor can assess you on a video call and, where they judge it appropriate, give you a signed sick-off sheet as a PDF.",
  schemaDescription:
    "After a video consultation, a doctor can issue a signed sick-off sheet (medical certificate) where it is clinically appropriate.",
  cta: { label: "Book a consultation", href: "/providers" },
  stepsHeading: "How you get a sick-off sheet",
  steps: [
    {
      title: "Book a consultation",
      body: "Choose a doctor from the directory, pick a time and pay the consultation fee with M-Pesa.",
    },
    {
      title: "Be assessed",
      body: "Tell the doctor what you are experiencing, when it started, and what your work or school requires. They will ask questions, as they would in a clinic.",
    },
    {
      title: "The doctor decides",
      body: "A sick-off sheet is part of your treatment, not something you purchase. If the doctor concludes you should rest, they record the number of days they consider necessary.",
    },
    {
      title: "Download it",
      body: "Your signed sick-off sheet is saved in your medical record as a PDF, ready to send to your employer or school.",
    },
  ],
  sections: [
    {
      heading: "What the doctor needs from you",
      bullets: [
        "An honest account of your symptoms and when they began",
        "Anything relevant to your health — conditions, allergies, medicines you take",
        "What your employer or school asks for, so the right information is on the sheet",
      ],
    },
    {
      heading: "Will my employer or school accept it?",
      paragraphs: [
        "That is their decision. Some organisations accept a signed PDF; others ask for a particular format or a stamp from a facility. If you are unsure, ask them what they require before you book, so you know what to ask your doctor for.",
      ],
    },
    {
      heading: "What we don't do",
      paragraphs: [
        "A doctor can only certify what they have assessed. We do not issue sick-off sheets without an assessment, and the number of days is the doctor's clinical judgement, not something you choose. If you ask for a document through our Contact page instead, a licensed clinician reviews the request and most requests need a consultation first.",
      ],
    },
  ],
  safety: {
    title: "If you are seriously unwell",
    body: `Don't wait for a certificate. If you have severe pain, difficulty breathing, heavy bleeding or have collapsed, get urgent care now. ${EMERGENCY_NUMBERS}`,
  },
  faqs: [
    {
      q: "Can I get a sick-off sheet without seeing a doctor?",
      a: "No. A sick-off sheet is issued by a doctor who has assessed you, so there is always a consultation first.",
    },
    {
      q: "Can I get one for an illness I had last week?",
      a: "That depends on what the doctor can properly certify after assessing you. Be honest about the dates; the doctor decides what they are able to write, and it is not guaranteed.",
    },
    {
      q: "How much does it cost?",
      a: "The doctor's consultation fee is shown on their profile before you book, and you pay it with M-Pesa when you book.",
    },
    {
      q: "How do I get the document?",
      a: "It appears in your medical record on Care Bora as a PDF that you can download and send on.",
    },
  ],
  related: [
    { label: "See a doctor online", href: "/online-doctor-kenya", blurb: "How a video consultation works, step by step." },
    { label: "Request a medical document", href: "/contact", blurb: "Ask for a report or a form through our Contact page." },
  ],
  updated: SERVICE_PAGES_UPDATED,
};

export const HOME_VISITS: ServicePageProps = {
  path: "/home-visits-nairobi",
  name: "Home visits",
  eyebrow: "Home-based care",
  h1: "Request a home visit from a nurse, physiotherapist or doctor",
  intro:
    "Ask for a clinician to come to you. Tell us what you need and where you are, we match you to a provider, and you pay by M-Pesa to confirm the visit.",
  schemaDescription:
    "Request a nurse, physiotherapist or doctor to visit you at home. Availability depends on your location and on which providers can reach you.",
  cta: { label: "Request a home visit", href: "/home-visits" },
  stepsHeading: "How a home visit works",
  steps: [
    {
      title: "Say what you need",
      body: "Choose the kind of clinician — nurse, physiotherapist or doctor — and describe what the visit is for. You can suggest a time that suits you.",
    },
    {
      title: "Give your address and a phone number",
      body: "We ask for your county, address and a number the provider can reach you on, because they will need to find you and may call before they arrive.",
    },
    {
      title: "We match a provider",
      body: "Our team assigns a provider and tells you who they are, when they are expected and what the visit costs.",
    },
    {
      title: "Pay to confirm",
      body: "You pay the visit fee with M-Pesa, which confirms it. The provider then visits you at the address you gave.",
    },
  ],
  sections: [
    {
      heading: "What home visits are often used for",
      paragraphs: ["What a provider can do depends on who is assigned, but typical reasons include:"],
      bullets: [
        "Wound care and dressings",
        "Injections and giving medication as prescribed",
        "Follow-up after surgery or a hospital stay",
        "Physiotherapy and rehabilitation",
        "Caring for an older person or someone who cannot easily travel",
      ],
    },
    {
      heading: "Where we can visit",
      paragraphs: [
        "Availability depends on where you are and which providers are able to reach you. That is why the request asks for your county and address.",
      ],
    },
    {
      heading: "Before the visit",
      paragraphs: [
        "Have your medicines and any previous medical papers to hand, make sure someone can let the provider in, and keep your phone on so they can reach you.",
      ],
    },
  ],
  safety: {
    title: "A home visit is not an emergency service",
    body: `If someone is in danger — struggling to breathe, bleeding heavily, unconscious or in severe pain — call the ambulance line now. ${EMERGENCY_NUMBERS}`,
  },
  faqs: [
    {
      q: "How much does a home visit cost?",
      a: "The fee is set by the provider who is assigned and you see it before you pay. You pay by M-Pesa only once a provider has been assigned.",
    },
    {
      q: "Can I choose my provider?",
      a: "You choose the type of clinician. Our team assigns the provider, based on who can reach you.",
    },
    {
      q: "Do I need an account?",
      a: "Yes. You sign in so the request, the payment and any records from the visit are kept together for you.",
    },
    {
      q: "Can I get a video consultation instead?",
      a: "Yes, if the problem doesn't need the clinician to be with you. Many concerns can be handled by video and that is usually quicker.",
    },
  ],
  related: [
    { label: "See a doctor online", href: "/online-doctor-kenya", blurb: "A video consultation, without the travel." },
    { label: "Ambulance line", href: "/ambulance-nairobi", blurb: "For emergencies, call rather than request." },
  ],
  updated: SERVICE_PAGES_UPDATED,
};

export const AMBULANCE: ServicePageProps = {
  path: "/ambulance-nairobi",
  name: "Ambulance line",
  eyebrow: "Emergency",
  h1: `Need an ambulance? Call ${AMBULANCE_PHONE_DISPLAY}`,
  intro:
    "In an emergency, call the ambulance line rather than filling in a form. It connects you with our dispatch team, who need to know where you are and what has happened.",
  schemaDescription:
    "A dedicated ambulance phone line for emergencies, and an in-app request for non-urgent transport.",
  cta: { label: `Call ${AMBULANCE_PHONE_DISPLAY}`, href: `tel:${AMBULANCE_PHONE}` },
  stepsHeading: "What to do when you call",
  steps: [
    {
      title: "Call the ambulance line",
      body: `Dial ${AMBULANCE_PHONE_DISPLAY}. Speak clearly and stay calm; the person on the line is there to help.`,
    },
    {
      title: "Say where you are",
      body: "Give the area, the nearest landmark or building, and the road if you can. A precise location is the most useful thing you can give.",
    },
    {
      title: "Say what has happened",
      body: "Describe what happened, how many people are hurt or ill, and whether they are conscious and breathing. Give a phone number we can reach you on.",
    },
    {
      title: "Stay reachable",
      body: "Keep your phone free and, if you can, have someone wait at the gate or road to guide the crew in.",
    },
  ],
  sections: [
    {
      heading: "When to call straight away",
      bullets: [
        "Chest pain, or difficulty breathing",
        "Severe bleeding that will not stop",
        "Someone who is unconscious or not responding",
        "A seizure, or signs of a stroke — a drooping face, a weak arm, slurred speech",
        "A serious injury, or a road accident",
        "Heavy bleeding in pregnancy, or complications in labour",
      ],
    },
    {
      heading: "If no one answers",
      paragraphs: [
        `Don't wait. Call 999 or 112, which are Kenya's national emergency numbers, or get the person to the nearest hospital. ${EMERGENCY_NUMBERS}`,
      ],
    },
    {
      heading: "Non-urgent transport and in-app requests",
      paragraphs: [
        "If it is not an emergency, you can also sign in and send an ambulance request with the pickup details, then follow its status. Payment for the service is requested by M-Pesa after it is completed. For anything urgent, calling is always faster.",
      ],
    },
  ],
  faqs: [
    {
      q: "How quickly will an ambulance arrive?",
      a: "We can't promise a time. It depends on where you are, traffic and which crew is free. The most useful thing you can do is give an exact location and keep your phone free.",
    },
    {
      q: "Can I request an ambulance online instead?",
      a: "Yes, after signing in, and you can follow the status of your request. But in an emergency, call the line — it is quicker than typing.",
    },
    {
      q: "Is this a replacement for the national emergency numbers?",
      a: "No. Kenya's national emergency numbers are 999 and 112, and you should use them if you can't get through to us.",
    },
  ],
  related: [
    { label: "See a doctor online", href: "/online-doctor-kenya", blurb: "For concerns that aren't an emergency." },
    { label: "Home visits", href: "/home-visits-nairobi", blurb: "A clinician who comes to you." },
  ],
  updated: SERVICE_PAGES_UPDATED,
};
