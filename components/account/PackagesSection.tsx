// components/account/PackagesSection.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import toast from "react-hot-toast";

type PackagePurchase = {
  id: string;
  package_code: string;
  is_gift: boolean;
  recipient_name: string | null;
  recipient_email: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  is_test?: boolean;
};

export default function PackagesSection() {
  const supabase = createClient();
  const [packages, setPackages] = useState<PackagePurchase[]>([]);
  const [catalog, setCatalog] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Please sign in to view your packages");
        return;
      }

      const res = await fetch("/api/account/packages", {
        cache: "no-store",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        setError("Please sign in to view your packages");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load packages");
      }

      const data = await res.json();
      setPackages(data.packages || []);

      // Also fetch the catalog to map names
      const { data: catalogData } = await supabase.from("holiday_packages").select("code, name");
      if (catalogData) {
        const catMap: Record<string, any> = {};
        catalogData.forEach(p => catMap[p.code] = p);
        setCatalog(catMap);
      }

    } catch (err: any) {
      console.error("Failed to load packages:", err);
      setError(err.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode(id: string) {
    try {
      // Copy first 8 characters of ID for easier display
      const shortId = id.slice(0, 8).toUpperCase();
      await navigator.clipboard.writeText(shortId);
      toast.success(`Code copied: ${shortId}`);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  }

  function formatAmount(cents: number, currency: string) {
    const dollars = cents / 100;
    return `CA$${dollars.toFixed(0)}`;
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">My Packages</h2>
        <p className="mt-6 text-sm text-zinc-500">Loading packages...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">My Packages</h2>
        <p className="mt-6 text-sm text-red-600">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">My Packages</h2>
          <p className="mt-2 text-sm text-zinc-600">
            View and manage your purchased holiday packages
          </p>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="mt-6 text-center py-12 border border-dashed border-zinc-300 rounded-lg">
          <div className="text-zinc-400 text-4xl mb-3">📦</div>
          <p className="text-zinc-600 text-sm mb-4">No packages yet</p>
          <a
            href="/holiday-packages"
            className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            Browse Holiday Packages
          </a>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {packages.map((pkg) => {
            const catalogPkg = catalog[pkg.package_code];
            const packageName = catalogPkg?.name || pkg.package_code;
            const isRedeemed = pkg.status === "redeemed" || pkg.redeemed_at !== null;
            const isTest = Boolean(pkg.is_test);

            return (
              <div
                key={pkg.id}
                className="border border-zinc-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left side - Package info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900">{packageName}</h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          Code: <span className="font-mono text-zinc-700">{pkg.id.slice(0, 8).toUpperCase()}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isRedeemed
                              ? "bg-zinc-100 text-zinc-700"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isRedeemed ? "Redeemed" : "Active"}
                        </span>
                        {isTest && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            TEST
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Package details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-zinc-500">Amount:</span>{" "}
                        <span className="font-semibold text-zinc-900">
                          {formatAmount(pkg.amount_cents, pkg.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Purchased:</span>{" "}
                        <span className="text-zinc-700">{formatDate(pkg.created_at)}</span>
                      </div>
                      {isRedeemed && pkg.redeemed_at && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-zinc-500">Redeemed:</span>{" "}
                          <span className="text-zinc-700">{formatDate(pkg.redeemed_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Gift info */}
                    {pkg.is_gift && pkg.recipient_name && (
                      <div className="mt-2 pt-2 border-t border-zinc-100">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-zinc-900">🎁</span>
                          <span className="text-zinc-600">
                            Gift to: <span className="font-medium text-zinc-900">{pkg.recipient_name}</span>
                            {pkg.recipient_email && (
                              <span className="text-zinc-500"> ({pkg.recipient_email})</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                    {isTest && (
                      <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                        This purchase is a live test order and cannot be redeemed in-store.
                      </div>
                    )}
                  </div>

                  {/* Right side - Copy button */}
                  <div className="flex sm:flex-col gap-2 sm:items-end">
                    <button
                      onClick={() => copyCode(pkg.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium"
                      title="Copy code for redemption"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Code
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer CTA */}
      {packages.length > 0 && (
        <div className="mt-6 pt-6 border-t border-zinc-200">
          <a
            href="/holiday-packages"
            className="inline-flex items-center text-sm text-zinc-700 hover:text-zinc-900 font-medium"
          >
            Browse more packages →
          </a>
        </div>
      )}
    </section>
  );
}
