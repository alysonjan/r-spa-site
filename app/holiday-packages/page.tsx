// app/holiday-packages/page.tsx
import { Suspense } from "react";
import { getActivePackages } from "@/lib/packages-db";
import HolidayPackagesClient from "./HolidayPackagesClient";

export const metadata = {
  title: "Holiday Packages",
  description:
    "Exclusive seasonal wellness packages - the perfect gift for yourself or loved ones.",
};

export default async function HolidayPackagesPage() {
  const packages = await getActivePackages();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Packages Grid - wrapped in Suspense to handle searchParams */}
      <Suspense fallback={<PackagesLoadingFallback />}>
        <HolidayPackagesClient packages={packages} />
      </Suspense>
    </div>
  );
}

function PackagesLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="h-8 bg-white/20 rounded-full w-48 mx-auto mb-6" />
          <div className="h-12 bg-white/20 rounded w-3/4 mx-auto mb-4" />
          <div className="h-6 bg-white/20 rounded w-2/3 mx-auto" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border-2 border-zinc-200 rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-zinc-200 rounded w-3/4" />
                <div className="h-4 bg-zinc-200 rounded w-1/2" />
                <div className="h-4 bg-zinc-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
