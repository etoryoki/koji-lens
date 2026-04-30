import type { Metadata } from "next";
import { LegalPlaceholder } from "../components/LegalPlaceholder";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  alternates: {
    canonical: "https://lens.kojihq.com/legal/privacy",
    languages: {
      ja: "https://lens.kojihq.com/legal/privacy",
      en: "https://lens.kojihq.com/en/legal/privacy",
    },
  },
};

export default function Page() {
  return (
    <LegalPlaceholder title="プライバシーポリシー" dueBy="2026 年 5 月下旬" />
  );
}
