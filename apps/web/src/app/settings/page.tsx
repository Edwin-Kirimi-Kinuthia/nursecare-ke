"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import PageHeader from "@/components/PageHeader";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><div className="h-40 rounded-3xl skeleton" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader eyebrow="Your account" Icon={Settings} title="Account settings" lede="Manage your profile, password, and account." />
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><UserRound className="h-5 w-5 text-teal-600" /> Profile and password</h2>
        <p className="mt-2 text-sm text-slate-600">Update your personal details or change your password from your profile.</p>
        <Link href="/profile" className="mt-4 inline-block rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Manage profile and password</Link>
      </div>
      <DeleteAccountSection />
    </div>
  );
}
