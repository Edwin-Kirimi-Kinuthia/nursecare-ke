import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Care Bora Kenya collects, uses, and protects your personal and health information, including payments, AI symptom checks, and sign-in with Google or Facebook.",
  alternates: { canonical: "/privacy" },
};

const EFFECTIVE_DATE = "October 7, 2026";

const SECTIONS = [
  { id: "collect", label: "Information we collect" },
  { id: "use", label: "How we use it" },
  { id: "share", label: "Who we share it with" },
  { id: "ai", label: "The AI symptom checker" },
  { id: "retention", label: "How long we keep it" },
  { id: "security", label: "Security" },
  { id: "rights", label: "Your rights" },
  { id: "cookies", label: "Cookies" },
  { id: "children", label: "Children's privacy" },
  { id: "transfers", label: "International transfers" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-2 text-sm font-semibold text-teal-600">
        <ShieldCheck className="h-4 w-4" /> Legal
      </div>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Effective {EFFECTIVE_DATE}</p>

      <p className="mt-6 leading-relaxed text-slate-600">
        Care Bora Kenya (&ldquo;CareBora&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a telehealth platform
        connecting patients in Kenya with doctors, nurses, physiotherapists, pharmacies, diagnostic labs, and
        ambulance operators. This policy explains what personal and health information we collect through our
        website and app, why we collect it, who we share it with, and the choices and rights you have. It&apos;s
        written to reflect what CareBora actually does, not a generic template.
      </p>

      <nav className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="text-sm font-semibold text-slate-700">On this page</div>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-teal-700 hover:underline">{s.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-10">
        <Section id="collect" title="Information we collect">
          <p>We collect the following categories of information:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Account information:</strong> full name, email address, phone number, password (we never
              store it in plain text — see <a href="#security" className="text-teal-700 hover:underline">Security</a>),
              and your role (patient, doctor, nurse, physiotherapist, pharmacy, vendor).
            </li>
            <li>
              <strong>Health information:</strong> anything you or a treating clinician records in the course of
              care — clinical notes, allergies, conditions, medications, vital signs, immunizations, prescriptions,
              lab orders and results, uploaded medical documents, and signed certificates (e.g. sick-off sheets,
              travel/vaccination certificates). This is sensitive &ldquo;special category&rdquo; data under
              Kenya&apos;s Data Protection Act, 2019, and we handle it accordingly.
            </li>
            <li>
              <strong>Location information:</strong> for ambulance dispatch, the pickup coordinates you provide for
              that request; for finding nearby pharmacies and labs, the county/town you select or share so we can
              rank options by distance.
            </li>
            <li>
              <strong>Payment information:</strong> your M-Pesa phone number and the transaction/receipt reference
              Safaricom returns to us. Payments are processed directly by Safaricom through the M-Pesa Daraja
              API — we never see or store your M-Pesa PIN, and we don&apos;t handle card numbers.
            </li>
            <li>
              <strong>Files you upload:</strong> professional licence documents (providers/vendors), prescription
              images, and medical documents or lab result files you or your clinician add to your record.
            </li>
            <li>
              <strong>Communications:</strong> messages sent during a consultation, and any review or rating you leave.
            </li>
            <li>
              <strong>If you sign in with Google or Facebook:</strong> the name, email address, and account
              identifier that provider shares with us when you authorize it — nothing else from that account.
            </li>
            <li>
              <strong>Technical data:</strong> IP address, browser/device information, and session cookies used to
              keep you signed in (see <a href="#cookies" className="text-teal-700 hover:underline">Cookies</a>).
            </li>
          </ul>
        </Section>

        <Section id="use" title="How we use it">
          <ul className="list-disc space-y-2 pl-5">
            <li>To create and secure your account, and verify your identity when you sign in.</li>
            <li>To let you book, conduct, and document consultations, home visits, lab tests, and ambulance requests.</li>
            <li>To process payments and reconcile them against the service you paid for.</li>
            <li>To route pharmacy orders and home-visit/ambulance requests to the nearest appropriate provider.</li>
            <li>To send booking, payment, and account notifications by email and SMS.</li>
            <li>To verify healthcare providers&apos; and vendors&apos; professional credentials before they can accept patients.</li>
            <li>To investigate disputes, enforce our terms, and meet legal and regulatory obligations.</li>
            <li>To maintain an audit trail of who accessed a medical record and when.</li>
          </ul>
          <p>We do not sell your personal information, and we do not use your health information for advertising.</p>
        </Section>

        <Section id="share" title="Who we share it with">
          <p>
            We share information only as needed to provide the service, with these categories of recipients:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>The clinician or vendor you engage with</strong> — a doctor, nurse, physiotherapist, pharmacy, lab, or ambulance operator sees what&apos;s necessary to provide your care or fulfil your order.</li>
            <li><strong>Safaricom</strong> (M-Pesa Daraja), to complete and confirm your payment.</li>
            <li><strong>Resend</strong>, for transactional email (booking confirmations, receipts, verification codes).</li>
            <li><strong>Africa&apos;s Talking</strong>, for SMS notifications, when enabled.</li>
            <li><strong>LiveKit</strong>, to establish your video/audio consultation connection. Consultations are not recorded or stored by CareBora.</li>
            <li><strong>Our AI symptom-checker provider</strong> — see <a href="#ai" className="text-teal-700 hover:underline">below</a>.</li>
            <li><strong>Google or Facebook</strong>, only if you choose to sign in that way, to confirm your identity.</li>
            <li><strong>Our hosting and database providers</strong> (Vercel and Neon), who store and run the platform on our behalf under contract, and cannot access your data except to operate the infrastructure.</li>
            <li><strong>Regulators or law enforcement</strong>, only where Kenyan law requires it.</li>
          </ul>
        </Section>

        <Section id="ai" title="The AI symptom checker">
          <p>
            If you use the symptom checker, the text you type is sent to a third-party AI model (by default a
            Hugging Face-hosted model, with Anthropic as a fallback if configured) to generate a suggested
            urgency level and specialty. The AI assistant is not a doctor and never gives a diagnosis — every
            response carries that disclaimer. Please avoid typing your name or other identifying details into the
            symptom box; the feature is designed to work from symptoms alone.
          </p>
        </Section>

        <Section id="retention" title="How long we keep it">
          <p>
            We keep account and health records for as long as your account is active, plus a period afterward to
            meet Kenyan medical-record retention and tax/accounting obligations. If you ask us to delete your
            account, we remove what we can immediately and retain only what we&apos;re legally required to for the
            applicable retention period, after which it is deleted.
          </p>
        </Section>

        <Section id="security" title="Security">
          <ul className="list-disc space-y-2 pl-5">
            <li>Passwords are hashed with scrypt — we cannot read your password, and neither can anyone who gains access to our database.</li>
            <li>All traffic to CareBora is encrypted in transit (HTTPS).</li>
            <li>Session cookies are <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">httpOnly</code>, so they can&apos;t be read by page scripts.</li>
            <li>Access to medical records is role-based: only you, your treating clinician, and anyone you explicitly grant access to can view them.</li>
            <li>Every access to a patient&apos;s medical record is logged, including who viewed it and when.</li>
          </ul>
        </Section>

        <Section id="rights" title="Your rights">
          <p>Under Kenya&apos;s Data Protection Act, 2019, you have the right to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Know what personal data we hold about you, and request a copy of it.</li>
            <li>Ask us to correct inaccurate or outdated information.</li>
            <li>Ask us to delete your data, subject to the retention obligations described above.</li>
            <li>Object to, or ask us to restrict, certain processing.</li>
            <li>Receive your data in a portable format.</li>
            <li>Lodge a complaint with the Office of the Data Protection Commissioner (ODPC) Kenya if you believe we&apos;ve mishandled your data.</li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a href="mailto:customercare@carebora.co.ke" className="text-teal-700 hover:underline">customercare@carebora.co.ke</a>.
            We&apos;ll respond within the time required by law.
          </p>
        </Section>

        <Section id="cookies" title="Cookies">
          <p>
            We use only the cookies needed to keep you signed in (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cb_access</code>{" "}
            and <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cb_refresh</code>) and, briefly during
            Google/Facebook sign-in, a short-lived cookie to prevent cross-site request forgery. We don&apos;t use
            advertising or cross-site tracking cookies.
          </p>
        </Section>

        <Section id="children" title="Children's privacy">
          <p>
            CareBora is intended for use by adults, or by a parent/guardian booking and managing care on behalf of
            a child. We don&apos;t knowingly collect account information directly from children without a
            guardian&apos;s involvement.
          </p>
        </Section>

        <Section id="transfers" title="International transfers">
          <p>
            Some of the providers above (our AI symptom-checker provider, Google, Facebook, and our hosting
            provider) may process data outside Kenya. Where that happens, we rely on those providers&apos;
            contractual and technical safeguards to protect your information to a standard consistent with
            Kenyan law.
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            We&apos;ll update the effective date at the top of this page whenever we make a material change, and
            where appropriate we&apos;ll notify you directly (for example, by email).
          </p>
        </Section>

        <Section id="contact" title="Contact us">
          <p>
            Questions about this policy or your data? Reach us at{" "}
            <a href="mailto:customercare@carebora.co.ke" className="text-teal-700 hover:underline">customercare@carebora.co.ke</a>{" "}
            or <a href="mailto:admin@carebora.co.ke" className="text-teal-700 hover:underline">admin@carebora.co.ke</a>, Nairobi, Kenya.
          </p>
          <p>
            See also our{" "}
            <Link href="/" className="text-teal-700 hover:underline">homepage</Link> for how to reach us by phone.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
