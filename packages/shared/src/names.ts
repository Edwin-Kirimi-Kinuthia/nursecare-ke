/**
 * Titles a care provider can put before their name.
 *
 * A name is stored as one string — "Dr. Mercy Chebet Limo" — so that every
 * place that shows it (cards, appointments, emails, the admin panel) is right
 * without each one having to know about titles. The cost is that code which
 * needs the *name* rather than the whole string — the avatar letter, the
 * greeting in an email, the edit form — has to look past the title. These
 * helpers are that one place.
 */
export const NAME_TITLES = ["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Miss", "Nurse"] as const;
export type NameTitle = (typeof NAME_TITLES)[number];

const CANONICAL: Record<string, NameTitle> = Object.fromEntries(
  NAME_TITLES.map((t) => [t.replace(/\./g, "").toLowerCase(), t]),
);

/** "Dr. Mercy Limo" -> { title: "Dr.", name: "Mercy Limo" }. A title alone, or none, leaves the name untouched. */
export function splitTitle(fullName: string): { title: NameTitle | ""; name: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const m = /^([A-Za-z]+)\.?\s+(\S.*)$/.exec(trimmed);
  const canonical = m ? CANONICAL[m[1]!.toLowerCase()] : undefined;
  return canonical && m ? { title: canonical, name: m[2]! } : { title: "", name: trimmed };
}

/** The inverse: an empty title just returns the name. */
export function joinTitle(title: string | undefined, name: string): string {
  const n = name.trim();
  return title ? `${title} ${n}` : n;
}

/** The letter for an avatar. Skips the title, or every doctor becomes "D". */
export function nameInitial(fullName: string | null | undefined): string {
  const { name } = splitTitle(fullName ?? "");
  return name.charAt(0).toUpperCase() || "?";
}

/**
 * How an email addresses someone: "Dr. Mercy", "Asha". Keeps the title because
 * "Hi Dr. Mercy" is how people actually greet a doctor; without this the
 * naive first word gives "Hi Dr.,".
 */
export function greetingName(fullName: string): string {
  const { title, name } = splitTitle(fullName);
  const first = name.split(" ")[0] || "";
  return first ? joinTitle(title, first) : "there";
}
