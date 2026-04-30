import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = "https://lens.kojihq.com";
const SITE_NAME = "koji-lens";
const SITE_TITLE = "koji-lens — Know your AI coding spend before month-end.";
const SITE_DESCRIPTION =
  "A local-only OSS observability tool for Claude Code. Parses your local session logs and visualizes cost, tokens, and tool usage with a single command. One-line install, no servers, no signup.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | koji-lens",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Quinque, Inc.", url: SITE_URL }],
  publisher: "Quinque, Inc.",
  keywords: [
    "Claude Code",
    "Claude Code cost",
    "Claude Code analyzer",
    "AI coding",
    "token usage",
    "session analysis",
    "OSS",
    "CLI",
    "koji-lens",
    "kojihq",
  ],
  alternates: {
    canonical: `${SITE_URL}/en`,
    languages: {
      ja: SITE_URL,
      en: `${SITE_URL}/en`,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/en`,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-en.png",
        width: 1200,
        height: 630,
        alt: "koji-lens — Know your AI coding spend before month-end.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-en.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "koji-lens",
  alternateName: "@kojihq/lens",
  url: `${SITE_URL}/en`,
  description: SITE_DESCRIPTION,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "macOS, Windows, Linux",
  softwareVersion: "0.1.0-beta.3",
  softwareRequirements: "Node.js 22+",
  downloadUrl: "https://www.npmjs.com/package/@kojihq/lens",
  license: "https://opensource.org/licenses/MIT",
  inLanguage: "en",
  author: {
    "@type": "Organization",
    name: "Quinque, Inc.",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "Quinque, Inc.",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function EnRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-slate-900">
        {children}
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationLd),
          }}
        />
      </body>
    </html>
  );
}
