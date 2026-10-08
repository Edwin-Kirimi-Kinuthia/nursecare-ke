import { notFound } from "next/navigation";
import { providerService } from "@carebora/core";
import { ApiError } from "@carebora/shared";
import type { ProviderPublicProfile } from "@carebora/api-client";
import { JsonLd } from "@/components/JsonLd";
import ProviderProfile from "@/components/ProviderProfile";
import { breadcrumbSchema, physicianSchema } from "@/lib/structured-data";

export const revalidate = 300;

/**
 * A provider's profile, rendered on the server.
 *
 * This is the page people search for by name or by "doctor in <place>", and it
 * used to arrive as an empty shell — no name, no heading, no bio in the HTML —
 * with everything fetched in the browser afterwards. Search engines can run
 * JavaScript but index shell pages poorly and slowly, so the content now ships
 * with the page. An unknown id returns a real 404 rather than a 200 saying
 * "not found", which search engines treat as a soft 404 and hold against the
 * site.
 */
export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Not a UUID can't be a provider; say 404 instead of letting the database
  // reject it and the page mistake that for an outage.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  let provider: ProviderPublicProfile | null = null;
  let missing = false;
  try {
    provider = JSON.parse(JSON.stringify(await providerService.getById(id)));
  } catch (err) {
    // A missing provider is a 404. Anything else (the database being down)
    // falls through to the client, which fetches it itself. notFound() throws
    // by design, so it must be called outside this catch's own try.
    if (err instanceof ApiError && err.code === "NOT_FOUND") missing = true;
  }
  if (missing) notFound();

  return (
    <>
      {provider && (
        <>
          <JsonLd data={physicianSchema(provider)} />
          <JsonLd data={breadcrumbSchema([
            ["Home", "/"],
            ["Find a provider", "/providers"],
            [provider.user.fullName, `/providers/${id}`],
          ])} />
        </>
      )}
      <ProviderProfile id={id} initial={provider} />
    </>
  );
}
