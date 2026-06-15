/**
 * Minimal API landing page. CareBora is API-first — there is no end-user web UI
 * in this app; the product surface is the versioned REST API under /api/v1.
 * This page just orients developers and links to the interactive docs.
 */
const LINKS = [
  { href: "/api/v1/docs", label: "Interactive API docs", desc: "Swagger UI — browse and try every endpoint." },
  { href: "/api/v1/openapi", label: "OpenAPI spec", desc: "Machine-readable OpenAPI 3.1 document." },
  { href: "/api/v1/health", label: "Health check", desc: "Service and database status." },
];

const DOMAINS = [
  "Auth & RBAC",
  "Provider marketplace & availability",
  "Teleconsultation (video, chat, notes)",
  "Prescriptions & PDF",
  "M-Pesa payments & ledger",
  "Pharmacy catalogue & orders",
  "Home-based care",
  "Admin & operations",
];

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
        <span className="h-2 w-2 rounded-full bg-teal-500" />
        API-first telehealth platform
      </span>

      <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900">CareBora API</h1>
      <p className="mt-3 text-lg text-slate-600">
        Kenya&apos;s telehealth backend — teleconsultations, verified providers, home-based
        care, a pharmacy marketplace, and M-Pesa payments. All functionality is exposed
        through the versioned REST API at <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm">/api/v1</code>.
      </p>

      <div className="mt-8 grid gap-3">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-teal-400 hover:shadow-sm"
          >
            <div className="font-semibold text-teal-700">{l.label}</div>
            <div className="text-sm text-slate-500">{l.desc}</div>
          </a>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Domains</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {DOMAINS.map((d) => (
            <li key={d} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
