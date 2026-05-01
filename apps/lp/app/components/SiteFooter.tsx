import Link from "next/link";
import { KojiMark } from "./KojiMark";

const SUPPORT_EMAIL = "support@kojihq.com";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-[#0f172a]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="text-sm leading-relaxed text-slate-400">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-[#F2EDE4]">
                <KojiMark className="size-5" />
              </span>
              <span className="font-semibold tracking-tight">koji-lens</span>
            </Link>
            <div className="mt-3">
              Koji が開発・提供する OSS プロジェクトです。
            </div>
            <div className="mt-1">運営: 株式会社クインクエ</div>
            <div className="mt-1">
              お問い合わせ:{" "}
              <Link
                href="/contact"
                className="text-blue-400 transition hover:text-blue-300"
              >
                {SUPPORT_EMAIL}
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
            <Link href="/contact" className="transition hover:text-white">
              お問い合わせ
            </Link>
            <Link href="/docs" className="transition hover:text-white">
              ドキュメント
            </Link>
            <Link href="/legal/tos" className="transition hover:text-white">
              利用規約
            </Link>
            <Link href="/legal/privacy" className="transition hover:text-white">
              プライバシーポリシー
            </Link>
            <Link
              href="/legal/tokushoho"
              className="transition hover:text-white"
            >
              特定商取引法に基づく表記
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-800 pt-6 text-xs text-slate-500">
          © 2026 Quinque, Inc.
        </div>
      </div>
    </footer>
  );
}
