#!/usr/bin/env -S node --experimental-strip-types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/**
 * Initial / ongoing Bluesky profile setup for Koji.
 *
 * Usage:
 *   pnpm bluesky:profile                      # dry-run: show login, DID, current profile, target diff
 *   pnpm bluesky:profile --confirm            # apply displayName/description
 *   pnpm bluesky:profile --avatar path.png    # also upload and attach avatar (requires --confirm)
 *
 * Requires env (loaded from scripts/.env.local):
 *   BLUESKY_IDENTIFIER, BLUESKY_APP_PASSWORD
 */

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { AtpAgent } from "@atproto/api";

const TARGET_DISPLAY_NAME = "Koji";

const TARGET_DESCRIPTION = `小さなソフトウェアで、AI コーディングの成果を増幅する。
Small software that amplifies AI coding outcomes.

第一弾 / First product: koji-lens
local CLI for Claude Code (β · OSS / MIT)

🇯🇵 lens.kojihq.com  🇬🇧 lens.kojihq.com/en`;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env: ${name}`);
  return v;
}

function countGraphemes(s: string): number {
  // Bluesky counts graphemes; approximate with Intl.Segmenter for informational display
  // (server-side truth is authoritative, this is just for local sanity)
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return [...seg.segment(s)].length;
}

async function main() {
  const { values } = parseArgs({
    options: {
      confirm: { type: "boolean", default: false },
      avatar: { type: "string" },
    },
    strict: true,
  });
  const confirm = Boolean(values.confirm);
  const avatarPath = values.avatar;

  const identifier = requireEnv("BLUESKY_IDENTIFIER");
  const password = requireEnv("BLUESKY_APP_PASSWORD");
  const service = process.env.BLUESKY_SERVICE ?? "https://bsky.social";

  const agent = new AtpAgent({ service });
  console.error(`logging in as ${identifier} ...`);
  await agent.login({ identifier, password });
  const session = agent.session!;
  console.error(`  ok. handle: ${session.handle}`);
  console.error(`      did:    ${session.did}`);

  console.error("\nfetching current profile ...");
  const current = await agent.getProfile({ actor: session.did });
  console.error("  --- current ---");
  console.error(`  displayName: ${current.data.displayName ?? "(none)"}`);
  console.error(`  description: ${current.data.description ? `(${countGraphemes(current.data.description)} graphemes)` : "(none)"}`);
  if (current.data.description) {
    for (const line of current.data.description.split("\n")) console.error(`    | ${line}`);
  }
  console.error(`  avatar:      ${current.data.avatar ?? "(none)"}`);

  console.error("\n  --- target ---");
  console.error(`  displayName: ${TARGET_DISPLAY_NAME}`);
  console.error(`  description: (${countGraphemes(TARGET_DESCRIPTION)} graphemes)`);
  for (const line of TARGET_DESCRIPTION.split("\n")) console.error(`    | ${line}`);
  console.error(`  avatar:      ${avatarPath ?? "(unchanged)"}`);

  // Upload avatar blob if requested
  let avatarBlob: unknown;
  if (avatarPath) {
    console.error(`\nreading avatar ${avatarPath} ...`);
    const bytes = await readFile(avatarPath);
    const mime = avatarPath.endsWith(".png") ? "image/png" : avatarPath.endsWith(".jpg") || avatarPath.endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream";
    console.error(`  ${bytes.length} bytes (${mime})`);
    if (confirm) {
      const up = await agent.uploadBlob(bytes, { encoding: mime });
      avatarBlob = up.data.blob;
      console.error("  uploaded.");
    } else {
      console.error("  (dry-run, not uploading)");
    }
  }

  if (!confirm) {
    console.error("\n[dry-run] rerun with --confirm to apply changes.");
    console.error("\n--- DNS TXT record for custom-domain handle ---");
    console.error(`host:  _atproto.kojihq.com`);
    console.error(`type:  TXT`);
    console.error(`value: did=${session.did}`);
    return;
  }

  console.error("\napplying profile update ...");
  await agent.upsertProfile((existing) => ({
    ...existing,
    displayName: TARGET_DISPLAY_NAME,
    description: TARGET_DESCRIPTION,
    ...(avatarBlob ? { avatar: avatarBlob } : {}),
  }));
  console.error("  done.");

  console.error("\n--- DNS TXT record for custom-domain handle ---");
  console.error(`host:  _atproto.kojihq.com`);
  console.error(`type:  TXT`);
  console.error(`value: did=${session.did}`);
  console.error(`ttl:   default (300s) is fine`);
  console.error("\nafter owner adds this TXT record and it propagates,");
  console.error("run bluesky change-handle to kojihq.com.");
}

main().catch((err) => {
  console.error(`\nerror: ${(err as Error).message}`);
  process.exit(1);
});
