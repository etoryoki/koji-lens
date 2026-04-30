import type { Metadata } from "next";
import { LegalPlaceholder } from "../components/LegalPlaceholder";

export const metadata: Metadata = {
  title: "利用規約",
};

export default function Page() {
  return <LegalPlaceholder title="利用規約" dueBy="2026 年 5 月下旬" />;
}
