import type { Metadata } from "next";
import Link from "next/link";
import { Trash2, Smartphone, Globe, Mail } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/structured-data";
import { SUPPORT_EMAIL } from "@/lib/contact";

const PATH = "/delete-account";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description:
    "How to delete your Care Bora account and personal data from the app or the website, what is removed immediately, and what we are legally required to keep.",
  alternates: { canonical: PATH },
};

/**
 * The public account-deletion page. Google Play requires a web address that
 * explains how to delete an account and what happens to the data, and it must
 * work for someone who no longer has the app installed. What it says here has
 * to match what deleteAccount() actually does (packages/core/src/auth/account-deletion.ts).
 */
export default function DeleteAccountPage() {
  const trail: [string, string][] = [["Home", "/"], ["Delete your account", PATH]];
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={breadcrumbSchema(trail)} />
      <Breadcrumbs trail={trail} />

      <header>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-600"><Trash2 className="h-4 w-4" aria-hidden /> Your data</p>
        <h1 className="mt-1.5 text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Delete your Care Bora account</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          You can delete your account and personal data yourself, at any time, from the app or this website. It takes under a minute and cannot be undone.
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-labelledby="how">
        <h2 id="how" className="sr-only">How to delete your account</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Smartphone className="h-6 w-6 text-teal-600" aria-hidden />
          <h3 className="mt-3 font-bold text-slate-900">In the app</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">Open <strong>Account</strong>, choose <strong>Delete account</strong>, enter your password and confirm.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Globe className="h-6 w-6 text-teal-600" aria-hidden />
          <h3 className="mt-3 font-bold text-slate-900">On the website</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600"><Link href="/login" className="font-semibold text-teal-700 hover:underline">Sign in</Link>, open <strong>Profile</strong>, and use <strong>Delete account</strong> at the bottom.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Mail className="h-6 w-6 text-teal-600" aria-hidden />
          <h3 className="mt-3 font-bold text-slate-900">Can&apos;t sign in?</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal-700 hover:underline">{SUPPORT_EMAIL}</a> from the address on your account and we will help. We will confirm it is you first.</p>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="removed">
        <h2 id="removed" className="text-2xl font-extrabold tracking-tight text-slate-900">What is removed straight away</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-slate-600 marker:text-teal-600">
          <li>Your name, email address, phone number and profile photo</li>
          <li>Your password, sign-ins on every device, and any Google or Facebook link</li>
          <li>Your patient profile: address, blood group, emergency contact</li>
          <li>Health information you recorded yourself: allergies, conditions, medicines, vitals, immunisations, and documents you uploaded</li>
          <li>Your notifications, and any access you had granted to your records</li>
          <li>For care providers: your public profile, licence details and uploaded licence documents. You are removed from the directory.</li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="kept">
        <h2 id="kept" className="text-2xl font-extrabold tracking-tight text-slate-900">What we are required to keep</h2>
        <p className="mt-4 leading-relaxed text-slate-600">
          Kenyan law requires medical records and financial records to be kept for a set period, so some records cannot be erased on request.
          These are kept <strong>without your name or contact details</strong>, and are deleted when the retention period ends:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-slate-600 marker:text-teal-600">
          <li>Clinical notes and prescriptions written by your clinicians, and laboratory results</li>
          <li>Records of appointments, orders and payments, including M-Pesa receipt numbers</li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="after">
        <h2 id="after" className="text-2xl font-extrabold tracking-tight text-slate-900">What happens next</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-slate-600 marker:text-teal-600">
          <li>Upcoming appointments are cancelled and the other person is told.</li>
          <li>We email your old address to confirm, so you know it was done.</li>
          <li>You can sign up again later with the same email or phone number; it will be a new, empty account.</li>
          <li>Business accounts (pharmacies, labs, ambulance operators) must be handed over or closed with our team first, because open orders depend on them.</li>
        </ul>
        <p className="mt-6 text-sm text-slate-500">
          More detail is in our <Link href="/privacy" className="font-semibold text-teal-700 hover:underline">privacy policy</Link>.
        </p>
      </section>
    </article>
  );
}
