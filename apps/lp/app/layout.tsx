import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://lens.kojihq.com"),
  title: {
    default: "koji-lens — AI コーディングの使い方を、見える化する。",
    template: "%s | koji-lens",
  },
  description:
    "Claude Code のセッションログをローカルで解析し、コスト・トークン・ツール使用を 1 コマンドで可視化する OSS 観測ツール。",
  openGraph: {
    title: "koji-lens",
    description:
      "Claude Code のセッションログをローカルで解析し、コスト・トークン・ツール使用を 1 コマンドで可視化。",
    url: "https://lens.kojihq.com",
    siteName: "koji-lens",
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
    title: "koji-lens",
    description:
      "Claude Code のセッションログをローカルで解析し、コスト・トークン・ツール使用を 1 コマンドで可視化。",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full bg-white text-slate-900">{children}</body>
    </html>
  );
}
