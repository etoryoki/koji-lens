import type { Metadata } from "next";
import { LegalPlaceholder } from "../components/LegalPlaceholder";

export const metadata: Metadata = {
  title: "利用規約",
  alternates: {
    canonical: "https://lens.kojihq.com/legal/tos",
    languages: {
      ja: "https://lens.kojihq.com/legal/tos",
      en: "https://lens.kojihq.com/en/legal/tos",
    },
  },
};

export default function Page() {
  return <LegalPlaceholder title="利用規約" dueBy="2026 年 5 月下旬" />;
}
