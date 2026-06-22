// app/packages/checkout/CheckoutClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatPackagePrice, type PackageCatalogItem } from "@/lib/packages-db";

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pkg, setPkg] = useState<PackageCatalogItem | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const supabase = createClient();

  // Check authentication and load package
  useEffect(() => {
    const init = async () => {
      try {
        // Check auth
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setError("Please sign in to purchase packages.");
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
          return;
        }

        setIsAuthenticated(true);

        // Get package from query param
        const packageCode = searchParams.get("package");
        if (!packageCode) {
          setError("No package selected.");
          setIsCheckingAuth(false);
          return;
        }

        // Load package data from our new API to bypass RLS
        const res = await fetch(`/api/holiday-packages/${packageCode}`);
        const json = await res.json();

        if (!res.ok || !json.success || !json.package) {
          setError(json.error || "Package not found or no longer available.");
          setIsCheckingAuth(false);
          return;
        }

        const row = json.package;

        setPkg({
          id: row.id,
          code: row.code,
          name: row.name,
          priceCents: row.priceCents,
          shortDesc: row.shortDesc,
          inclusions: row.inclusions,
          highlight: row.highlight,
          finePrint: row.finePrint,
          available: row.available,
          activeTo: row.activeTo,
        });
      } catch (e) {
        setError("An error occurred. Please try again.");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    init();
  }, [searchParams, supabase]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/sign-in?redirect=${returnUrl}`);
    }
  }, [isCheckingAuth, isAuthenticated, router]);

  // Handle payment
  const handleProceedToPayment = async () => {
    if (!pkg) return;

    // Validate gift fields if gift option is selected
    if (isGift) {
      if (!recipientName.trim() || !recipientEmail.trim()) {
        setPaymentError("Recipient name and email are required for gifts.");
        return;
      }
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.access_token) {
        // Redirect to sign-in if no session
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/sign-in?redirect=${returnUrl}`);
        return;
      }

      const response = await fetch("/api/stripe/package-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          packageCode: pkg.code,
          isGift,
          recipientName: isGift ? recipientName : undefined,
          recipientEmail: isGift ? recipientEmail : undefined,
          message: isGift ? giftMessage : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setPaymentError(err.message || "Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">
          {error || "Package not found"}
        </h2>
        <Link
          href="/holiday-packages"
          className="inline-flex items-center gap-2 text-zinc-900 hover:text-zinc-700 font-medium"
        >
          ← Back to Packages
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Package Summary */}
      <div className="bg-white border-2 border-zinc-200 rounded-2xl overflow-hidden">
        <div className="bg-zinc-900 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Order Summary</h2>
          <p className="text-white/80 text-sm">Review your package details</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Package Details */}
          <div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              {pkg.name}
            </h3>
            <p className="text-sm text-zinc-600 mb-4">{pkg.shortDesc}</p>

            <div className="space-y-2">
              <h4 className="font-semibold text-zinc-900 text-sm uppercase tracking-wide">
                Included:
              </h4>
              <ul className="space-y-1">
                {pkg.inclusions.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-zinc-700">
                    <span className="text-zinc-900 mt-0.5 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Price */}
          <div className="border-t border-zinc-200 pt-4">
            <div className="flex items-center justify-between text-lg">
              <span className="font-semibold text-zinc-900">Total:</span>
              <span className="text-2xl font-bold text-zinc-900">
                {formatPackagePrice(pkg.priceCents)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gift Option */}
      <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => setIsGift(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="font-semibold text-zinc-900">Buying as a gift?</span>
        </label>

        {isGift && (
          <div className="space-y-4 pl-7 border-l-2 border-zinc-200">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Recipient Name *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                required={isGift}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                required={isGift}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Gift Message (Optional)
              </label>
              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                placeholder="Add a personal message..."
              />
              <p className="text-xs text-zinc-500 mt-1">
                {giftMessage.length}/500 characters
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Button */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8">
        {paymentError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {paymentError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/holiday-packages"
            className="inline-flex items-center justify-center px-6 py-3 border-2 border-zinc-900 text-zinc-900 rounded-xl font-semibold hover:bg-zinc-900 hover:text-white transition-colors"
          >
            ← Back to Packages
          </Link>
          <button
            onClick={handleProceedToPayment}
            disabled={isProcessing}
            className="inline-flex items-center justify-center px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-700 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>
      </div>

      {/* Terms */}
      {pkg.finePrint.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h4 className="font-semibold text-zinc-900 mb-3 text-sm uppercase tracking-wide">
            Terms & Conditions
          </h4>
          <ul className="space-y-2">
            {pkg.finePrint.map((item, index) => (
              <li key={index} className="text-xs text-zinc-600">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
