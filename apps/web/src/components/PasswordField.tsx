"use client";

import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { PASSWORD_RULES } from "@carebora/shared";

/**
 * Password input with a reveal toggle — every password field in the app offers one.
 *
 * Pass `showStrength` wherever a password is being *set* (signup, applications,
 * reset, change). It renders the rules as a live checklist rather than letting
 * the server reject the form and reveal one failure at a time, which is the
 * difference between a bar people clear and a bar they fight.
 */
export function PasswordField({
  label = "Password", value, onChange, required, placeholder, autoComplete, showStrength,
  inputClassName, labelClassName, children,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  /** Override the input styling so the field matches the surrounding form. */
  inputClassName?: string;
  labelClassName?: string;
  /** Rendered under the input, above the strength meter — e.g. a "Forgot password?" link. */
  children?: React.ReactNode;
}) {
  const [reveal, setReveal] = useState(false);

  const passed = PASSWORD_RULES.filter((r) => r.test(value));
  const score = passed.length;
  const allMet = score === PASSWORD_RULES.length;
  // Collapse the rule count into 3 visual bands, so the meter reads as
  // weak/fair/strong rather than as a score the user has to interpret.
  const band = allMet ? 2 : score >= PASSWORD_RULES.length - 2 ? 1 : 0;
  const bandLabel = ["Weak", "Getting there", "Strong"][band];
  const bandColor = ["bg-rose-500", "bg-amber-500", "bg-emerald-500"][band];
  const bandText = ["text-rose-600", "text-amber-600", "text-emerald-600"][band];

  return (
    <label className="block">
      <span className={labelClassName ?? "mb-1 block text-sm font-medium text-slate-700"}>{label}</span>
      <div className="relative">
        <input
          type={reveal ? "text" : "password"}
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-describedby={showStrength && value ? "password-rules" : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName ?? "w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 transition hover:text-slate-600"
        >
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {children}

      {showStrength && value.length > 0 && (
        <div id="password-rules" className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1" role="presentation">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-full flex-1 rounded-full transition-colors ${i <= band ? bandColor : "bg-slate-200"}`}
                />
              ))}
            </div>
            <span className={`text-xs font-semibold ${bandText}`}>{bandLabel}</span>
          </div>

          {/* Once every rule is met the checklist has done its job and would
              just be clutter, so it collapses to a single line. */}
          {allMet ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Meets all requirements
            </p>
          ) : (
            <ul className="mt-1.5 grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-2">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(value);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {ok
                      ? <Check className="h-3.5 w-3.5 shrink-0" />
                      : <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden />}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </label>
  );
}
