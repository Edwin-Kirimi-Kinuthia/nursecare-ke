import { createContext, useContext, useEffect, useState } from "react";
import type { AppConfig } from "@carebora/api-client";
import { api } from "./api";

/**
 * Server-side settings (contact numbers, payment mode, minimum app version),
 * fetched once. Everything has a safe fallback, so a failed fetch never blocks
 * the app — the numbers a person needs in an emergency must work offline.
 */
export const FALLBACK = {
  ambulancePhone: "+254717231721",
  supportPhones: ["+254791390915", "+254757963762"],
  supportEmail: "customercare@carebora.co.ke",
  nationalEmergencyNumbers: ["999", "112"],
};

const Ctx = createContext<AppConfig | null>(null);
export const useAppConfig = () => useContext(Ctx);

export function useContacts() {
  const c = useAppConfig()?.contact;
  return {
    ambulancePhone: c?.ambulancePhone ?? FALLBACK.ambulancePhone,
    supportPhones: c?.supportPhones ?? FALLBACK.supportPhones,
    supportEmail: c?.supportEmail ?? FALLBACK.supportEmail,
    nationalEmergencyNumbers: c?.nationalEmergencyNumbers ?? FALLBACK.nationalEmergencyNumbers,
  };
}

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    let live = true;
    api.getConfig().then((c) => { if (live) setConfig(c); }).catch(() => { /* fallbacks cover it */ });
    return () => { live = false; };
  }, []);
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}
