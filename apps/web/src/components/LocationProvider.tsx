"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { KENYA_COUNTIES, type KenyaCounty } from "@carebora/shared";

export interface LocationState {
  lat: number | null;
  lng: number | null;
  county: KenyaCounty | null;
  label: string;
  loading: boolean;
  requestPreciseLocation: () => void;
  setCounty: (county: KenyaCounty) => void;
}

const LocationContext = createContext<LocationState>({
  lat: null, lng: null, county: null, label: "Set your location", loading: false,
  requestPreciseLocation: () => {}, setCounty: () => {},
});

const KEY = "carebora_location";

interface Stored { lat: number | null; lng: number | null; county: KenyaCounty | null }

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Stored>({ lat: null, lng: null, county: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) queueMicrotask(() => setState(JSON.parse(raw) as Stored));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const requestPreciseLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setState((s) => ({ ...s, lat: pos.coords.latitude, lng: pos.coords.longitude })); setLoading(false); },
      () => setLoading(false),
      { timeout: 8000 },
    );
  }, []);

  const setCounty = useCallback((county: KenyaCounty) => {
    setState({ lat: null, lng: null, county });
  }, []);

  const label = state.lat != null ? "Near you" : state.county ?? "Set your location";

  return (
    <LocationContext.Provider value={{ ...state, label, loading, requestPreciseLocation, setCounty }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

export { KENYA_COUNTIES };
