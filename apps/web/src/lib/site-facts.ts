/**
 * Facts about the organisation that only its owners can supply.
 *
 * Trust pages (About, the footer, the Organization markup) are far stronger
 * with a registered legal name, a registration number and a physical address —
 * search engines and patients both look for them on a health site. They are
 * read from environment variables so they can be filled in on Vercel without a
 * code change, and every consumer renders a fact only when it is set. Nothing
 * here has a default: an invented registration number is worse than a missing
 * one.
 */
const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export const SITE_FACTS = {
  /** Registered legal name, if different from the trading name "Care Bora Kenya". */
  legalName: clean(process.env.NEXT_PUBLIC_LEGAL_NAME),
  /** Company / NGO / business registration number. */
  registrationNumber: clean(process.env.NEXT_PUBLIC_REGISTRATION_NUMBER),
  /** Street address people can visit or write to. */
  physicalAddress: clean(process.env.NEXT_PUBLIC_PHYSICAL_ADDRESS),
  /** An organisation Care Bora belongs to or is run by — e.g. an existing non-profit. */
  parentOrgName: clean(process.env.NEXT_PUBLIC_PARENT_ORG_NAME),
  parentOrgUrl: clean(process.env.NEXT_PUBLIC_PARENT_ORG_URL),
};
