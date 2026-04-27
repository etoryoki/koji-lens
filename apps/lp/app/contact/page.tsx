import { Mail } from "lucide-react";
import { ContactForm } from "../components/ContactForm";

export const metadata = {
  title: "お問い合わせ | koji-lens",
  description:
    "koji-lens（株式会社クインクエ）への問い合わせ窓口。料金・契約 / 技術サポート / その他のご質問を受け付けています。",
};

const SUPPORT_EMAIL = "support@kojihq.com";

export default function ContactPage() {
  const enabled = Boolean(process.env.RESEND_API_KEY);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
          <a
            href="/"
            className="text-sm text-slate-600 transition hover:text-slate-900"
          >
            ← トップへ戻る
          </a>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Mail className="size-3.5" />
            サポート窓口
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            お問い合わせ
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-slate-600">
            koji-lens（株式会社クインクエ）に関するお問い合わせを受け付けています。
            返信は <strong>5 営業日以内を目安</strong> にお送りします（カテゴリ・繁忙によりさらにお時間をいただく場合があります）。
          </p>
          <p className="mt-2 text-sm text-slate-500">
            技術的な不具合・機能要望は{" "}
            <a
              href="https://github.com/etoryoki/koji-lens/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GitHub Issues
            </a>
            、ライトな質問は Bluesky{" "}
            <a
              href="https://bsky.app/profile/kojihq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              @kojihq.com
            </a>{" "}
            の DM もご利用いただけます。
          </p>
        </div>
      </section>

      <section className="flex-1 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <ContactForm enabled={enabled} />
            <p className="mt-6 text-xs leading-relaxed text-slate-500">
              本フォームから取得した個人情報は、お問い合わせ対応の目的にのみ使用します。
              詳細は{" "}
              <a href="/legal/privacy" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </a>{" "}
              をご確認ください。直接メールでのご連絡は{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-blue-600 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              へ。
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-8 text-xs text-slate-500">
          © 2026 Quinque, Inc.
        </div>
      </footer>
    </main>
  );
}
