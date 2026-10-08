"use client";

import { NAME_TITLES, joinTitle, splitTitle } from "@carebora/shared";

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
 * Assembled in natural reading order for storage/display — the form just asks
 * in a different order. A title, when chosen, leads the name ("Dr. Jane Kamau"),
 * so everywhere the name is shown carries it without needing to know about it.
 */
export function composeFullName(parts: NameParts): string {
  const name = [parts.firstName, parts.middleName, parts.surname].map((s) => s.trim()).filter(Boolean).join(" ");
  return joinTitle(parts.title, name);
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
  // The title comes off first, or "Dr." would be read as the first name.
  const { title, name } = splitTitle(fullName);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ...EMPTY_NAME, title };
  if (parts.length === 1) return { ...EMPTY_NAME, title, firstName: parts[0] };
  return {
    title,
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}

export function NameFields({
  value, onChange, inputClassName = DEFAULT_INPUT_CLASS, labelClassName = DEFAULT_LABEL_CLASS, showTitle = false,
}: {
  value: NameParts;
  onChange: (v: NameParts) => void;
  inputClassName?: string;
  labelClassName?: string;
  /** Ask for an optional title (Dr., Prof., …). For care-provider forms. */
  showTitle?: boolean;
}) {
  const set = (k: keyof NameParts, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="sm:w-40">
          {/* "No title" lives in the option, not the label, for the same reason
              "(optional)" is in the placeholder below: a longer label wraps and
              pushes the control out of line with its neighbours. */}
          <label className={labelClassName}>Title</label>
          <select
            value={value.title ?? ""}
            onChange={(e) => set("title", e.target.value)}
            className={inputClassName}
          >
            <option value="">No title</option>
            {NAME_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}
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
    </div>
  );
}
