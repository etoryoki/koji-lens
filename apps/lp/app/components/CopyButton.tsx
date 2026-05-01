"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  value: string;
  label?: string;
  copiedLabel?: string;
};

export function CopyButton({
  value,
  label = "コピー",
  copiedLabel = "コピーしました",
}: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API が無い環境では no-op
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:min-h-0 sm:px-2.5 sm:py-1"
      aria-label={label}
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-600" />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
