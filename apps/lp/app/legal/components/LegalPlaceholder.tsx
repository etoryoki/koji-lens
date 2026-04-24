import Link from "next/link";

type Props = {
  title: string;
  dueBy: string;
};

export function LegalPlaceholder({ title, dueBy }: Props) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline"
        >
          ← koji-lens トップへ
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-medium text-slate-900">準備中</div>
          <p className="mt-2 text-pretty leading-relaxed text-slate-600">
            本ページは現在準備中です。{dueBy} までに正式版を公開予定です。
          </p>
          <p className="mt-3 text-sm text-slate-500">
            お問い合わせは{" "}
            <a
              href="mailto:support@kojihq.com"
              className="text-blue-600 hover:underline"
            >
              support@kojihq.com
            </a>{" "}
            まで。
          </p>
        </div>
      </div>
    </main>
  );
}
