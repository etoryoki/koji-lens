import type { Metadata } from "next";
import { LegalPlaceholder } from "../components/LegalPlaceholder";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy of koji-lens (Quinque, Inc.).",
  alternates: {
    canonical: "https://lens.kojihq.com/en/legal/privacy",
    languages: {
      ja: "https://lens.kojihq.com/legal/privacy",
      en: "https://lens.kojihq.com/en/legal/privacy",
    },
  },
};

export default function PrivacyPage() {
  return <LegalPlaceholder title="Privacy Policy" dueBy="May 21, 2026" />;
}
