"use client";

import { NAME_TITLES, type NameParts } from "@carebora/shared";

// The data model and the compose/split logic live in @carebora/shared so the
// mobile app builds names exactly the same way.
export { EMPTY_NAME, composeFullName, splitFullName, type NameParts } from "@carebora/shared";

const DEFAULT_INPUT_CLASS =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
const DEFAULT_LABEL_CLASS = "mb-1 block text-sm font-medium text-slate-700";

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
