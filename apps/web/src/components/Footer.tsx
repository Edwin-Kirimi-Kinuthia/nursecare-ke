import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-extrabold text-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="Care Bora Kenya" width={36} height={32} className="h-8 w-auto" />
            Care&nbsp;Bora
          </div>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Kenya&apos;s telehealth platform — verified care, home visits, pharmacy delivery,
            and M-Pesa payments.
          </p>
        </div>
        <div className="flex gap-8 text-sm">
          <div className="space-y-2">
            <div className="font-semibold text-slate-700">Care</div>
            <Link href="/providers" className="block text-slate-500 hover:text-teal-700">Find providers</Link>
            <Link href="/pharmacy" className="block text-slate-500 hover:text-teal-700">Pharmacy</Link>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-slate-700">Developers</div>
            <a href="/api/v1/docs" className="block text-slate-500 hover:text-teal-700">API docs</a>
            <a href="/api/v1/health" className="block text-slate-500 hover:text-teal-700">Status</a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} CareBora. Demo build.
      </div>
    </footer>
  );
}
