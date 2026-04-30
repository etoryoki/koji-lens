import Link from "next/link";
import { Github } from "lucide-react";

const GITHUB_URL = "https://github.com/etoryoki/koji-lens";

export function SiteHeaderEn() {
  return (
    <header className="border-b border-slate-800 bg-[#0f172a]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/en" className="flex items-center gap-2 text-white">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-slate-800 font-bold tracking-tight">
            K
          </span>
          <span className="font-semibold tracking-tight">koji-lens</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-slate-300">
          <Link href="/en#features" className="transition hover:text-white">
            Features
          </Link>
          <Link
            href="https://github.com/etoryoki/koji-lens#koji-lens"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-white"
          >
            Docs
          </Link>
          <Link href="/en#pricing" className="transition hover:text-white">
            Pricing
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition hover:text-white"
          >
            <Github className="size-4" />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
