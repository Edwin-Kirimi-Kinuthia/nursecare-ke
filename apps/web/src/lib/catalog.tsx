import {
  Pill, HeartPulse, Droplets, Leaf, Sparkles, Ear, ShieldPlus,
  Activity, Wind, Stethoscope, type LucideIcon,
} from "lucide-react";

/** Visual theme (icon + gradient) for each pharmacy product category. */
const CATEGORY: Record<string, { Icon: LucideIcon; from: string; to: string }> = {
  "Pain Relief":       { Icon: Pill,        from: "from-rose-400",    to: "to-orange-400" },
  "Gastrointestinal":  { Icon: Droplets,    from: "from-teal-400",    to: "to-cyan-500" },
  "Supplements":       { Icon: Leaf,        from: "from-emerald-400", to: "to-green-500" },
  "Dermatology":       { Icon: Sparkles,    from: "from-amber-400",   to: "to-yellow-500" },
  "ENT":               { Icon: Ear,         from: "from-sky-400",     to: "to-blue-500" },
  "Antibiotics":       { Icon: ShieldPlus,  from: "from-indigo-400",  to: "to-violet-500" },
  "Diabetes":          { Icon: Activity,    from: "from-fuchsia-400", to: "to-purple-500" },
  "Cardiovascular":    { Icon: HeartPulse,  from: "from-red-400",     to: "to-rose-500" },
  "Respiratory":       { Icon: Wind,        from: "from-cyan-400",    to: "to-teal-500" },
};

const FALLBACK = { Icon: Stethoscope, from: "from-slate-400", to: "to-slate-500" };

export function categoryTheme(category: string) {
  return CATEGORY[category] ?? FALLBACK;
}
