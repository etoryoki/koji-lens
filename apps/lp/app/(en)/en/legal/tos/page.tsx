import type { Metadata } from "next";
import { LegalPlaceholder } from "../components/LegalPlaceholder";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service of koji-lens (Quinque, Inc.).",
  alternates: {
    canonical: "https://lens.kojihq.com/en/legal/tos",
    languages: {
      ja: "https://lens.kojihq.com/legal/tos",
      en: "https://lens.kojihq.com/en/legal/tos",
    },
  },
};

export default function TosPage() {
  return <LegalPlaceholder title="Terms of Service" dueBy="May 21, 2026" />;
}
