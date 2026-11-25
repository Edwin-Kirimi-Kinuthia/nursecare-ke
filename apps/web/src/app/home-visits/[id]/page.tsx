"use client";
import { useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useSection, SectionShell } from "@/components/dashboard/section";
import ServiceReviewForm from "@/components/ServiceReviewForm";
import RequestClientReview from "@/components/RequestClientReview";
export default function VisitPage() {
  const { id } = useParams<{id:string}>();
  const {user, loading: authLoading} = useAuth();
  const fetcher = useCallback(() => user ? api.getHomeVisit(id) : Promise.resolve(null),[user,id]);
  const {data: visit, loading, error, reload} = useSection(fetcher);
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-8"><h1 className="text-2xl font-semibold">Home visit</h1>
    {authLoading ? <p>Loading…</p> : !user ? <Link className="button-primary" href={`/login?next=${encodeURIComponent(`/home-visits/${id}`)}`}>Sign in to view your visit</Link> : <SectionShell loading={loading} error={error} onRetry={reload}>{visit && <>
      <p className="capitalize">{visit.specialty} · {visit.status.replaceAll("_"," ")}</p><p>{visit.description}</p><p>{visit.address}, {visit.county}</p>
      {visit.status === "completed" && visit.patientId === user.id && <ServiceReviewForm serviceType="home_visit" subjectId={id} label="your home visit" />}
      {visit.status === "completed" && visit.providerId === user.id && <RequestClientReview serviceType="home_visit" subjectId={id} />}
    </>}</SectionShell>}
  </main>;
}
