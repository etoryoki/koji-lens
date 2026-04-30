import { SiteFooterEn } from "../../../../components/SiteFooterEn";
import { SiteHeaderEn } from "../../../../components/SiteHeaderEn";

type Props = {
  title: string;
  dueBy: string;
};

export function LegalPlaceholder({ title, dueBy }: Props) {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <SiteHeaderEn />

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white">
              i
            </span>
            <div className="text-sm leading-relaxed text-slate-700">
              <span className="font-semibold text-slate-900">
                This page is a draft.
              </span>{" "}
              The official version will be published by {dueBy} after legal
              review.
            </div>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>

        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-medium text-slate-900">In preparation</div>
          <p className="mt-2 text-pretty leading-relaxed text-slate-600">
            The full text of this page is currently being prepared. For any
            questions in the meantime, please reach out to our support team
            below.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Contact:{" "}
            <a
              href="mailto:support@kojihq.com"
              className="text-blue-600 hover:underline"
            >
              support@kojihq.com
            </a>
          </p>
        </div>
      </div>

      <SiteFooterEn />
    </main>
  );
}
