// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import dynamic from "next/dynamic";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE } from "@/lib/admin/adminAuth";

const ChristmasOfferFloating = dynamic(
  () => import("@/components/ChristmasOfferFloating"),
  { ssr: false },
);

const OfferStatusBar = dynamic(() => import("@/components/OfferStatusBar"), {
  ssr: false,
});

const SITE_NAME = "Rejuvenessence";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rejuvenessence.org";

// ===== SEO Metadata =====
export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} | Med, Spa & Wellness Studio`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Private spa with hot tub & sauna, food & drinks bar, and advanced laser therapy devices. Open 9am–8pm in Keswick (Toronto area). Book online.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_NAME,
    description:
      "Private spa with hot tub & sauna, food & drinks bar, and advanced laser therapy devices. Open 9am–8pm in Keswick (Toronto area). Book online.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_CA",
    type: "website",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: SITE_NAME }],
  },
  robots: { index: true, follow: true },
};

// ===== Root Layout =====
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "DaySpa",
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}/logo.jpg`,
    telephone: "+1-289-221-1650",
    priceRange: "$$-$$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "281 Parkwood Ave",
      addressLocality: "Keswick",
      addressRegion: "ON",
      postalCode: "L4P 2X4",
      addressCountry: "CA",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "09:00",
        closes: "20:00",
      },
    ],
    // email: "ryan@nesses.ca",
    email: process.env.DEVELOPER_EMAIL || "",
  };

  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900">
        <Navbar isAdminLoggedIn={cookies().has(ADMIN_AUTH_COOKIE)} />
        <main>{children}</main>
        <Footer />
        <Toaster position="top-right" />
        <OfferStatusBar />
        <ChristmasOfferFloating />
        <Script id="ld-localbusiness" type="application/ld+json">
          {JSON.stringify(ldJson)}
        </Script>
      </body>
    </html>
  );
}
