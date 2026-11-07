"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart, CalendarDays, Users, LogOut, LayoutDashboard, Home, Brain, Pill, Ambulance, Building2, FileText, FlaskConical, Menu, X, User as UserIcon, Stethoscope, MessageSquare, ShieldCheck, Settings, ChevronDown, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartProvider";
import NotificationBell from "@/components/NotificationBell";
import type { PublicUser } from "@carebora/shared";
import { nameInitial } from "@carebora/shared";

interface NavLink {
  href: string;
  label: string;
  Icon: typeof Users;
  /** Accent used for the active state — emergency routes read red, AI reads violet. */
  tone?: "teal" | "rose" | "violet";
}

/** Public navigation stays available whether or not a visitor is signed in. */
const PUBLIC_LINKS: NavLink[] = [
  { href: "/providers", label: "Find providers", Icon: Users },
  { href: "/pharmacy", label: "Pharmacy", Icon: Pill },
  { href: "/about", label: "About us", Icon: ShieldCheck },
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
    { href: "/ambulance", label: "Ambulance", Icon: Ambulance, tone: "rose" },
    { href: "/labs", label: "Lab tests", Icon: FlaskConical },
    { href: "/records", label: "My records", Icon: FileText },
    { href: "/ai", label: "Symptom checker", Icon: Brain, tone: "violet" },
  ];
  // Role still decides the extra powers an account has.
  if (user.role === "vendor") links.push({ href: "/vendor", label: "Vendor dashboard", Icon: Building2 });
  if (user.role === "admin") links.push({ href: "/admin", label: "Admin dashboard", Icon: LayoutDashboard });
  return links;
}

const SERVICE_LINKS: NavLink[] = [
  { href: "/online-doctor-kenya", label: "Online consultations", Icon: Stethoscope },
  { href: "/home-visits-nairobi", label: "Care at home", Icon: Home },
  { href: "/labs", label: "Laboratory tests", Icon: FlaskConical },
  { href: "/sick-off-sheet-online-kenya", label: "Sick-off sheets", Icon: FileText },
  { href: "/ambulance-nairobi", label: "Ambulance assistance", Icon: Ambulance, tone: "rose" },
];

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
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  function showDrawer(event: React.MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget;
    setOpen(true);
  }
  function closeDrawer() {
    setOpen(false);
    openerRef.current?.focus();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const careLinks = careLinksFor(user);

  // Close on navigation, so tapping a link in the drawer doesn't leave it hanging
  // open. Deferred to a microtask so the write lands after the effect rather
  // than synchronously inside it, which cascades a second render.
  useEffect(() => { queueMicrotask(() => { setOpen(false); setServicesOpen(false); }); }, [pathname]);

  useEffect(() => {
    if (!servicesOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!servicesRef.current?.contains(event.target as Node)) setServicesOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServicesOpen(false);
        servicesRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [servicesOpen]);

  useEffect(() => {
    if (!open) return;
    drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); openerRef.current?.focus(); }
      if (event.key !== "Tab") return;
      const controls = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="site-header sticky top-0 z-50 border-b backdrop-blur-xl">
        <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
          <button onClick={showDrawer} aria-label="Open menu" aria-expanded={open} aria-controls="site-menu" className="icon-button nav-mobile -ml-2 shrink-0">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-1.5 font-semibold tracking-tight text-slate-900 sm:gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="Care Bora Kenya" width={40} height={35} className="h-7 w-auto sm:h-9" />
            <span className="site-wordmark text-base sm:text-lg">Care&nbsp;Bora</span>
          </Link>

          <div className="ml-5 hidden items-center lg:flex">
            <div ref={servicesRef} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setServicesOpen(false); }}>
              <button className="nav-link" aria-expanded={servicesOpen} aria-controls="care-services-menu" onClick={() => setServicesOpen(value => !value)}>
                Care services <ChevronDown className={`h-3.5 w-3.5 transition ${servicesOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {servicesOpen && (
                <div id="care-services-menu" className="absolute left-0 top-full mt-3 w-80 rounded-xl border border-slate-200 bg-background p-3 shadow-xl" onClick={event => { if ((event.target as HTMLElement).closest("a")) setServicesOpen(false); }}>
                  <Link href="/providers" className="mb-2 flex min-h-12 items-center justify-between rounded-lg bg-teal-100 px-3 text-sm font-semibold text-teal-900">Find a doctor or nurse <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                  {SERVICE_LINKS.map(link => <DrawerLink key={link.href} link={link} active={isActive(link.href)} />)}
                </div>
              )}
            </div>
            {PUBLIC_LINKS.filter(link => link.href !== "/providers").map(({ href, label }) => (
              <Link key={href} href={href} className="nav-link" aria-current={isActive(href) ? "page" : undefined}>{label}</Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <button onClick={openCart} className="icon-button relative" aria-label={`Open cart${count > 0 ? `, ${count} items` : ""}`}>
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-teal-700 px-1 text-[10px] font-semibold text-white">{count}</span>}
            </button>
            {loading ? <div className="h-9 w-9 rounded-full skeleton" /> : user ? (
              <button onClick={showDrawer} aria-label="Open account menu" aria-expanded={open} aria-controls="site-menu" className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-700 text-xs font-semibold text-white">
                  {user.avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : nameInitial(user.fullName)}
                </span>
                <span className="hidden max-w-24 truncate sm:block">{user.fullName.split(" ")[0]}</span><ChevronDown className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
              </button>
            ) : <Link href="/login" className="nav-link px-2 sm:px-3">Log in</Link>}
            <Link href="/providers" className="button-primary nav-booking !min-h-11 !px-4">Find a provider</Link>
          </div>
        </nav>
      </header>

      {/* ── Side drawer ───────────────────────────────────────────────────── */}
      {open && <>
      <div
        onClick={closeDrawer}
        className={`fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        id="site-menu"
        onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed left-0 top-0 z-[70] flex h-dvh w-[20rem] max-w-[85vw] flex-col bg-background shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <span className="font-extrabold tracking-tight text-slate-900">Menu</span>
          <button onClick={closeDrawer} aria-label="Close menu" className="icon-button">
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
                  : nameInitial(user.fullName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-900">{user.fullName}</span>
                <span className="block truncate text-xs capitalize text-slate-500">{user.role}</span>
              </span>
            </Link>
          )}

          <DrawerGroup title="Explore care">
            {PUBLIC_LINKS.slice(0, 2).map(l => <DrawerLink key={l.href} link={l} active={isActive(l.href)} />)}
            {SERVICE_LINKS.map(l => <DrawerLink key={l.href} link={l} active={isActive(l.href)} />)}
          </DrawerGroup>
          {careLinks.length > 0 && <DrawerGroup title="My care">{careLinks.map(l => <DrawerLink key={l.href} link={l} active={isActive(l.href)} />)}</DrawerGroup>}
          <DrawerGroup title="Care Bora">{PUBLIC_LINKS.slice(2).map(l => <DrawerLink key={l.href} link={l} active={isActive(l.href)} />)}</DrawerGroup>

          <DrawerGroup title="Account">
            {user ? (
              <>
                <DrawerLink link={{ href: "/profile", label: "My profile", Icon: UserIcon }} active={isActive("/profile")} />
                <DrawerLink link={{ href: "/settings", label: "Settings", Icon: Settings }} active={isActive("/settings")} />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
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
      </>}
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
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
        active ? TONE_ACTIVE[tone] : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" /> {label}
    </Link>
  );
}
