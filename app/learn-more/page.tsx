"use client";

import Section from "@/components/Section";
import { Sparkles } from "lucide-react";

export default function TherapiesPage() {
  return (
    <>
      <Section eyebrow="Therapies" title="Coming Soon">
        <div className="flex flex-col items-start gap-4 mt-4">
          <Sparkles className="w-10 h-10 text-emerald-600" />
          <p className="max-w-3xl text-lg text-zinc-600">
            This page is currently being updated. Please check back later!
          </p>
        </div>
      </Section>
    </>
  );
}
