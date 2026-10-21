import { CheckCircle2, Video, Mic, PhoneOff, Pill, ShieldCheck, Stethoscope } from "lucide-react";

/**
 * The hero picture: a phone showing a video consultation, ringed by floating
 * status cards. Pure markup and CSS (no image to load, so no layout shift), and
 * everything shown is something the product genuinely does.
 */
export default function HeroPhone() {
  return (
    <div className="relative mx-auto h-[460px] w-full max-w-[420px] select-none" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/25 blur-3xl" />

      {/* Phone */}
      <div className="float-slow absolute left-[58%] top-4 w-[230px] -translate-x-1/2 rounded-[2.4rem] border-[7px] border-slate-900 bg-slate-900 shadow-2xl shadow-black/40" style={{ ["--r" as string]: "-2deg" }}>
        <div className="mx-auto mt-1 h-4 w-20 rounded-b-2xl bg-slate-900" />
        <div className="-mt-3 overflow-hidden rounded-[1.8rem] bg-gradient-to-b from-teal-700 to-teal-950 px-3 pb-4 pt-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-teal-700"><Stethoscope className="h-5 w-5" /></div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-white">Your doctor</div>
              <div className="flex items-center gap-1 text-[10px] text-teal-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Available now</div>
            </div>
          </div>
          <div className="relative mt-3 grid h-40 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/40 to-emerald-400/20">
            <div className="absolute inset-0 dot-grid opacity-60" />
            <div className="relative grid h-16 w-16 place-items-center rounded-full bg-white/90 text-teal-700">
              <span className="ring-pulse absolute inset-0 rounded-full text-white/60" />
              <Video className="relative h-7 w-7" />
            </div>
            <div className="absolute bottom-2 right-2 h-14 w-10 rounded-lg border border-white/30 bg-slate-800/70" />
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="w-4/5 rounded-xl rounded-tl-sm bg-white/15 px-2.5 py-1.5 text-[10px] text-white">How can I help today?</div>
            <div className="ml-auto flex w-24 items-center gap-1 rounded-xl rounded-tr-sm bg-teal-400 px-2.5 py-2">
              {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-teal-950" style={{ animation: `typing 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white"><Mic className="h-4 w-4" /></span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-500 text-white"><PhoneOff className="h-4 w-4" /></span>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <div className="float-slow d2 absolute -left-2 top-6 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-black/20" style={{ ["--r" as string]: "-4deg" }}>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
        <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">M-Pesa</div><div className="text-sm font-extrabold text-slate-900">Payment received</div></div>
      </div>
      <div className="float-slow d3 absolute -right-2 bottom-20 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-black/20" style={{ ["--r" as string]: "3deg" }}>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Pill className="h-5 w-5" /></span>
        <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">Pharmacy</div><div className="text-sm font-extrabold text-slate-900">Delivered to you</div></div>
      </div>
      <div className="float-slow absolute bottom-2 left-0 flex items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-xl shadow-black/20" style={{ ["--r" as string]: "2deg" }}>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-100 text-teal-700"><ShieldCheck className="h-5 w-5" /></span>
        <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">Every provider</div><div className="text-sm font-extrabold text-slate-900">Licence-checked</div></div>
      </div>
    </div>
  );
}
