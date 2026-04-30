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
  { value: "billing", label: "Pricing & contract" },
  { value: "technical", label: "Technical support" },
  { value: "other", label: "Other" },
];

export function ContactFormEn({ enabled }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
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
      setErrorMsg("Email address is not valid.");
      return;
    }
    if (!category) {
      setStatus("error");
      setErrorMsg("Please select a category.");
      return;
    }
    if (trimmedBody.length === 0) {
      setStatus("error");
      setErrorMsg("Please enter your message.");
      return;
    }
    if (trimmedBody.length > BODY_MAX) {
      setStatus("error");
      setErrorMsg(`Message must be ${BODY_MAX} characters or less.`);
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
          locale: "en",
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
      setErrorMsg("Failed to send. Please try again later.");
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
          <div className="font-semibold">Your inquiry has been received</div>
          <p className="mt-1 text-emerald-800">
            We aim to respond within 5 business days. A confirmation email will
            arrive within a few minutes (check your spam folder if you don't see
            it).
          </p>
        </div>
      </div>
    );
  }

  const disabled = !enabled || status === "submitting";

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
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

      <Field label="Name" hint="optional" htmlFor="contact-name">
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
        label="Email"
        hint="required — used for our reply"
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

      <Field label="Category" hint="required" htmlFor="contact-category">
        <select
          id="contact-category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        >
          <option value="" disabled>
            Select a category
          </option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Message"
        hint={`required — up to ${BODY_MAX} characters`}
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
        {status === "submitting" ? "Sending..." : "Send"}
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
      return "Email address is not valid.";
    case "invalid_category":
      return "Please select a category.";
    case "empty_body":
      return "Please enter your message.";
    case "contact_not_configured":
      return "The form is currently undergoing maintenance. Please try again later.";
    case "send_failed":
      return "Failed to send. Please try again later.";
    case "forbidden_origin":
    case "unsupported_media_type":
    case "invalid_body":
      return "Invalid request. Please reload the page and try again.";
    default:
      return "Failed to send. Please try again later.";
  }
}
