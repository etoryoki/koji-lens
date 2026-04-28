"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

type Props = {
  enabled: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm({ enabled }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enabled || status === "submitting") return;

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMsg("メールアドレスの形式が正しくありません。");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const code =
          typeof data === "object" && data && "error" in data
            ? String((data as { error?: unknown }).error)
            : "";
        setStatus("error");
        setErrorMsg(
          code === "invalid_email"
            ? "メールアドレスの形式が正しくありません。"
            : code === "waitlist_not_configured"
              ? "現在フォームはメンテナンス中です。時間をおいて再度お試しください。"
              : "送信に失敗しました。時間をおいて再度お試しください。",
        );
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMsg("送信に失敗しました。時間をおいて再度お試しください。");
    }
  };

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900"
      >
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div>
          <div className="font-semibold">ご登録ありがとうございます。</div>
          <p className="mt-1 text-emerald-800">
            販売開始と同時に、ご登録のメールアドレスへ通知をお送りします。確認メールも数分以内にお届けします（届かない場合は迷惑メールフォルダをご確認ください）。
          </p>
        </div>
      </div>
    );
  }

  const disabled = !enabled || status === "submitting";

  return (
    <>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={onSubmit}
        noValidate
      >
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled}
          aria-describedby="waitlist-note"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        />
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "送信中..." : "通知を受け取る"}
        </button>
      </form>
      {errorMsg ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {errorMsg}
        </p>
      ) : null}
      <p id="waitlist-note" className="mt-3 text-xs text-slate-500">
        ※ 通知メールのみに使用し、登録はいつでも解除可能です。
      </p>
    </>
  );
}
