"use client";

import { motion } from "framer-motion";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Section from "@/components/Section";

// export const metadata: Metadata = {
//   title: "Therapies",
//   description:
//     "Seqex PEMF, Plasma Light (RX1/RX6) and Ondamed biofeedback — how they work, benefits, and what to expect.",
//   alternates: { canonical: "/therapies" },
// };

export default function TherapiesPage() {
  return (
    <>
      {/* 顶部介绍 */}
      <Section eyebrow="Therapies" title="Seqex, Plasma Light & Ondamed">
        <p className="max-w-3xl text-lg text-zinc-600">
          Learn how our modern modalities support relaxation, recovery and
          overall wellness. Devices are licensed by Health Canada and used as
          non-medical wellness sessions.
        </p>
      </Section>

      {/* Seqex */}
      <Section title="Seqex (45–60 min sessions)">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100">
            <Image
              src="/gallery/seqex-L.jpg"
              alt="Seqex PEMF"
              fill
              className="object-contain p-6 sm:p-10"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="space-y-4">
            <p>
              <strong>SEQEX</strong> is a pulsed electromagnetic field (PEMF)
              device that uses the earth’s geomagnetic field together with low
              level frequencies to help bring the body back into electrical
              balance and harmony. This supports cellular function, encouraging
              detoxification, circulation, comfort and overall healing response.
            </p>
            <p>
              It is the{" "}
              <em>
                first PEMF device implementing Ion Cyclotronic Resonance–like
                therapy licensed by Health Canada (Class II)
              </em>
              . As part of integrated wellness, Seqex pairs well with
              traditional therapeutics for more complete outcomes.
            </p>
            <div className="flex gap-3">
              <Link href="/booking" className="btn btn-primary">
                Book a Seqex session
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Plasma Light */}
      <Section title="Plasma Light (20–45 min sessions)">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="order-2 md:order-1 space-y-4">
            <p>
              This near-infrared light approach stimulates the body at a
              cellular level to promote comfort, tissue regeneration and
              recovery. It’s used for a wide range of goals such as easing
              joint/nerve discomfort, supporting skin concerns, and balancing
              energy and hormones.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              viewport={{ once: true }}
              className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm text-sm text-zinc-700 leading-relaxed"
            >
              <p className="mb-1 font-semibold text-amber-800">
                ⚠️ Currently unavailable at this location
              </p>
              <p>
                This service is not being performed at our Keswick facility at
                this time. However, our affiliate partner in{" "}
                <strong>Barrie / Wasaga Beach</strong> is able to conduct these
                services and will be happy to assist in caring for your specific
                needs.
              </p>
              <p className="mt-2">
                In the near future such services &amp; procedures will again be
                made available here. Please continue to check our website to
                stay up-to-date.
              </p>
              <p className="mt-3 text-sm">
                📍{" "}
                <a
                  href="https://maps.google.com/maps/place//data=!4m2!3m1!1s0x882a7b9410321e69:0x260b3cf80f05f5de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-800 underline"
                >
                  1423 Mosley St #3, Wasaga Beach, ON L9Z 2C3
                </a>{" "}
                | ☎️ (705) 352-3900
              </p>
            </motion.div>
          </div>

          <div className="order-1 md:order-2 relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100">
            <Image
              src="/gallery/plasma.png"
              alt="Plasma Light devices"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </Section>

      {/* Ondamed */}
      <Section title="Ondamed (60–90 min sessions)">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100">
            <Image
              src="/gallery/seqex-main.png"
              alt="Ondamed biofeedback"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="space-y-4">
            <p>
              <strong>ONDAMED</strong> combines biofeedback with focused PEMF to
              personalize a session by stimulating the body’s own
              electromagnetic communication. Pulse and oxygen levels are
              monitored to guide targeted support for stress, pain and recovery
              across various conditions.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              viewport={{ once: true }}
              className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm text-sm text-zinc-700 leading-relaxed"
            >
              <p className="mb-1 font-semibold text-amber-800">
                ⚠️ Currently unavailable at this location
              </p>
              <p>
                This service is temporarily unavailable in Keswick. Our
                affiliate centre in <strong>Barrie / Wasaga Beach</strong>{" "}
                continues to offer ONDAMED sessions and will gladly accommodate
                your needs.
              </p>
              <p className="mt-2">
                We anticipate reintroducing this service soon. Please check back
                for updates or contact our affiliate directly for assistance.
              </p>
              <p className="mt-3 text-sm">
                📍{" "}
                <a
                  href="https://maps.google.com/maps/place//data=!4m2!3m1!1s0x882a7b9410321e69:0x260b3cf80f05f5de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-800 underline"
                >
                  1423 Mosley St #3, Wasaga Beach, ON L9Z 2C3
                </a>{" "}
                | ☎️ (705) 352-3900
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* We help with */}
      <Section title="We help with">
        <ul className="grid gap-2 text-zinc-700 md:grid-cols-2">
          {[
            "Pain and inflammation reduction",
            "Enhanced cellular response & circulation",
            "Improved tissue oxygenation & detoxification",
            "Regeneration of bone/soft tissue & muscle relaxation",
            "Increased energy, brain function & sleep quality",
            "Support for nervous system & hormone balancing",
            "Accelerated wound healing and faster recovery",
            "Osteoblast/fibroblast activation for bone & collagen",
            "PRP / stem-cell activation & anti-aging benefits",
            "Support for arthritis, neuropathy, fibromyalgia, skin",
            "Improved muscle strength, tone, flexibility & metabolism",
            "Stimulated lymphatic system and reduced cellulite",
            "Support for sexual, prostate & pelvic floor wellness",
            "Relief from back pain, osteoporosis & neurological concerns",
            "…and more",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-900" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Testimonials */}
      <Section title="Client testimonials">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              q: "I have suffered from interstitial cystitis for years… The Seqex machine changed my life. I am pain-free and living a normal life again.",
              a: "Blaire H.",
            },
            {
              q: "Whether pain, mental health or overall well-being, I could feel the difference every time. It was a game changer for my inflammatory disease.",
              a: "Bara D.",
            },
            {
              q: "In 10 days I no longer used my cane. Soon I started backing off pain medicine; months in, I’m coming off medication and even cancelled surgery.",
              a: "Justin S.",
            },
          ].map(({ q, a }) => (
            <blockquote
              key={a}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <p className="text-zinc-700">“{q}”</p>
              <footer className="mt-4 text-sm font-medium text-zinc-500">
                — {a}
              </footer>
            </blockquote>
          ))}
        </div>
      </Section>

      {/* RX1 Seat */}
      <Section title="RX1 Seat (near-infrared phototherapy)">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="space-y-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
              <Image
                src="/therapies/rx1-1.jpg"
                alt="RX1 Seat device"
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
              <Image
                src="/therapies/rx1-2.jpg"
                alt="RX1 Seat session"
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="space-y-4 text-zinc-700">
            <p>
              <strong>RX1 Seat</strong> uses near-infrared light to stimulate
              tissue at the cellular level (≈600–1200 nm). Typical session length
              is about <strong>20 minutes</strong>. It can be a targeted add-on
              or a standalone light session for comfort, faster recovery and
              circulation.
            </p>

            <div>
              <h4 className="mb-2 font-semibold">
                For use in gyms, spas & physical therapy
              </h4>
              <ul className="space-y-2">
                {[
                  "Near Infrared phototherapy (600–1200 nm) to promote cellular rejuvenation and well-being.",
                  "Pain relief, wound healing, and pressure-sore prevention via photobiomodulation.",
                  "Helps with hemorrhoid-related shrinkage / pain / itching; supports incontinence.",
                  "Regaining anal sphincter muscle elasticity with multiple uses.",
                  "Pelvic floor muscle rehab for urinary incontinence.",
                  "Reduced minor prostate & urinary-tract related pain as an adjunct device.",
                  "Support for erectile concerns in diabetic/elderly patients (non-drug approach).",
                  "Improved testicular micro-circulation for testosterone output; support in male infertility with increased sperm motility.",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-zinc-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">
                Cosmetic uses (by plastic surgeons)
              </h4>
              <ul className="space-y-2">
                {[
                  "Vaginal rejuvenation: treat dryness/aging; tighten perineal muscles after childbirth.",
                  "Faster healing and reduced inflammation post-labiaplasty.",
                  "Non-invasive alternative to minor laser procedures.",
                  "Reduced hyper-pigmentation in genital and anal areas.",
                  "Reduced redness / inflammation / itching after invasive medical treatment in genital/anal areas.",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-zinc-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/booking" className="btn btn-outline">
                Book RX1 Seat
              </Link>
              <Link href="/seqex" className="btn btn-ghost">
                See full menu
              </Link>
            </div>

            <p className="text-sm text-zinc-500">
              Sessions support general wellness. Individual response varies
              depending on your goals, history and consistency.
            </p>
          </div>
        </div>
      </Section>

      {/* 结尾 CTA */}
      <Section>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/booking" className="btn btn-primary">
            Book now
          </Link>
          <Link href="/faq" className="btn btn-ghost">
            Read FAQ
          </Link>
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          Devices are licensed by Health Canada. Sessions are for wellness
          purposes and not a substitute for medical diagnosis or treatment.
        </p>
      </Section>
    </>
  );
}
