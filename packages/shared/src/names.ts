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

// ── Name parts ───────────────────────────────────────────────────────────────

/** Every form that collects a person's name does it this way: Surname, First name, Middle name (optional). */
export interface NameParts {
  surname: string;
  firstName: string;
  middleName: string;
  /** Optional, and only asked for on care-provider forms. */
  title?: string;
}

export const EMPTY_NAME: NameParts = { surname: "", firstName: "", middleName: "", title: "" };

/**
 * Assembled in natural reading order for storage/display — the forms just ask
 * in a different order. A title, when chosen, leads the name ("Dr. Jane Kamau"),
 * so everywhere the name is shown carries it without needing to know about it.
 */
export function composeFullName(parts: NameParts): string {
  const name = [parts.firstName, parts.middleName, parts.surname].map((s) => s.trim()).filter(Boolean).join(" ");
  return joinTitle(parts.title, name);
}

/**
 * The inverse of composeFullName, for forms that edit an existing name.
 * Best effort: the first word is the first name, the last is the surname,
 * anything between is the middle. Round-trips every name the forms composed
 * and degrades sensibly on a one-word name.
 */
export function splitFullName(fullName: string): NameParts {
  // The title comes off first, or "Dr." would be read as the first name.
  const { title, name } = splitTitle(fullName);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ...EMPTY_NAME, title };
  if (parts.length === 1) return { ...EMPTY_NAME, title, firstName: parts[0]! };
  return { title, firstName: parts[0]!, middleName: parts.slice(1, -1).join(" "), surname: parts[parts.length - 1]! };
}
