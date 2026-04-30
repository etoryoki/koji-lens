import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isValidEmail, verifyApiRequest } from "../../../lib/validation";

export const runtime = "nodejs";

const CATEGORIES = ["billing", "technical", "other"] as const;
type Category = (typeof CATEGORIES)[number];
type Locale = "ja" | "en";

const CATEGORY_LABEL_JA: Record<Category, string> = {
  billing: "料金・契約",
  technical: "技術サポート",
  other: "その他",
};

const CATEGORY_LABEL_EN: Record<Category, string> = {
  billing: "Pricing & contract",
  technical: "Technical support",
  other: "Other",
};

const NAME_MAX = 100;
const BODY_MAX = 2000;

type ContactBody = {
  name?: unknown;
  email?: unknown;
  category?: unknown;
  body?: unknown;
  locale?: unknown;
  // honeypot field - real users leave this empty; bots tend to fill it
  website?: unknown;
};

export async function POST(req: Request) {
  const guard = verifyApiRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const supportEmail = process.env.RESEND_SUPPORT_EMAIL ?? "support@kojihq.com";
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "noreply@kojihq.com";

  if (!apiKey) {
    return NextResponse.json(
      { error: "contact_not_configured" },
      { status: 503 },
    );
  }

  let payload: ContactBody;
  try {
    payload = (await req.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const honeypot =
    typeof payload.website === "string" ? payload.website.trim() : "";
  if (honeypot.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const name =
    typeof payload.name === "string" ? payload.name.trim().slice(0, NAME_MAX) : "";
  const email =
    typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const category =
    typeof payload.category === "string" &&
    (CATEGORIES as readonly string[]).includes(payload.category)
      ? (payload.category as Category)
      : null;
  const body =
    typeof payload.body === "string" ? payload.body.trim().slice(0, BODY_MAX) : "";
  const locale: Locale = payload.locale === "en" ? "en" : "ja";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }
  if (body.length === 0) {
    return NextResponse.json({ error: "empty_body" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const categoryLabelInternal = CATEGORY_LABEL_JA[category]; // 社内転送は日本語固定
  const categoryLabelUser =
    locale === "en" ? CATEGORY_LABEL_EN[category] : CATEGORY_LABEL_JA[category];
  const summary = body.slice(0, 40).replace(/\s+/g, " ");

  // 2 emails in parallel:
  //   (a) forward to support@ (always Japanese for internal handling)
  //   (b) auto-acknowledgement to the sender (locale-aware)
  const [forwardRes, ackRes] = await Promise.allSettled([
    resend.emails.send({
      from: `Koji Contact <${fromAddress}>`,
      to: supportEmail,
      replyTo: email,
      subject: `[問い合わせ/${categoryLabelInternal}/${locale}] ${summary}`,
      text: buildForwardText({ name, email, categoryLabel: categoryLabelInternal, body, locale }),
    }),
    resend.emails.send({
      from: `Koji Support <${supportEmail}>`,
      to: email,
      subject:
        locale === "en"
          ? "We've received your inquiry"
          : "お問い合わせを受け付けました",
      html: buildAckHtml({ name, categoryLabel: categoryLabelUser, body, locale }),
      text: buildAckText({ name, categoryLabel: categoryLabelUser, body, locale }),
    }),
  ]);

  const forwardOk =
    forwardRes.status === "fulfilled" && !forwardRes.value.error;
  const ackOk = ackRes.status === "fulfilled" && !ackRes.value.error;

  if (!forwardOk) {
    console.error("[contact] forward failed", extractError(forwardRes));
  }
  if (!ackOk) {
    console.error("[contact] ack failed", extractError(ackRes));
  }

  if (!forwardOk && !ackOk) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

function extractError(
  result: PromiseSettledResult<{ error?: unknown }>,
): unknown {
  if (result.status === "rejected") return result.reason;
  return result.value.error;
}

function buildForwardText(args: {
  name: string;
  email: string;
  categoryLabel: string;
  body: string;
  locale: Locale;
}): string {
  return [
    `LP /contact から新しい問い合わせが届きました（locale: ${args.locale}）。`,
    "",
    `カテゴリ: ${args.categoryLabel}`,
    `お名前:   ${args.name || "(未入力)"}`,
    `メール:   ${args.email}`,
    "",
    "本文:",
    "----",
    args.body,
    "----",
    "",
    "返信は本メールに reply するだけで送信元（送信者）に届きます。",
  ].join("\n");
}

function buildAckHtml(args: {
  name: string;
  categoryLabel: string;
  body: string;
  locale: Locale;
}): string {
  if (args.locale === "en") {
    const greet = args.name ? `Hi ${escapeHtml(args.name)},` : "Hi,";
    return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <div style="font-size:14px;color:#2563eb;font-weight:600;margin-bottom:8px;">koji-lens · Contact</div>
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.4;color:#0f172a;">We've received your inquiry</h1>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">${greet} thanks for reaching out.</p>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">We've received your inquiry as below. We aim to reply <strong>within 5 business days</strong> (some categories or busy periods may take longer).</p>
                <div style="margin:16px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#334155;">
                  <div style="margin-bottom:8px;"><strong>Category:</strong> ${escapeHtml(args.categoryLabel)}</div>
                  <div><strong>Message:</strong></div>
                  <pre style="margin:8px 0 0 0;white-space:pre-wrap;font-family:inherit;font-size:14px;color:#0f172a;">${escapeHtml(args.body)}</pre>
                </div>
                <p style="margin:0 0 12px 0;font-size:14px;color:#64748b;">You can reply to this email to reach our team directly.</p>
                <hr style="margin:24px 0;border:0;border-top:1px solid #e2e8f0;" />
                <p style="margin:0;font-size:12px;color:#94a3b8;">Koji / Quinque, Inc.<br /><a href="https://lens.kojihq.com/en" style="color:#64748b;text-decoration:none;">lens.kojihq.com/en</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
  const greet = args.name ? `${args.name} 様` : "お問い合わせいただいた方へ";
  return `<!doctype html>
<html lang="ja">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI','Hiragino Sans',sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <div style="font-size:14px;color:#2563eb;font-weight:600;margin-bottom:8px;">koji-lens · お問い合わせ</div>
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.4;color:#0f172a;">お問い合わせを受け付けました</h1>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(greet)}、お問い合わせをいただきありがとうございます。</p>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">以下の内容で受け付けました。担当より <strong>5 営業日以内を目安に</strong> ご返信いたします（カテゴリ・繁忙によりさらにお時間をいただく場合があります）。</p>
                <div style="margin:16px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#334155;">
                  <div style="margin-bottom:8px;"><strong>カテゴリ:</strong> ${escapeHtml(args.categoryLabel)}</div>
                  <div><strong>本文:</strong></div>
                  <pre style="margin:8px 0 0 0;white-space:pre-wrap;font-family:inherit;font-size:14px;color:#0f172a;">${escapeHtml(args.body)}</pre>
                </div>
                <p style="margin:0 0 12px 0;font-size:14px;color:#64748b;">本メールに返信していただいても、担当に届きます。</p>
                <hr style="margin:24px 0;border:0;border-top:1px solid #e2e8f0;" />
                <p style="margin:0;font-size:12px;color:#94a3b8;">Koji / 株式会社クインクエ<br /><a href="https://lens.kojihq.com" style="color:#64748b;text-decoration:none;">lens.kojihq.com</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildAckText(args: {
  name: string;
  categoryLabel: string;
  body: string;
  locale: Locale;
}): string {
  if (args.locale === "en") {
    const greet = args.name ? `Hi ${args.name},` : "Hi,";
    return [
      greet,
      "",
      "Thanks for contacting koji-lens. We've received your inquiry as below.",
      "We aim to reply within 5 business days (some categories or busy periods may take longer).",
      "",
      `Category: ${args.categoryLabel}`,
      "Message:",
      "----",
      args.body,
      "----",
      "",
      "You can reply to this email to reach our team directly.",
      "",
      "Koji / Quinque, Inc.",
      "https://lens.kojihq.com/en",
    ].join("\n");
  }
  const greet = args.name ? `${args.name} 様` : "お問い合わせいただいた方へ";
  return [
    `${greet}`,
    "",
    "koji-lens のお問い合わせを受け付けました。",
    "担当より 5 営業日以内を目安にご返信いたします（カテゴリ・繁忙によりさらにお時間をいただく場合があります）。",
    "",
    `カテゴリ: ${args.categoryLabel}`,
    "本文:",
    "----",
    args.body,
    "----",
    "",
    "本メールに返信していただいても、担当に届きます。",
    "",
    "Koji / 株式会社クインクエ",
    "https://lens.kojihq.com",
  ].join("\n");
}

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c] ?? c);
}
