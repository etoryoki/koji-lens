import type { Metadata } from "next";
import { LegalPlaceholder } from "../components/LegalPlaceholder";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
};

export default function Page() {
  return (
    <LegalPlaceholder
      title="特定商取引法に基づく表記"
      dueBy="2026 年 5 月下旬"
    />
  );
}
