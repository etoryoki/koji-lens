"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

type Props = {
  enabled: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistFormEn({ enabled }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enabled || status === "submitting") return;

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMsg("Email address is not valid.");
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
            ? "Email address is not valid."
            : code === "waitlist_not_configured"
              ? "The form is currently undergoing maintenance. Please try again later."
              : "Failed to send. Please try again later.",
        );
        return;
      }

      setStatus("success");
      setEmail("");
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
          <div className="font-semibold">Thanks for signing up.</div>
          <p className="mt-1 text-emerald-800">
            We'll notify you at the email above as soon as Pro launches. A
            confirmation email will arrive within a few minutes (check your
            spam folder if you don't see it).
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
          {status === "submitting" ? "Sending..." : "Notify me"}
        </button>
      </form>
      {errorMsg ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {errorMsg}
        </p>
      ) : null}
      <p id="waitlist-note" className="mt-3 text-xs text-slate-500">
        We'll only use your email for launch notifications. You can unsubscribe at any time.
      </p>
    </>
  );
}
