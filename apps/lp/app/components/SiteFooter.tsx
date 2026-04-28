import Link from "next/link";

const SUPPORT_EMAIL = "support@kojihq.com";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="text-sm leading-relaxed text-slate-600">
            <div className="font-semibold text-slate-900">koji-lens</div>
            <div className="mt-1">
              Koji が開発・提供する OSS プロジェクトです。
            </div>
            <div className="mt-1">運営: 株式会社クインクエ</div>
            <div className="mt-1">
              お問い合わせ:{" "}
              <Link href="/contact" className="text-blue-600 hover:underline">
                {SUPPORT_EMAIL}
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <Link href="/contact" className="hover:text-slate-900">
              お問い合わせ
            </Link>
            <Link href="/docs" className="hover:text-slate-900">
              ドキュメント
            </Link>
            <Link href="/legal/tos" className="hover:text-slate-900">
              利用規約
            </Link>
            <Link href="/legal/privacy" className="hover:text-slate-900">
              プライバシーポリシー
            </Link>
            <Link href="/legal/tokushoho" className="hover:text-slate-900">
              特定商取引法に基づく表記
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
          © 2026 Quinque, Inc.
        </div>
      </div>
    </footer>
  );
}
