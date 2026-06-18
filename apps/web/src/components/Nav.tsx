"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HeartPulse, ShoppingCart, CalendarDays, Users, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartProvider";

const LINKS = [
  { href: "/providers", label: "Providers", Icon: Users },
  { href: "/pharmacy", label: "Pharmacy", Icon: ShoppingCart },
];

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const { count } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4 sm:gap-6">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-slate-900">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">Care<span className="text-teal-600">Bora</span></span>
        </Link>

        <div className="ml-2 flex items-center gap-1 text-sm font-medium">
          {LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
                isActive(href) ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          {user && user.role === "patient" && (
            <Link
              href="/appointments"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
                isActive("/appointments") ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Appointments</span>
            </Link>
          )}
          {user && user.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
                isActive("/admin") ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link href="/pharmacy" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="h-9 w-20 rounded-lg skeleton" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link href="/profile" className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 transition hover:bg-slate-200" title="Your profile">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-xs font-bold text-white">
                  {user.fullName.charAt(0)}
                </span>
                <span className="hidden text-sm font-medium text-slate-700 sm:inline">{user.fullName.split(" ")[0]}</span>
              </Link>
              <button onClick={handleLogout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Log out">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
