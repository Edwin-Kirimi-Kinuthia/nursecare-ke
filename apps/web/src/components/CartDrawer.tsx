"use client";

import { useEffect, useRef } from "react";
import { X, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import CartPanel from "@/components/CartPanel";

/** Slide-over cart, opened from the nav cart icon. Works on every screen size,
 *  which fixes the mobile issue where the cart was stranded at the page bottom. */
export default function CartDrawer() {
  const { isOpen, closeCart, count } = useCart();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(closeCart);
  useEffect(() => { closeRef.current = closeCart; }, [closeCart]);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const controls = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      const visible = controls ? Array.from(controls).filter(control => control.getClientRects().length > 0) : [];
      if (!visible.length) return;
      const first = visible[0], last = visible[visible.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [isOpen]);

  return (
    <div className={`fixed inset-0 z-[60] ${isOpen ? "" : "pointer-events-none"}`} aria-hidden={!isOpen} inert={!isOpen}>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
      />
      {/* Panel */}
      <aside
        ref={panelRef}
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal={isOpen || undefined}
        aria-label="Shopping cart"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <ShoppingBag className="h-5 w-5 text-teal-600" />
          <h2 className="font-bold text-slate-900">Your cart</h2>
          {count > 0 && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">{count}</span>}
          <button onClick={closeCart} className="icon-button ml-auto" aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-3">
          {isOpen && <CartPanel onOrdered={() => { /* keep open to show success message */ }} />}
        </div>
      </aside>
    </div>
  );
}
