#!/usr/bin/env -S node --experimental-strip-types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- standalone script executed via tsx, no project tsconfig in scripts/

/**
 * Send a test email from support@kojihq.com via Resend HTTP API.
 *
 * Requires env:
 *   RESEND_API_KEY        Resend API key (re_xxx...)
 *   RESEND_FROM_EMAIL     optional, defaults to "support@kojihq.com"
 *   RESEND_FROM_NAME      optional, defaults to "Koji Support"
 *
 * Usage:
 *   pnpm support:send --to your@example.com [--subject "..."] [--text "..."] [--text-file ./body.txt] [--dry-run]
 *
 * Behaviour:
 *   - Sends a plain-text email via POST https://api.resend.com/emails
 *   - --dry-run prints the resolved payload without calling the API or requiring an API key
 *   - On success prints the Resend message id
 *   - On failure prints the API response body and exits non-zero
 */

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

type Args = {
  to: string;
  subject: string;
  text?: string;
  textFile?: string;
  dryRun: boolean;
};

const DEFAULT_SUBJECT = "[テスト] support@kojihq.com 送信確認";
const DEFAULT_BODY = [
  "support@kojihq.com からの送信テストです。",
  "",
  "このメールが受信できていれば、Resend 送信パスは正常稼働しています。",
  "",
  "確認ポイント:",
  "  - From が support@kojihq.com で表示されている",
  "  - 迷惑メールフォルダではなくプライマリトレイに届いている",
  "  - SPF / DKIM / DMARC が PASS（Gmail は「メッセージのソースを表示」で確認）",
  "",
  "--",
  "Koji / 株式会社クインクエ",
  "https://lens.kojihq.com",
].join("\n");

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      to: { type: "string" },
      subject: { type: "string" },
      text: { type: "string" },
      "text-file": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
    strict: true,
  });
  if (!values.to) throw new Error("--to <email> is required");
  return {
    to: values.to,
    subject: values.subject ?? DEFAULT_SUBJECT,
    text: values.text,
    textFile: values["text-file"],
    dryRun: Boolean(values["dry-run"]),
  };
}

async function loadBody(args: Args): Promise<string> {
  if (args.text && args.textFile) {
    throw new Error("specify only one of --text or --text-file");
  }
  if (args.text) return args.text;
  if (args.textFile) return (await readFile(args.textFile, "utf-8")).trim();
  return DEFAULT_BODY;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env: ${name}`);
  return v;
}

async function main() {
  const args = parseCliArgs();
  const body = await loadBody(args);

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "support@kojihq.com";
  const fromName = process.env.RESEND_FROM_NAME ?? "Koji Support";
  const from = `${fromName} <${fromEmail}>`;

  const payload = {
    from,
    to: [args.to],
    subject: args.subject,
    text: body,
  };

  if (args.dryRun) {
    console.log("[dry-run] would POST https://api.resend.com/emails with payload:");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const apiKey = requireEnv("RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = responseText;
  }

  if (!res.ok) {
    console.error(`[error] Resend API returned ${res.status} ${res.statusText}`);
    console.error(parsed);
    process.exit(1);
  }

  console.log("[ok] sent");
  console.log(parsed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
