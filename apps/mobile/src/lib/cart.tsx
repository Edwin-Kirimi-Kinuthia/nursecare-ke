import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";

const KEY = "carebora.cart";
type Items = Record<string, number>;
type CartValue = {
  items: Items;
  count: number;
  add: (listingId: string, minimum?: number, maximum?: number) => void;
  sub: (listingId: string, minimum?: number) => void;
  remove: (listingId: string) => void;
  clear: () => void;
};
const Ctx = createContext<CartValue | null>(null);

export function useCart(): CartValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}

/** The pharmacy cart: listing id → quantity. Kept on the device so it survives closing the app. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Items>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) setItems((cur) => ({ ...JSON.parse(raw), ...cur }));
      } catch { /* an empty cart is fine */ }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(KEY, JSON.stringify(items)).catch(() => {});
  }, [items, loaded]);

  const add = useCallback((id: string, minimum = 1, maximum = 100) => setItems(c => { const qty = c[id] ?? 0; return qty >= maximum || maximum < minimum ? c : { ...c, [id]: Math.min(maximum, Math.max(minimum, qty + 1)) }; }), []);
  const sub = useCallback((id: string, minimum = 1) => setItems((c) => {
    const n = (c[id] ?? 0) <= minimum ? 0 : (c[id] ?? 0) - 1;
    const { [id]: _drop, ...rest } = c;
    return n > 0 ? { ...rest, [id]: n } : rest;
  }), []);
  const remove = useCallback((id: string) => setItems((c) => { const { [id]: _drop, ...rest } = c; return rest; }), []);
  const clear = useCallback(() => setItems({}), []);
  const value = useMemo(() => ({ items, count: Object.values(items).reduce((a, b) => a + b, 0), add, sub, remove, clear }), [items, add, sub, remove, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
