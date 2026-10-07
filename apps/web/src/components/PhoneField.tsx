"use client";

import { useState } from "react";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { COUNTRIES, flagEmoji } from "@/lib/countries";

const KENYA = COUNTRIES[0];

/**
 * One phone input for the whole app: flag + dial code on the left, number on the right.
 *
 * `value`/`onChange` speak full international numbers ("+254712345678"), which every
 * endpoint already accepts. The country sits in local state and the local part is
 * derived from `value`, so the caller never has to think about splitting them.
 *
 * Pass `lockedToKenya` for M-Pesa fields — STK push only reaches Kenyan Safaricom
 * numbers, so there the prefix is shown but not selectable.
 */
export function PhoneField({
  label, value, onChange, required, lockedToKenya, placeholder = "712345678", hint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  lockedToKenya?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const [iso2, setIso2] = useState(KENYA.iso2);
  const country = lockedToKenya ? KENYA : (COUNTRIES.find((c) => c.iso2 === iso2) ?? KENYA);

  // Strip the dial code back off so the user only ever edits the local part.
  const localPart = value.startsWith(country.dialCode)
    ? value.slice(country.dialCode.length)
    : value.replace(/^\+/, "");

  const emit = (dialCode: string, digits: string) => {
    let cleaned = digits.replace(/\D/g, "");
    // Pasting a full international number ("+254712…" or "254712…") into the
    // local half shouldn't end up doubling the dial code.
    const bare = dialCode.replace("+", "");
    if (cleaned.startsWith(bare) && cleaned.length > bare.length) cleaned = cleaned.slice(bare.length);
    cleaned = cleaned.replace(/^0+/, "");
    onChange(cleaned ? `${dialCode}${cleaned}` : "");
  };

  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <div className="flex">
        {lockedToKenya ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-700">
            <span className="text-base leading-none">{flagEmoji(KENYA.iso2)}</span>
            {KENYA.dialCode}
          </span>
        ) : (
          <CountryCodeSelect
            iso2={country.iso2}
            onChange={(c) => { setIso2(c.iso2); emit(c.dialCode, localPart); }}
          />
        )}
        <input
          type="tel"
          inputMode="numeric"
          required={required}
          value={localPart}
          onChange={(e) => emit(country.dialCode, e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 rounded-r-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
