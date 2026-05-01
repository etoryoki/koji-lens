import Link from "next/link";
import { KojiMark } from "./KojiMark";

const SUPPORT_EMAIL = "support@kojihq.com";

export function SiteFooterEn() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-[#0f172a]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="text-sm leading-relaxed text-slate-400">
            <Link
              href="/en"
              className="inline-flex items-center gap-2 text-white"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-[#F2EDE4]">
                <KojiMark className="size-5" />
              </span>
              <span className="font-semibold tracking-tight">koji-lens</span>
            </Link>
            <div className="mt-3">
              An OSS project built and maintained by Koji.
            </div>
            <div className="mt-1">Operated by Quinque, Inc.</div>
            <div className="mt-1">
              Contact:{" "}
              <Link
                href="/en/contact"
                className="text-blue-400 transition hover:text-blue-300"
              >
                {SUPPORT_EMAIL}
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
            <Link href="/en/contact" className="transition hover:text-white">
              Contact
            </Link>
            <Link href="/en/docs" className="transition hover:text-white">
              Docs
            </Link>
            <Link href="/en/legal/tos" className="transition hover:text-white">
              Terms of Service
            </Link>
            <Link
              href="/en/legal/privacy"
              className="transition hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link href="/" className="transition hover:text-white">
              日本語 →
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
