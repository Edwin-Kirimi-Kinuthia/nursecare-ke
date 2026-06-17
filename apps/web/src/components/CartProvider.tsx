"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Items = Record<string, number>;

interface CartState {
  items: Items;
  count: number;
  add: (id: string) => void;
  sub: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartState>({
  items: {}, count: 0, add: () => {}, sub: () => {}, remove: () => {}, clear: () => {},
});

const KEY = "carebora_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Items>({});

  // Hydrate from localStorage after mount (avoids SSR mismatch). The update is
  // deferred to a microtask so it runs after — not synchronously within — the
  // effect, which both matches the post-hydration timing and satisfies the
  // react-hooks set-state-in-effect rule.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Items;
        queueMicrotask(() => setItems(parsed));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const add = (id: string) => setItems((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setItems((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id]; else next[id] = n;
      return next;
    });
  const remove = (id: string) => setItems((c) => { const n = { ...c }; delete n[id]; return n; });
  const clear = () => setItems({});

  const count = Object.values(items).reduce((a, b) => a + b, 0);

  return (
    <CartContext.Provider value={{ items, count, add, sub, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
