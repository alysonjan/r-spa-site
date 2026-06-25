import Section from "@/components/Section";
import Image from "next/image";
import Link from "next/link";

const UPCOMING_EVENT = {
  title: "Seqex & ICR Therapy Immersion",
  date: "Spring 2026 (exact date TBA)",
  time: "Weekend intensive — Toronto / York Region",
  focus: [
    "Hands-on training with Seqex devices",
    "ICR therapy protocols for practitioners",
    "Clinic implementation and compliance update",
  ],
};

export const metadata = {
  title: "Newsletter | Rejuvenessence",
  description:
    "Subscribe for Seqex & ICR training announcements, practitioner resources, and wellness events hosted by Rejuvenessence in the GTA.",
  alternates: { canonical: "/newsletter" },
};

export default function NewsletterPage() {
  return (
    <>
      {/* 顶部标题 */}
      <Section eyebrow="Newsletter" title="Experience the Future of Healing">
        <p className="max-w-2xl text-lg text-zinc-600">
          Discover upcoming immersions, live trainings, and wellness events that highlight Ion Cyclotron
          Resonance (ICR) therapy, Seqex technology, and practical tools for your studio. Join the list to
          be notified as soon as new seats open.
        </p>
      </Section>

      {/* Upcoming Event */}
      <Section title="Next in-person immersion">
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <div className="space-y-4 text-zinc-700">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              RSVP opens soon — subscribers get the invite first.
            </div>
            <h3 className="text-2xl font-semibold text-zinc-900">{UPCOMING_EVENT.title}</h3>
            <ul className="space-y-2">
              <li>
                <strong>Date:</strong> {UPCOMING_EVENT.date}
              </li>
              <li>
                <strong>Format:</strong> {UPCOMING_EVENT.time}
              </li>
            </ul>
            <div>
              <strong>What you&apos;ll learn:</strong>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {UPCOMING_EVENT.focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Link href="/booking" className="btn btn-primary mt-4 inline-flex w-full justify-center sm:w-auto">
              Join the waitlist
            </Link>
          </div>

          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100">
            <Image
              src="/newsletter/icr-flyer.jpg"
              alt="Seqex / ICR training preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </Section>

      {/* Past event */}
      <Section title="Most recent event (archived)">
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <div className="space-y-4 text-zinc-700">
            <p className="text-sm uppercase tracking-wide text-amber-600">
              November 16, 2025 — concluded
            </p>
            <ul className="space-y-1">
              <li>
                <strong>Location:</strong> 7250 Keele Street, Vaughan ON
              </li>
              <li>
                <strong>Speaker:</strong> Dr. Alberto Garoli, CEO of Aurora Nutriceutics & Physiomed
              </li>
              <li>
                <strong>Highlights:</strong> Seqex protocols, clinic Q&amp;A, nutrition for recovery
              </li>
            </ul>
            <p className="text-sm text-zinc-500">
              Missed it? Watch for replay links and future CE-eligible dates in your inbox.
            </p>
          </div>
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100">
            <Image
              src="/newsletter/icr-flyer.jpg"
              alt="ICR Therapy recap"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </Section>

      {/* 内容介绍 */}
      <Section title="ICR Therapy and Seqex Technology">
        <div className="space-y-4 text-zinc-700 leading-relaxed">
          <p>
            <strong>ICR Therapy</strong> bridges biophysics and medicine, leveraging the natural
            resonance between ions, proteins, and the geomagnetic field to restore cellular balance.
            Human bodies are sensitive to extremely low frequency electromagnetic fields (ELF-EMF),
            and research shows specific magnetic field frequencies can modulate Ca²⁺, Mg²⁺, and
            other ions for better healing.
          </p>
          <p>
            Documented effects include reduced oxidative stress, modulation of inflammation,
            stimulation of microcirculation and tissue regeneration, pain control, and balance of the
            autonomic nervous system — all contributing to deep relaxation and cellular rejuvenation.
          </p>
          <p>
            Seqex devices operate within safe, Health Canada-licensed ranges and represent the next
            generation of bioenergetic wellness technology.
          </p>
        </div>
      </Section>

      {/* 结尾 CTA */}
      <Section>
        <div className="flex flex-wrap gap-3">
          <Link href="/booking" className="btn btn-outline">
            Explore Seqex Sessions
          </Link>
          <Link
            href="https://www.seqex.ca"
            target="_blank"
            className="btn btn-ghost"
          >
            Visit Seqex.ca
          </Link>
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          This newsletter is part of our ongoing educational series. Subscribe below to receive
          upcoming wellness news and event invitations.
        </p>
      </Section>
    </>
  );
}
