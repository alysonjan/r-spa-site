"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Offer = {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  action_label?: string;
};

export default function ChristmasOfferFloating() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    // Fetch active offers via our backend API to bypass any RLS issues
    const fetchOffers = async () => {
      try {
        const res = await fetch("/api/special-offers");
        const json = await res.json();
        if (json.success && json.offers) {
          setOffers(json.offers);
        }
      } catch (err) {
        console.error("Failed to fetch special offers:", err);
      }
    };
    
    fetchOffers();
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalOpen]);

  // Lock body scroll and compensate for scrollbar width
  useEffect(() => {
    if (modalOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      };
    }
  }, [modalOpen]);

  function handleOfferAction(offer: Offer) {
    if (offer.type === "packages") {
      router.push("/holiday-packages");
      setModalOpen(false);
      return;
    }

    // Save to localStorage
    try {
      localStorage.setItem("christmas_offer_selected", offer.code);
      window.dispatchEvent(new Event("offer:changed"));
      toast.success(`${offer.title} applied! 🎄`, {
        duration: 3000,
        icon: "🎁",
      });
      setModalOpen(false);
    } catch (e) {
      toast.error("Failed to apply offer");
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 group transform-gpu"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="relative flex items-center gap-2 bg-gradient-to-r from-red-600 to-green-600 text-white px-4 py-3 rounded-full shadow-lg transform-gpu will-change-transform"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={{
              rotate: [0, -12, 12, -12, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            <Gift className="h-5 w-5 md:h-6 md:w-6" />
          </motion.div>
          <span className="font-semibold text-sm md:text-base whitespace-nowrap hidden sm:inline">
            Holiday Offers
          </span>
          <Sparkles className="h-4 w-4 hidden md:inline" />

          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-red-400 to-green-400 rounded-full blur-xl -z-10 opacity-50"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </motion.button>

      {/* Offer Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/50 md:backdrop-blur-sm"
            />

            {/* Modal Panel */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] transform-gpu will-change-transform"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-red-600 to-green-600 text-white px-6 py-4 rounded-t-3xl md:rounded-t-2xl flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <Gift className="h-6 w-6" />
                  <div>
                    <h2 className="text-xl font-bold">
                      Holiday Special Offers
                    </h2>
                    <p className="text-sm text-white/90">
                      Limited time only - Choose your perfect gift 🎄
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Offers Grid */}
              <div className="p-6 grid gap-4 md:grid-cols-2">
                {offers.map((offer, index) => (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative border-2 border-zinc-200 rounded-xl p-4 hover:border-emerald-400 hover:shadow-lg transition-all group bg-gradient-to-br from-white to-zinc-50"
                  >
                    {/* Sparkle decoration */}
                    <div className="absolute top-2 right-2 text-yellow-500 opacity-0 group-hover:opacity-100 transition">
                      <Sparkles className="h-5 w-5" />
                    </div>

                    <h3 className="font-bold text-lg mb-2 text-zinc-900 pr-8">
                      {offer.title}
                    </h3>
                    <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
                      {offer.description}
                    </p>

                    <button
                      onClick={() => handleOfferAction(offer)}
                      className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all ${
                        offer.type === "packages"
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {offer.action_label || "Apply"}
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 text-center text-sm text-zinc-500">
                <p className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  These offers are available for a limited time only
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
