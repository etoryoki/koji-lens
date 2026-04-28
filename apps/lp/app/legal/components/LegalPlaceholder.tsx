import Link from "next/link";

type Props = {
  title: string;
  dueBy: string;
};

export function LegalPlaceholder({ title, dueBy }: Props) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← koji-lens トップへ
        </Link>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
              !
            </span>
            <div className="text-sm leading-relaxed text-amber-900">
              <span className="font-semibold">本ページはドラフト版です。</span>{" "}
              法務レビュー完了前の暫定掲載となります。正式版は {dueBy}{" "}
              までに公開予定です。
            </div>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>

        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-medium text-slate-900">公開準備中</div>
          <p className="mt-2 text-pretty leading-relaxed text-slate-600">
            本ページの本文は現在準備中です。公開までの間、本書の内容に関するお問い合わせは
            下記サポート窓口までお寄せください。
          </p>
          <p className="mt-3 text-sm text-slate-500">
            お問い合わせ:{" "}
            <a
              href="mailto:support@kojihq.com"
              className="text-blue-600 hover:underline"
            >
              support@kojihq.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
