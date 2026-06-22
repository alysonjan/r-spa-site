// app/admin/redeem/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

import toast from "react-hot-toast";

type PackagePurchase = {
  id: string;
  package_code: string;
  buyer_user_id: string;
  is_gift: boolean;
  recipient_name: string | null;
  recipient_email: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  stripe_session_id: string;
  is_test?: boolean;
};

export default function AdminRedeemPage() {
  const [code, setCode] = useState("");
  const [catalog, setCatalog] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [purchase, setPurchase] = useState<PackagePurchase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Fetch catalog on mount
    supabase.from("holiday_packages").select("code, name").then(({ data }) => {
      if (data) {
        const catMap: Record<string, any> = {};
        data.forEach(p => catMap[p.code] = p);
        setCatalog(catMap);
      }
    });
  }, [supabase]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();

    if (!code.trim()) {
      setError("Please enter a redeem code");
      return;
    }

    setLoading(true);
    setError(null);
    setPurchase(null);

    try {
      const res = await fetch("/api/admin/packages/lookup", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setError("Unauthorized. Please sign in to the admin panel.");
        toast.error("Unauthorized");
        return;
      }

      if (res.status === 403) {
        setError("Access denied. You are not authorized to redeem packages.");
        toast.error("Access denied");
        return;
      }

      if (res.status === 404) {
        setError("Package not found. Please check the code and try again.");
        return;
      }

      if (res.status === 409 && data.error === "ambiguous_code") {
        setError(
          `Code is ambiguous (${data.count} matches). Please enter a longer code or the full UUID.`
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to lookup package");
      }

      setPurchase(data.purchase);
      toast.success("Package found!");
    } catch (err: any) {
      console.error("Lookup error:", err);
      setError(err.message || "Failed to lookup package");
      toast.error("Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    if (!purchase) return;

    setRedeeming(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/packages/redeem", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: purchase.id }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setError("Unauthorized. Please sign in to the admin panel.");
        toast.error("Unauthorized");
        return;
      }

      if (res.status === 403) {
        setError("Access denied. You are not authorized to redeem packages.");
        toast.error("Access denied");
        return;
      }

      if (res.status === 409 && data.error === "already_redeemed") {
        setError("This package has already been redeemed.");
        toast.error("Already redeemed");
        // Refresh purchase data with redeemed status
        setPurchase({
          ...purchase,
          redeemed_at: new Date().toISOString(),
          redeemed_by: "passcode_admin",
          status: "redeemed"
        });
        return;
      }

      if (res.status === 400 && data.error === "not_redeemable") {
        setError(`Package is not redeemable (status: ${purchase.status})`);
        toast.error("Not redeemable");
        return;
      }

      if (res.status === 400 && data.error === "test_purchase_not_redeemable") {
        setError("This is a test purchase and cannot be redeemed.");
        toast.error("Test purchase cannot be redeemed");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to redeem package");
      }

      // Success - refresh package data
      setPurchase({
        ...purchase,
        status: "redeemed",
        redeemed_at: new Date().toISOString(),
        redeemed_by: "passcode_admin"
      });
      toast.success("Package redeemed successfully! ✅");

      // Clear code input
      setCode("");
    } catch (err: any) {
      console.error("Redeem error:", err);
      setError(err.message || "Failed to redeem package");
      toast.error("Redemption failed");
    } finally {
      setRedeeming(false);
    }
  }

  async function copyCode(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  }

  function formatAmount(cents: number, currency: string) {
    return `CA$${(cents / 100).toFixed(0)}`;
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900">Package Redemption</h1>
            <p className="mt-2 text-zinc-600">
              Enter a redeem code (8 characters or full UUID) to lookup and redeem packages.
            </p>
          </div>

          {/* Lookup Form */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-zinc-700 mb-2">
                  Redeem Code
                </label>
                <div className="flex gap-3">
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g., a1b2c3d4 or full UUID"
                    className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent font-mono text-sm"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? "Looking up..." : "Lookup"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </form>
          </div>

          {/* Package Details Card */}
          {purchase && (
            <div className="mt-6 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              {/* Header with Status */}
              <div className="bg-zinc-900 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {catalog[purchase.package_code]?.name || purchase.package_code}
                    </h2>
                    <p className="text-white/80 text-sm mt-1">Package Details</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      purchase.redeemed_at || purchase.status === "redeemed"
                        ? "bg-white/20 text-white"
                        : purchase.status === "paid"
                        ? "bg-green-500 text-white"
                        : "bg-yellow-500 text-zinc-900"
                    }`}
                  >
                    {purchase.redeemed_at || purchase.status === "redeemed"
                      ? "Redeemed"
                      : purchase.status === "paid"
                      ? "Active"
                      : purchase.status}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {purchase.is_test && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                    This is a live test purchase (created via the $1 Stripe flow) and cannot be redeemed in store.
                  </div>
                )}
                {/* Purchase ID */}
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">
                    Purchase ID
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-mono text-zinc-900">
                      {purchase.id}
                    </code>
                    <button
                      onClick={() => copyCode(purchase.id)}
                      className="px-3 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
                      title="Copy full UUID"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Package Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-1">Amount</label>
                    <div className="text-lg font-semibold text-zinc-900">
                      {formatAmount(purchase.amount_cents, purchase.currency)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-1">Package Code</label>
                    <div className="text-lg font-semibold text-zinc-900">
                      {purchase.package_code}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-1">Purchased</label>
                    <div className="text-sm text-zinc-700">{formatDate(purchase.created_at)}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-1">Status</label>
                    <div className="text-sm font-medium text-zinc-900">{purchase.status}</div>
                  </div>
                </div>

                {/* Gift Info */}
                {purchase.is_gift && purchase.recipient_name && (
                  <div className="pt-4 border-t border-zinc-200">
                    <label className="block text-sm font-medium text-zinc-500 mb-2">
                      🎁 Gift Information
                    </label>
                    <div className="bg-zinc-50 rounded-lg p-4">
                      <div className="text-sm">
                        <span className="font-medium text-zinc-900">{purchase.recipient_name}</span>
                        {purchase.recipient_email && (
                          <span className="text-zinc-600"> ({purchase.recipient_email})</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Redemption Info */}
                {purchase.redeemed_at && (
                  <div className="pt-4 border-t border-zinc-200">
                    <label className="block text-sm font-medium text-zinc-500 mb-2">
                      Redemption Information
                    </label>
                    <div className="bg-zinc-50 rounded-lg p-4 space-y-2">
                      <div className="text-sm">
                        <span className="text-zinc-600">Redeemed at:</span>{" "}
                        <span className="font-medium text-zinc-900">{formatDate(purchase.redeemed_at)}</span>
                      </div>
                      {purchase.redeemed_by && (
                        <div className="text-sm">
                          <span className="text-zinc-600">Redeemed by:</span>{" "}
                          <span className="font-medium text-zinc-900">{purchase.redeemed_by}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Redeem Button */}
                <div className="pt-4 border-t border-zinc-200">
                  <button
                    onClick={handleRedeem}
                    disabled={
                      redeeming ||
                      purchase.redeemed_at !== null ||
                      purchase.status === "redeemed" ||
                      purchase.status !== "paid" ||
                      purchase.is_test
                    }
                    className="w-full px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
                  >
                    {redeeming
                      ? "Redeeming..."
                      : purchase.redeemed_at || purchase.status === "redeemed"
                      ? "Already Redeemed"
                      : purchase.status !== "paid"
                      ? `Cannot Redeem (${purchase.status})`
                      : "Redeem Now"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Instructions</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter the first 8 characters of the package ID (e.g., a1b2c3d4)</li>
              <li>• Or paste the full UUID for exact match</li>
              <li>• Click &quot;Lookup&quot; to find the package</li>
              <li>• Review the details and click &quot;Redeem Now&quot; to complete redemption</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
