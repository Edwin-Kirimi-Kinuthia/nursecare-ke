"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

function getInitials(name: string) {
  return name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";
}

function avatarColor(name: string) {
  const colors = ["bg-blue-500", "bg-teal-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
  let hash = 0;
  for (const c of name) hash += c.charCodeAt(0);
  return colors[hash % colors.length];
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUser, setIsUser] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = () => {
      const adminAuth = localStorage.getItem("nc_admin_auth") === "true";
      const userAuth = localStorage.getItem("nc_user_auth") === "true";
      const doctorAuth = localStorage.getItem("nc_doctor_auth") === "true";
      setIsAdmin(adminAuth);
      setIsUser(userAuth);
      setIsDoctor(doctorAuth);

      if (adminAuth) {
        setUserName("Admin");
        setUserEmail("admin@nursecare.ke");
      } else if (doctorAuth) {
        const raw = localStorage.getItem("nc_doctor_profile");
        if (raw) {
          const p = JSON.parse(raw);
          setUserName(p.name || "Doctor");
          setUserEmail(p.email || "doctor@nursecare.ke");
        } else {
          setUserName("Doctor");
          setUserEmail("doctor@nursecare.ke");
        }
      } else if (userAuth) {
        const raw = localStorage.getItem("nc_user_profile");
        if (raw) {
          const p = JSON.parse(raw);
          setUserName(p.name || "");
          setUserEmail(p.email || "");
        }
      }
    };
    checkAuth();
    window.addEventListener("focus", checkAuth);
    return () => window.removeEventListener("focus", checkAuth);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loggedIn = isAdmin || isUser || isDoctor;

  const handleLogout = () => {
    localStorage.removeItem("nc_admin_auth");
    localStorage.removeItem("nc_user_auth");
    localStorage.removeItem("nc_user_profile");
    localStorage.removeItem("nc_doctor_auth");
    localStorage.removeItem("nc_doctor_profile");
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
            <Link href="/" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">Home</Link>
            <Link href="/services" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">Services</Link>
            <Link href="/providers" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">Find Nurses</Link>
            <Link href="/consultations" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">Consultations</Link>
            <Link href="/emergency" className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Emergency
            </Link>
          </div>

          {/* Desktop auth area */}
          <div className="hidden md:flex items-center gap-3">
            {loggedIn ? (
              <div className="relative" ref={dropRef}>
                {/* Avatar button */}
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-slate-100 transition-all"
                >
                  <div className={`w-8 h-8 ${avatarColor(userName)} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                    {getInitials(userName)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900 leading-none">{userName || "Account"}</p>
                    {isAdmin && <p className="text-xs text-blue-600 font-medium mt-0.5">Admin</p>}
                  {isDoctor && <p className="text-xs text-teal-600 font-medium mt-0.5">Doctor</p>}
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${dropOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${avatarColor(userName)} rounded-xl flex items-center justify-center text-white font-bold`}>
                          {getInitials(userName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{userName || "Account"}</p>
                          <p className="text-slate-500 text-xs truncate">{userEmail}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Super Admin
                        </div>
                      )}
                      {isDoctor && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Doctor Portal
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div className="py-1">
                      {!isAdmin && !isDoctor && (
                        <Link href="/profile" onClick={() => setDropOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          My Profile
                        </Link>
                      )}
                      <Link href={isAdmin ? "/admin" : isDoctor ? "/doctor/dashboard" : "/dashboard"} onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {isAdmin ? "Admin Panel" : isDoctor ? "Doctor Portal" : "My Dashboard"}
                      </Link>
                      {isDoctor && (
                        <Link href="/consultations" onClick={() => setDropOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Browse Consultations
                        </Link>
                      )}
                      {!isAdmin && !isDoctor && (
                        <Link href="/dashboard" onClick={() => setDropOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          My Bookings
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 py-1">
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
                <Link href="/auth/signup" className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">Sign up free</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" aria-label="Toggle menu">
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
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
          <Link href="/consultations" className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setOpen(false)}>Consultations</Link>
          <Link href="/emergency" className="block px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl" onClick={() => setOpen(false)}>🚨 Emergency Help</Link>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {loggedIn ? (
              <>
                {/* Mobile user info */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                  <div className={`w-9 h-9 ${avatarColor(userName)} rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {getInitials(userName)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{userName || "Account"}</p>
                    <p className="text-slate-500 text-xs truncate">{userEmail}</p>
                  </div>
                </div>
                {!isAdmin && !isDoctor && (
                  <Link href="/profile" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setOpen(false)}>👤 My Profile</Link>
                )}
                <Link href={isAdmin ? "/admin" : isDoctor ? "/doctor/dashboard" : "/dashboard"} className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setOpen(false)}>
                  {isAdmin ? "🛡 Admin Panel" : isDoctor ? "🩺 Doctor Portal" : "📋 My Dashboard"}
                </Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                  ← Log out
                </button>
              </>
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
