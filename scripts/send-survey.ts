#!/usr/bin/env -S node --experimental-strip-types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- standalone script executed via tsx, no project tsconfig in scripts/

/**
 * Send a 1-question research survey to all subscribed contacts of a Resend Audience.
 * Recipients reply directly to the email (Reply-To: support@kojihq.com).
 *
 * Requires env:
 *   RESEND_API_KEY              Resend API key (re_xxx...)
 *   RESEND_AUDIENCE_ID_WAITLIST optional, defaults to the waitlist audience id
 *   RESEND_FROM_EMAIL           optional, defaults to "support@kojihq.com"
 *   RESEND_FROM_NAME            optional, defaults to "瀬尾 / Koji"
 *
 * Usage:
 *   pnpm survey:dry-run            # list recipient count + show payload, no API send
 *   pnpm survey:run --confirm      # actually send (--confirm required)
 *   pnpm survey:run --confirm --audience-id <id>
 *
 * Behaviour:
 *   - Lists subscribed contacts of the audience
 *   - Sends a personalized-but-anonymized email (no name in body, just plain greeting)
 *   - Throttles to ~2 req/sec (500ms between sends) to stay well under Resend's 10/s limit
 *   - On any send failure, prints the error and continues with the next recipient
 *   - Final summary: sent / failed / skipped (unsubscribed)
 *   - --dry-run does NOT call the send API; --confirm is required for real send
 */

import { parseArgs } from "node:util";

const DEFAULT_AUDIENCE_ID = "3f1d263c-4e7b-49b2-9997-6810a933e97c";

const SUBJECT = "【koji-lens β】Pro 機能設計のための 1 問アンケート（30 秒）";

const BODY = [
  "こんにちは、Koji の瀬尾です。",
  "",
  "koji-lens β の Pro リリース通知 waitlist にご登録ありがとうございます。",
  "より良い Pro 機能を設計するため、1 問だけお聞かせください。",
  "このメールに「返信」していただければ届きます（所要 30 秒）。",
  "",
  "────────────",
  "",
  "Q1（必須）: koji-lens を実際にインストールしましたか?",
  "  A. 使っている（毎日 / 週に数回 / 月に数回 のいずれか併記）",
  "  B. インストールしたが今は使っていない",
  "  C. まだインストールしていない",
  "",
  "Q2（任意）: 自由にお書きください。",
  "  A の方: 使い始めて一番困っていること・改善してほしいこと",
  "  B の方: 使うのをやめた理由",
  "  C の方: インストールに踏み切らなかった理由",
  "",
  "────────────",
  "",
  "回答内容は Pro リリース時の機能設計に直接反映します。",
  "ご協力ありがとうございます。",
  "",
  "--",
  "瀬尾 / Koji（株式会社クインクエ）",
  "https://lens.kojihq.com",
].join("\n");

type Contact = {
  id: string;
  email: string;
  unsubscribed: boolean;
};

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      "audience-id": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      confirm: { type: "boolean", default: false },
    },
    strict: true,
  });
  return {
    audienceId:
      values["audience-id"] ??
      process.env.RESEND_AUDIENCE_ID_WAITLIST ??
      DEFAULT_AUDIENCE_ID,
    dryRun: Boolean(values["dry-run"]),
    confirm: Boolean(values.confirm),
  };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env: ${name}`);
  return v;
}

async function listContacts(
  audienceId: string,
  apiKey: string,
): Promise<Contact[]> {
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new Error(
      `Resend list contacts failed: ${res.status} ${JSON.stringify(parsed)}`,
    );
  }

  return ((parsed as { data?: Contact[] }).data ?? []).filter(
    (c) => !c.unsubscribed,
  );
}

async function sendOne(
  to: string,
  from: string,
  replyTo: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject: SUBJECT,
      text: BODY,
    }),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return { ok: res.ok, status: res.status, body: parsed };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked =
    local.length <= 2 ? "*".repeat(local.length) : `${local[0]}***${local.slice(-1)}`;
  return `${masked}@${domain}`;
}

async function main() {
  const { audienceId, dryRun, confirm } = parseCliArgs();

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "support@kojihq.com";
  const fromName = process.env.RESEND_FROM_NAME ?? "瀬尾 / Koji";
  const from = `${fromName} <${fromEmail}>`;
  const replyTo = "support@kojihq.com";

  if (dryRun) {
    console.log("[dry-run] no API send");
    console.log("--- payload template ---");
    console.log(
      JSON.stringify(
        {
          from,
          to: ["<each recipient>"],
          reply_to: replyTo,
          subject: SUBJECT,
          text: BODY,
        },
        null,
        2,
      ),
    );
    console.log("--- recipient count ---");

    if (!process.env.RESEND_API_KEY) {
      console.log("(RESEND_API_KEY not set, skipping audience fetch)");
      console.log("set RESEND_API_KEY to also see the recipient count.");
      return;
    }
    const contacts = await listContacts(audienceId, process.env.RESEND_API_KEY);
    console.log(`subscribed contacts: ${contacts.length}`);
    console.log("recipients (masked):");
    for (const c of contacts) console.log(`  - ${maskEmail(c.email)}`);
    return;
  }

  if (!confirm) {
    console.error(
      "real send requires --confirm. add --confirm or use pnpm survey:dry-run first.",
    );
    process.exit(1);
  }

  const apiKey = requireEnv("RESEND_API_KEY");
  const contacts = await listContacts(audienceId, apiKey);

  if (contacts.length === 0) {
    console.log("no subscribed contacts. nothing to send.");
    return;
  }

  console.log(`sending to ${contacts.length} subscribed contacts...`);
  console.log(`from: ${from}`);
  console.log(`reply-to: ${replyTo}`);
  console.log("");

  let sent = 0;
  let failed = 0;
  for (const [i, c] of contacts.entries()) {
    const masked = maskEmail(c.email);
    process.stdout.write(`[${i + 1}/${contacts.length}] ${masked} ... `);
    try {
      const r = await sendOne(c.email, from, replyTo, apiKey);
      if (r.ok) {
        sent += 1;
        console.log("ok");
      } else {
        failed += 1;
        console.log(`FAILED (${r.status}) ${JSON.stringify(r.body)}`);
      }
    } catch (e) {
      failed += 1;
      console.log(`ERROR ${(e as Error).message}`);
    }
    if (i < contacts.length - 1) await sleep(500);
  }

  console.log("");
  console.log(`done. sent=${sent} failed=${failed} total=${contacts.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
