"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, ArrowRight } from "lucide-react";

type SpecialOffer = {
  code: string;
  title: string;
  type: string;
};

export default function OfferStatusBar() {
  const [mounted, setMounted] = useState(false);
  const [offerCode, setOfferCode] = useState<string | null>(null);
  const [offerTitle, setOfferTitle] = useState<string | null>(null);
  const [isGiftCardOffer, setIsGiftCardOffer] = useState(false);
  const router = useRouter();

  // Load offer from localStorage
  const loadOffer = async () => {
    try {
      const code = localStorage.getItem("christmas_offer_selected");
      setOfferCode(code);
      if (code) {
        // Fetch title dynamically
        const res = await fetch("/api/special-offers");
        const json = await res.json();
        if (json.success && json.offers) {
          const matched = json.offers.find((o: SpecialOffer) => o.code === code);
          if (matched) {
            setOfferTitle(matched.title);
            setIsGiftCardOffer(matched.type === "giftcard");
          }
        }
      } else {
        setOfferTitle(null);
      }
    } catch (e) {
      // API or localStorage failed
    }
  };

  useEffect(() => {
    setMounted(true);
    loadOffer();

    // Listen for storage changes (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "christmas_offer_selected") {
        loadOffer();
      }
    };

    // Listen for custom event (same-tab)
    const handleOfferChanged = () => {
      loadOffer();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("offer:changed", handleOfferChanged);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("offer:changed", handleOfferChanged);
    };
  }, []);

  const handleClear = () => {
    try {
      localStorage.removeItem("christmas_offer_selected");
      setOfferCode(null);
      window.dispatchEvent(new Event("offer:changed"));
    } catch (e) {
      // localStorage not available
    }
  };

  if (!mounted || !offerCode) return null;

  const offerLabel = offerTitle || offerCode;

  const handleAction = () => {
    router.push(isGiftCardOffer ? "/giftcard/purchase" : "/booking");
  };

  const actionLabel = isGiftCardOffer ? "Go to Gift Cards" : "Go to Booking";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-4 right-4 md:top-6 md:right-6 z-40 max-w-sm"
        role="status"
        aria-live="polite"
        aria-label={`Offer applied: ${offerLabel}`}
      >
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg p-4 flex items-start gap-3">
          <div className="flex-shrink-0">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">🎁 Offer Applied</p>
            <p className="text-xs text-white/90 truncate">{offerLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAction}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label={actionLabel}
              title={actionLabel}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Clear offer"
              title="Clear Offer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
