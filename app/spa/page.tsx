// app/spa/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Spa & Massage Treatments",
  description:
    "Head, back & shoulders, full body, lymphatic drainage, and foot massage treatments. Transparent pricing in Keswick / Toronto.",
  alternates: { canonical: "/spa" },
};

function PageHeader() {
  return (
    <section className="relative">
      <div className="relative h-[38svh] sm:h-[44svh] lg:h-[52svh]">
        <Image
          src="/gallery/spa.jpg"
          alt="Spa treatments"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white">
              Spa Treatments
            </h1>
            <p className="mt-3 text-white/90">
              Classic options, tailored to the way you feel today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const STANDARD_MASSAGES = [
  {
    title: "Head Massage",
    description: "Scalp-focused session with neck relief",
  },
  {
    title: "Back & Shoulders Massage",
    description: "Back tension relief, posture-friendly",
  },
  {
    title: "Foot Massage",
    description: "Focused foot and lower leg relaxation",
  },
  {
    title: "Full Body Massage",
    description: "Slow, balanced flow for full relaxation",
  },
] as const;

function SectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <div className="text-[11px] tracking-[0.22em] text-zinc-500 uppercase font-semibold">
        {kicker}
      </div>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl md:text-5xl text-zinc-950">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-sm sm:text-base text-zinc-600 max-w-3xl leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

function UnifiedPricingBar() {
  return (
    <div className="mb-10 rounded-2xl border border-zinc-200 bg-white">
      <div className="px-5 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-950">Standard Massage Pricing</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">Pick your time, we’ll do the rest.</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="inline-flex items-center rounded-full border border-zinc-950 px-3 py-1 text-zinc-950 font-semibold">
              45 min <span className="ml-2 font-normal text-zinc-700">CA$75</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-zinc-950 px-3 py-1 text-zinc-950 font-semibold">
              60 min <span className="ml-2 font-normal text-zinc-700">CA$100</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-zinc-950 px-3 py-1 text-zinc-950 font-semibold">
              90 min <span className="ml-2 font-normal text-zinc-700">CA$150</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createClient } from "@supabase/supabase-js";

export const revalidate = 0;

export default async function SpaPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[SpaPage] Supabase error:", error);
  } else {
    console.log("[SpaPage] Services fetched:", services?.length);
  }

  return (
    <>
      <PageHeader />

      <section className="py-10 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mb-16">
            <SectionHeader
              kicker="Our Treatments"
              title="Spa & Massage"
              subtitle="Browse our full list of available treatments. Pricing and duration are clearly listed for each session."
            />

            {Array.from(new Set((services || []).map(s => s.category || 'Therapies'))).map((catName) => {
              const categoryServices = (services || []).filter(
                s => (s.category || 'Therapies') === catName
              );

              if (categoryServices.length === 0) return null;

              return (
                <div key={catName} className="mt-12 first:mt-0">
                  <h3 className="text-2xl font-serif text-zinc-950 mb-6 pb-2 border-b border-zinc-200">
                    {catName}
                  </h3>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryServices.map((s) => {
                      const firstOption = s.options?.[0] || { time: '60', price: '0' };
                      return (
                        <div
                          key={s.id}
                          className="rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 flex flex-col justify-between"
                        >
                          <div>
                            <h4 className="font-semibold text-xl text-zinc-950 leading-snug pr-4">
                              {s.title}
                            </h4>
                            {s.description && (
                              <p className="mt-2 text-sm text-zinc-600">
                                {s.description}
                              </p>
                            )}
                            <div className="mt-4 flex items-center gap-3 text-sm text-zinc-600">
                              <span className="font-medium text-zinc-900">{firstOption.time} min</span>
                              {parseFloat(firstOption.price) > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="font-medium text-zinc-900">CA${parseFloat(firstOption.price).toFixed(0)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mt-8 pt-4 border-t border-zinc-100">
                            <Link
                              href={`/booking?service=${encodeURIComponent(s.title)}&minutes=${firstOption.time}`}
                              className="inline-flex items-center text-sm font-semibold text-zinc-900 hover:underline"
                            >
                              Book now <span className="ml-1 text-lg leading-none">→</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Page-level CTA (only here) */}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center rounded-2xl bg-black px-5 py-3 text-white hover:opacity-90"
            >
              Book an appointment
            </Link>
            <Link
              href="/amenities"
              className="inline-flex items-center rounded-2xl border border-black px-5 py-3 hover:bg-black/5"
            >
              Sauna & Hot Tub
            </Link>
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            Services are relaxation-focused and non-diagnostic. Please inform us of
            sensitivities or conditions prior to your session.
          </p>
        </div>
      </section>
    </>
  );
}
