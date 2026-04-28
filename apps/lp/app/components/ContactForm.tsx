"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

type Props = {
  enabled: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 100;
const BODY_MAX = 2000;

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "billing", label: "料金・契約" },
  { value: "technical", label: "技術サポート" },
  { value: "other", label: "その他" },
];

export function ContactForm({ enabled }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  // honeypot field - hidden from real users via CSS
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enabled || status === "submitting") return;

    const trimmedEmail = email.trim();
    const trimmedBody = body.trim();
    const trimmedName = name.trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setStatus("error");
      setErrorMsg("メールアドレスの形式が正しくありません。");
      return;
    }
    if (!category) {
      setStatus("error");
      setErrorMsg("件名カテゴリを選択してください。");
      return;
    }
    if (trimmedBody.length === 0) {
      setStatus("error");
      setErrorMsg("お問い合わせ本文を入力してください。");
      return;
    }
    if (trimmedBody.length > BODY_MAX) {
      setStatus("error");
      setErrorMsg(`本文は ${BODY_MAX} 字以内でご入力ください。`);
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          category,
          body: trimmedBody,
          website,
        }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const code =
          typeof data === "object" && data && "error" in data
            ? String((data as { error?: unknown }).error)
            : "";
        setStatus("error");
        setErrorMsg(messageForError(code));
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setCategory("");
      setBody("");
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
          <div className="font-semibold">お問い合わせを受け付けました</div>
          <p className="mt-1 text-emerald-800">
            5
            営業日以内を目安にご返信いたします。確認メールも数分以内にお届けします（届かない場合は迷惑メールフォルダをご確認ください）。
          </p>
        </div>
      </div>
    );
  }

  const disabled = !enabled || status === "submitting";

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      {/* honeypot - real users do not see/fill this */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
      >
        <label htmlFor="website">Website (leave blank)</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Field
        label="お名前"
        hint="任意"
        htmlFor="contact-name"
      >
        <input
          id="contact-name"
          type="text"
          maxLength={NAME_MAX}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        />
      </Field>

      <Field
        label="メールアドレス"
        hint="必須・返信先として使用します"
        htmlFor="contact-email"
      >
        <input
          id="contact-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        />
      </Field>

      <Field
        label="件名カテゴリ"
        hint="必須"
        htmlFor="contact-category"
      >
        <select
          id="contact-category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        >
          <option value="" disabled>
            選択してください
          </option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="お問い合わせ内容"
        hint={`必須・最大 ${BODY_MAX} 字`}
        htmlFor="contact-body"
      >
        <textarea
          id="contact-body"
          required
          rows={6}
          maxLength={BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        />
        <div className="mt-1 text-right text-xs text-slate-400">
          {body.length} / {BODY_MAX}
        </div>
      </Field>

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "送信中..." : "送信する"}
      </button>

      {errorMsg ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-900">
          {label}
        </label>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function messageForError(code: string): string {
  switch (code) {
    case "invalid_email":
      return "メールアドレスの形式が正しくありません。";
    case "invalid_category":
      return "件名カテゴリを選択してください。";
    case "empty_body":
      return "お問い合わせ本文を入力してください。";
    case "contact_not_configured":
      return "現在フォームはメンテナンス中です。時間をおいて再度お試しください。";
    case "send_failed":
      return "送信処理に失敗しました。時間をおいて再度お試しください。";
    case "forbidden_origin":
    case "unsupported_media_type":
    case "invalid_body":
      return "不正なリクエストです。ページを再読み込みして再度お試しください。";
    default:
      return "送信に失敗しました。時間をおいて再度お試しください。";
  }
}
