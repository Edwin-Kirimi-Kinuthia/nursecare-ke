"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUser, setIsUser] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsAdmin(localStorage.getItem("nc_admin_auth") === "true");
      setIsUser(localStorage.getItem("nc_user_auth") === "true");
    };
    checkAuth();
    // Re-check when the tab regains focus (e.g. after login in another tab)
    window.addEventListener("focus", checkAuth);
    return () => window.removeEventListener("focus", checkAuth);
  }, []);

  const loggedIn = isAdmin || isUser;

  const handleLogout = () => {
    localStorage.removeItem("nc_admin_auth");
    localStorage.removeItem("nc_user_auth");
    localStorage.removeItem("nc_user_email");
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
              </svg>
            </div>
            <span className="font-bold text-xl text-slate-900">
              Nurse<span className="text-blue-600">Care</span>
              <span className="text-slate-400 font-normal text-sm ml-1">Kenya</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              Home
            </Link>
            <Link href="/services" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              Services
            </Link>
            <Link href="/providers" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              Find Nurses
            </Link>
            <Link href="/emergency" className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Emergency
            </Link>
          </div>

          {/* Desktop auth area */}
          <div className="hidden md:flex items-center gap-3">
            {loggedIn ? (
              <>
                {/* Dashboard / Admin shortcut */}
                <Link
                  href={isAdmin ? "/admin" : "/dashboard"}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  {isAdmin ? "Admin Panel" : "My Dashboard"}
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Log in
                </Link>
                <Link href="/auth/signup" className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">
                  Sign up free
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
          <Link href="/" className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/services" className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setOpen(false)}>Services</Link>
          <Link href="/providers" className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setOpen(false)}>Find Nurses</Link>
          <Link href="/emergency" className="block px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl" onClick={() => setOpen(false)}>
            🚨 Emergency Help
          </Link>

          <div className="pt-3 border-t border-slate-100">
            {loggedIn ? (
              <div className="space-y-2">
                <Link
                  href={isAdmin ? "/admin" : "/dashboard"}
                  className="block text-center py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {isAdmin ? "Admin Panel" : "My Dashboard"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-800 rounded-xl text-sm font-semibold text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/auth/login" className="text-center py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)}>Log in</Link>
                <Link href="/auth/signup" className="text-center py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700" onClick={() => setOpen(false)}>Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
