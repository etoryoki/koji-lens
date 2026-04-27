/**
 * Shared validation + request guard helpers for apps/lp API routes.
 *
 * - EMAIL_REGEX / isValidEmail: server-side email format validation
 * - verifyApiRequest: Content-Type + Origin guard for POST endpoints
 *
 * Note: Origin header is enforced loosely. If absent (some same-origin
 * fetches do not set it), the request is allowed. If present, must match
 * the allowed list.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_REGEX.test(email);
}

const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  [
    "https://lens.kojihq.com",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
  ].filter((v): v is string => typeof v === "string"),
);

export type RequestGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function verifyApiRequest(req: Request): RequestGuardResult {
  const ct = req.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (ct !== "application/json") {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return { ok: false, status: 403, error: "forbidden_origin" };
  }
  return { ok: true };
}
