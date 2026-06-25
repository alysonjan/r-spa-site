import Section from "@/components/Section";
import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Newsletter | Rejuvenessence",
  description:
    "Subscribe for Seqex & ICR training announcements, practitioner resources, and wellness events hosted by Rejuvenessence in the GTA.",
  alternates: { canonical: "/newsletter" },
};

export default async function NewsletterPage() {
  let events: any[] = [];
  
  try {
    const { data } = await supabaseAdmin
      .from("newsletter_events")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) events = data;
  } catch (err) {
    console.error("Failed to load newsletter events:", err);
  }

  const upcomingEvents = events.filter(e => !e.is_archived);
  const archivedEvents = events.filter(e => e.is_archived);

  if (events.length === 0) {
    return (
      <Section eyebrow="Newsletter" title="Coming Soon">
        <div className="flex flex-col items-start gap-4 mt-4">
          <Mail className="w-10 h-10 text-emerald-600" />
          <p className="max-w-3xl text-lg text-zinc-600">
            Our newsletter is currently being updated. Please check back later!
          </p>
        </div>
      </Section>
    );
  }

  return (
    <>
      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Section title="Next in-person immersion">
          <div className="space-y-16">
            {upcomingEvents.map((event, index) => (
              <div key={event.id} className="grid gap-6 md:grid-cols-2 md:items-start">
                <div className="space-y-4 text-zinc-700">
                  {index === 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      RSVP opens soon — subscribers get the invite first.
                    </div>
                  )}
                  <h3 className="text-2xl font-semibold text-zinc-900">{event.title}</h3>
                  <ul className="space-y-2">
                    <li>
                      <strong>Date:</strong> {event.date_info}
                    </li>
                    {event.location && (
                      <li>
                        <strong>Format:</strong> {event.location}
                      </li>
                    )}
                  </ul>
                  
                  {event.description && (
                    <p className="text-zinc-700">{event.description}</p>
                  )}

                  {event.highlights && event.highlights.length > 0 && (
                    <div>
                      <strong>What you&apos;ll learn:</strong>
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        {event.highlights.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {event.link_url && (
                    <Link href={event.link_url} className="btn btn-primary mt-4 inline-flex w-full justify-center sm:w-auto">
                      {event.link_text || "Learn More"}
                    </Link>
                  )}
                </div>

                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100">
                  {event.image_url ? (
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      No Image Available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Past Events */}
      {archivedEvents.length > 0 && (
        <Section title="Most recent event (archived)">
          <div className="space-y-16">
            {archivedEvents.map((event) => (
              <div key={event.id} className="grid gap-6 md:grid-cols-2 md:items-start">
                <div className="space-y-4 text-zinc-700">
                  <p className="text-sm uppercase tracking-wide text-amber-600">
                    {event.date_info}
                  </p>
                  
                  <h3 className="text-xl font-semibold text-zinc-900">{event.title}</h3>
                  
                  <ul className="space-y-1">
                    {event.location && (
                      <li>
                        <strong>Location:</strong> {event.location}
                      </li>
                    )}
                    {event.description && (
                      <li>
                        {event.description}
                      </li>
                    )}
                  </ul>
                  
                  {event.highlights && event.highlights.length > 0 && (
                    <div className="pt-2">
                      <strong>Highlights:</strong>
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        {event.highlights.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!event.link_url && (
                    <p className="text-sm text-zinc-500 pt-2">
                      Missed it? Watch for replay links and future CE-eligible dates in your inbox.
                    </p>
                  )}

                  {event.link_url && (
                    <Link href={event.link_url} className="btn btn-outline mt-4 inline-flex w-full justify-center sm:w-auto">
                      {event.link_text || "Watch Replay"}
                    </Link>
                  )}
                </div>
                
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100">
                  {event.image_url ? (
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      No Image Available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

    </>
  );
}
