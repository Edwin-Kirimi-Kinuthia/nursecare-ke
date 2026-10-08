"use client";

/** Every form that collects a person's name does it this way: Surname, First name, Middle name (optional). */
export interface NameParts {
  surname: string;
  firstName: string;
  middleName: string;
}

export const EMPTY_NAME: NameParts = { surname: "", firstName: "", middleName: "" };

/** Assembled in natural reading order for storage/display — the form just asks in a different order. */
export function composeFullName(parts: NameParts): string {
  return [parts.firstName, parts.middleName, parts.surname].map((s) => s.trim()).filter(Boolean).join(" ");
}

const DEFAULT_INPUT_CLASS =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
const DEFAULT_LABEL_CLASS = "mb-1 block text-sm font-medium text-slate-700";

/**
 * The inverse of composeFullName, for forms that edit an existing name.
 *
 * Names are stored as one "First Middle Surname" string, so this is a best
 * effort: the first word is the first name, the last is the surname, and
 * anything between is the middle. It round-trips every name this app composed
 * and degrades sensibly on a one-word name.
 */
export function splitFullName(fullName: string): NameParts {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ...EMPTY_NAME };
  if (parts.length === 1) return { ...EMPTY_NAME, firstName: parts[0] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}

export function NameFields({
  value, onChange, inputClassName = DEFAULT_INPUT_CLASS, labelClassName = DEFAULT_LABEL_CLASS,
}: {
  value: NameParts;
  onChange: (v: NameParts) => void;
  inputClassName?: string;
  labelClassName?: string;
}) {
  const set = (k: keyof NameParts, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label className={labelClassName}>Surname</label>
        <input required value={value.surname} onChange={(e) => set("surname", e.target.value)} placeholder="Kamau" className={inputClassName} />
      </div>
      <div>
        <label className={labelClassName}>First name</label>
        <input required value={value.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jane" className={inputClassName} />
      </div>
      <div>
        {/* "(optional)" deliberately lives in the placeholder, not the label — at narrow widths
            (e.g. the admin modal) that extra text wraps to a second line while "Surname" and
            "First name" don't, so the three inputs end up visually misaligned. */}
        <label className={labelClassName}>Middle name</label>
        <input value={value.middleName} onChange={(e) => set("middleName", e.target.value)} placeholder="Wanjiru (optional)" className={inputClassName} />
      </div>
    </div>
  );
}
