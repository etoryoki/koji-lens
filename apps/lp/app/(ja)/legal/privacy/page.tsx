import type { Metadata } from "next";
import { LegalPlaceholder } from "../components/LegalPlaceholder";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

export default function Page() {
  return (
    <LegalPlaceholder title="プライバシーポリシー" dueBy="2026 年 5 月下旬" />
  );
}
