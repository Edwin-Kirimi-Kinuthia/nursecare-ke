import { providerService } from "@carebora/core";
import type { ProviderPublicProfile } from "@carebora/api-client";
import { JsonLd } from "@/components/JsonLd";
import ProvidersDirectory from "@/components/ProvidersDirectory";
import { breadcrumbSchema, providerListSchema } from "@/lib/structured-data";

/** Rebuilt at most every five minutes — fresh enough for a directory, cheap enough to serve from cache. */
export const revalidate = 300;

/**
 * The directory is rendered on the server so that its content is in the HTML.
 * It used to be fetched in the browser, which left crawlers an empty list and a
 * loading skeleton — a page about doctors that, to a search engine, contained
 * none. The client component takes over for filtering.
 */
export default async function ProvidersPage() {
  let providers: ProviderPublicProfile[] = [];
  let specialties: { name: string; count: number }[] = [];
  try {
    const [list, specs] = await Promise.all([
      providerService.list({ limit: 20, offset: 0 } as never),
      providerService.specialties(),
    ]);
    // Plain JSON across the server/client boundary (dates become strings, as the API returns them).
    providers = JSON.parse(JSON.stringify(list.providers));
    specialties = specs;
  } catch {
    // No database at build time, or a transient error: render the page empty and let the client fetch.
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema([["Home", "/"], ["Find a provider", "/providers"]])} />
      {providers.length > 0 && <JsonLd data={providerListSchema(providers)} />}
      <ProvidersDirectory initialProviders={providers} initialSpecialties={specialties} />
    </>
  );
}
