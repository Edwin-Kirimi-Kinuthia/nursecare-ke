"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart, CalendarDays, Users, LogOut, LayoutDashboard, Home, Brain, Pill, Siren, Building2, FileText, FlaskConical, Menu, X, User as UserIcon, Stethoscope, MessageSquare, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartProvider";
import NotificationBell from "@/components/NotificationBell";
import type { PublicUser } from "@carebora/shared";

interface NavLink {
  href: string;
  label: string;
  Icon: typeof Users;
  /** Accent used for the active state — emergency routes read red, AI reads violet. */
  tone?: "teal" | "rose" | "violet";
}

/** Always visible, signed in or not — these are the two main ways in. */
const PUBLIC_LINKS: NavLink[] = [
  { href: "/providers", label: "Find providers", Icon: Users },
  { href: "/pharmacy", label: "Pharmacy", Icon: Pill },
  { href: "/contact", label: "Contact us", Icon: MessageSquare },
];

function careLinksFor(user: PublicUser | null): NavLink[] {
  if (!user) return [];
  // Receiving care is open to every account, so these are not gated on role —
  // a doctor or an admin booking a consultation for themselves needs the same
  // links as a patient, and the API now allows exactly that.
  const links: NavLink[] = [
    { href: "/appointments", label: "Appointments", Icon: CalendarDays },
    { href: "/home-visits", label: "Home visits", Icon: Home },
    { href: "/ambulance", label: "Ambulance", Icon: Siren, tone: "rose" },
    { href: "/labs", label: "Lab tests", Icon: FlaskConical },
    { href: "/records", label: "My records", Icon: FileText },
    { href: "/ai", label: "Symptom checker", Icon: Brain, tone: "violet" },
  ];
  // Role still decides the extra powers an account has.
  if (user.role === "vendor") links.push({ href: "/vendor", label: "Vendor dashboard", Icon: Building2 });
  if (user.role === "admin") links.push({ href: "/admin", label: "Admin dashboard", Icon: LayoutDashboard });
  return links;
}

const TONE_ACTIVE: Record<string, string> = {
  teal: "bg-teal-50 text-teal-700",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
};

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const { count, openCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const careLinks = careLinksFor(user);

  // Close on navigation, so tapping a link in the drawer doesn't leave it hanging
  // open. Deferred to a microtask so the write lands after the effect rather
  // than synchronously inside it, which cascades a second render.
  useEffect(() => { queueMicrotask(() => setOpen(false)); }, [pathname]);

  // Escape to close, and hold the page still while the drawer is over it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="-ml-1 shrink-0 rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight text-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="Care Bora Kenya" width={40} height={35} className="h-9 w-auto" />
            <span className="text-lg">Care&nbsp;Bora</span>
          </Link>

          {/* Only the two primary paths sit inline, and only where there's room. */}
          <div className="ml-2 hidden items-center gap-1 text-sm font-medium lg:flex">
            {PUBLIC_LINKS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
                  isActive(href) ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <button onClick={openCart} className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100" aria-label="Open cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>

            {loading ? (
              <div className="h-9 w-9 rounded-full skeleton" />
            ) : user ? (
              <Link href="/profile" className="hidden items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 transition hover:bg-slate-200 sm:flex" title="Your profile">
                <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-xs font-bold text-white">
                  {user.avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : user.fullName.charAt(0)}
                </span>
                <span className="max-w-[8rem] truncate text-sm font-medium text-slate-700">{user.fullName.split(" ")[0]}</span>
              </Link>
            ) : (
              <Link href="/login" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 sm:px-4">
                Log in
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* ── Side drawer ───────────────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed left-0 top-0 z-[70] flex h-dvh w-[20rem] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <span className="font-extrabold tracking-tight text-slate-900">Menu</span>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {user && (
            <Link href="/profile" className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-slate-100">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-bold text-white">
                {user.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : user.fullName.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-900">{user.fullName}</span>
                <span className="block truncate text-xs capitalize text-slate-500">{user.role}</span>
              </span>
            </Link>
          )}

          <DrawerGroup title="Care">
            {PUBLIC_LINKS.map((l) => <DrawerLink key={l.href} link={l} active={isActive(l.href)} />)}
            {careLinks.map((l) => <DrawerLink key={l.href} link={l} active={isActive(l.href)} />)}
          </DrawerGroup>

          <DrawerGroup title="Account">
            {user ? (
              <>
                <DrawerLink link={{ href: "/profile", label: "My profile", Icon: UserIcon }} active={isActive("/profile")} />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  <LogOut className="h-4.5 w-4.5" /> Log out
                </button>
              </>
            ) : (
              <>
                <DrawerLink link={{ href: "/login", label: "Log in or sign up", Icon: UserIcon }} active={isActive("/login")} />
                <DrawerLink link={{ href: "/providers/apply", label: "Join as a provider", Icon: Stethoscope }} active={isActive("/providers/apply")} />
                <DrawerLink link={{ href: "/vendors/apply", label: "Sell on CareBora", Icon: Building2 }} active={isActive("/vendors/apply")} />
              </>
            )}
          </DrawerGroup>

          {/* Reachable from the drawer as well as the footer, so it's one tap
              away on a phone instead of a scroll to the bottom of the page. */}
          <DrawerGroup title="Legal">
            <DrawerLink link={{ href: "/privacy", label: "Privacy policy", Icon: ShieldCheck }} active={isActive("/privacy")} />
          </DrawerGroup>
        </div>
      </aside>
    </>
  );
}

function DrawerGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DrawerLink({ link, active }: { link: NavLink; active: boolean }) {
  const { href, label, Icon, tone = "teal" } = link;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active ? TONE_ACTIVE[tone] : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" /> {label}
    </Link>
  );
}
