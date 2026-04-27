import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isValidEmail } from "../../../lib/validation";

export const runtime = "nodejs";

type Body = {
  email?: unknown;
};

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID_WAITLIST;
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "noreply@kojihq.com";

  if (!apiKey || !audienceId) {
    return NextResponse.json(
      { error: "waitlist_not_configured" },
      { status: 503 },
    );
  }

  let email: string;
  try {
    const body = (await req.json()) as Body;
    email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const resend = new Resend(apiKey);

  // Audience への登録（重複時は Resend 側が既存を返すか 400 を返す。
  // ユーザー視点ではどちらも「登録済み」として正常系扱いする）
  const contactRes = await resend.contacts.create({
    email,
    audienceId,
    unsubscribed: false,
  });

  if (contactRes.error) {
    const message = contactRes.error.message ?? "";
    const isDuplicate = /already exists|duplicate/i.test(message);
    if (!isDuplicate) {
      console.error("[waitlist] contacts.create failed", contactRes.error);
      return NextResponse.json({ error: "registration_failed" }, { status: 502 });
    }
  }

  // 確認メール送信。送信失敗は audience 登録の成功を妨げない（ログに残して成功を返す）
  const sendRes = await resend.emails.send({
    from: `Koji <${fromAddress}>`,
    to: email,
    subject: "Pro リリース先行通知リストにご登録いただきありがとうございます",
    html: buildConfirmationHtml(),
    text: buildConfirmationText(),
  });

  if (sendRes.error) {
    console.error("[waitlist] emails.send failed", sendRes.error);
  }

  return NextResponse.json({ ok: true });
}

function buildConfirmationHtml(): string {
  return `<!doctype html>
<html lang="ja">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI','Hiragino Sans',sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <div style="font-size:14px;color:#2563eb;font-weight:600;margin-bottom:8px;">koji-lens · Pro リリース先行通知</div>
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.4;color:#0f172a;">ご登録ありがとうございます</h1>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">
                  koji-lens Pro プラン（月額 $8 / 年額 $80）の販売開始先行通知リストへのご登録を受け付けました。
                </p>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">
                  2026 年 5 月下旬の販売開始に合わせて、このメールアドレス宛に先行案内をお送りします。
                  β 期間中は CLI の全機能を無料でご利用いただけますので、ぜひご体験ください。
                </p>
                <p style="margin:24px 0 0 0;font-size:14px;color:#64748b;">
                  登録解除やご質問は <a href="mailto:support@kojihq.com" style="color:#2563eb;text-decoration:none;">support@kojihq.com</a> までお気軽にご連絡ください。
                </p>
                <hr style="margin:24px 0;border:0;border-top:1px solid #e2e8f0;" />
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  Koji / 株式会社クインクエ<br />
                  <a href="https://lens.kojihq.com" style="color:#64748b;text-decoration:none;">lens.kojihq.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildConfirmationText(): string {
  return [
    "koji-lens / Pro リリース先行通知",
    "",
    "ご登録ありがとうございます。",
    "",
    "Pro プラン（月額 $8 / 年額 $80）の販売開始（2026 年 5 月下旬予定）に合わせて、このメールアドレスへ先行案内をお送りします。",
    "β 期間中は CLI の全機能を無料でご利用いただけますので、ぜひご体験ください。",
    "",
    "登録解除やご質問は support@kojihq.com までご連絡ください。",
    "",
    "Koji / 株式会社クインクエ",
    "https://lens.kojihq.com",
  ].join("\n");
}
