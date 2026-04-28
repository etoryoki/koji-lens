import "./globals.css";
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
const SITE_TITLE = "koji-lens — 月末に驚く前に、今日知る。";
const SITE_DESCRIPTION =
  "Claude Code のセッションログをローカルで解析し、コスト・トークン・ツール使用を 1 コマンドで可視化する OSS 観測ツール。インストール 1 行、ローカル完結。";

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
    "Claude Code コスト",
    "Claude Code 可視化",
    "AI コーディング",
    "トークン分析",
    "セッション分析",
    "OSS",
    "CLI",
    "koji-lens",
    "kojihq",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "koji-lens — AI コーディングの使い方を、見える化する。",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
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
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "macOS, Windows, Linux",
  softwareVersion: "0.1.0-beta.2",
  softwareRequirements: "Node.js 22+",
  downloadUrl: "https://www.npmjs.com/package/@kojihq/lens",
  license: "https://opensource.org/licenses/MIT",
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} h-full antialiased`}>
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
