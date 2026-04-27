#!/usr/bin/env -S node --experimental-strip-types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- standalone script executed via tsx, no project tsconfig in scripts/

/**
 * Print the subscribed contact count of a Resend Audience.
 * Does not print individual emails or PII.
 *
 * Requires env:
 *   RESEND_API_KEY              Resend API key (re_xxx...)
 *   RESEND_AUDIENCE_ID_WAITLIST optional, defaults to the waitlist audience id
 *
 * Usage:
 *   pnpm waitlist:count
 *   pnpm waitlist:count --audience-id <id>
 *
 * Output:
 *   total contacts: N
 *   subscribed:     M (mail-deliverable)
 *   unsubscribed:   N - M
 */

import { parseArgs } from "node:util";

const DEFAULT_AUDIENCE_ID = "3f1d263c-4e7b-49b2-9997-6810a933e97c";

type Contact = {
  id: string;
  email: string;
  unsubscribed: boolean;
};

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      "audience-id": { type: "string" },
    },
    strict: true,
  });
  return {
    audienceId:
      values["audience-id"] ??
      process.env.RESEND_AUDIENCE_ID_WAITLIST ??
      DEFAULT_AUDIENCE_ID,
  };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env: ${name}`);
  return v;
}

async function main() {
  const { audienceId } = parseCliArgs();
  const apiKey = requireEnv("RESEND_API_KEY");

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
    console.error(`[error] Resend API returned ${res.status} ${res.statusText}`);
    console.error(parsed);
    process.exit(1);
  }

  // Resend list shape: { object: "list", data: Contact[] }
  const data = (parsed as { data?: Contact[] }).data ?? [];
  const total = data.length;
  const subscribed = data.filter((c) => !c.unsubscribed).length;
  const unsubscribed = total - subscribed;

  console.log(`audience id:   ${audienceId}`);
  console.log(`total contacts: ${total}`);
  console.log(`subscribed:     ${subscribed} (mail-deliverable)`);
  console.log(`unsubscribed:   ${unsubscribed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
