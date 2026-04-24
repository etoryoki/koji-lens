#!/usr/bin/env -S node --experimental-strip-types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- standalone script executed via tsx, no project tsconfig in scripts/

/**
 * Post to Bluesky from CLI using @atproto/api.
 *
 * Requires env:
 *   BLUESKY_IDENTIFIER       e.g. "kojihq.com" or "kojihq.bsky.social"
 *   BLUESKY_APP_PASSWORD     app-password generated in Bluesky settings
 *   BLUESKY_SERVICE          optional, defaults to "https://bsky.social"
 *
 * Usage:
 *   pnpm post:bluesky --text "..." --link "https://..." [--dry-run]
 *   pnpm post:bluesky --text-file ./post.txt --link "https://..." [--dry-run]
 *
 * Behaviour:
 *   - Detects URLs / mentions / hashtags in text → facets (clickable)
 *   - If --link is given, fetches og:title / og:description / og:image and
 *     attaches an external link card (uploads og:image as blob).
 *   - --dry-run prints the resolved payload without logging in / posting.
 *   - Post language is tagged as "ja" by default (override with --lang).
 */

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { AtpAgent, RichText } from "@atproto/api";

type Args = {
  text?: string;
  textFile?: string;
  link?: string;
  lang: string;
  dryRun: boolean;
};

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      text: { type: "string" },
      "text-file": { type: "string" },
      link: { type: "string" },
      lang: { type: "string", default: "ja" },
      "dry-run": { type: "boolean", default: false },
    },
    strict: true,
  });
  return {
    text: values.text,
    textFile: values["text-file"],
    link: values.link,
    lang: values.lang ?? "ja",
    dryRun: Boolean(values["dry-run"]),
  };
}

async function loadText(args: Args): Promise<string> {
  if (args.text && args.textFile) {
    throw new Error("specify only one of --text or --text-file");
  }
  if (args.text) return args.text;
  if (args.textFile) return (await readFile(args.textFile, "utf-8")).trim();
  throw new Error("must specify --text or --text-file");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env: ${name}`);
  return v;
}

type Ogp = {
  title: string;
  description: string;
  imageUrl?: string;
};

function extractMeta(html: string, property: string): string | undefined {
  // og:title, og:description, og:image
  const re = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return m[1];
  // fallback: name=""
  const re2 = new RegExp(
    `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1];
}

async function fetchOgp(url: string): Promise<Ogp> {
  const res = await fetch(url, {
    headers: { "user-agent": "koji-lens bluesky-post/0.1" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`OGP fetch failed: ${res.status} ${url}`);
  const html = await res.text();
  const title = extractMeta(html, "og:title") ?? extractMeta(html, "twitter:title") ?? new URL(url).hostname;
  const description =
    extractMeta(html, "og:description") ??
    extractMeta(html, "description") ??
    extractMeta(html, "twitter:description") ??
    "";
  const imageUrl = extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");
  return { title, description, imageUrl };
}

async function fetchImage(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": "koji-lens bluesky-post/0.1" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`image fetch failed: ${res.status} ${url}`);
  const mime = res.headers.get("content-type")?.split(";")[0] ?? "image/png";
  const buf = await res.arrayBuffer();
  return { bytes: new Uint8Array(buf), mime };
}

async function main() {
  const args = parseCliArgs();
  const text = await loadText(args);
  const service = process.env.BLUESKY_SERVICE ?? "https://bsky.social";

  // Build RichText + facets (best effort; auth is used only for handle resolution)
  const rt = new RichText({ text });

  const payload: {
    text: string;
    facets?: unknown;
    embed?: unknown;
    langs: string[];
    createdAt: string;
  } = {
    text: rt.text,
    langs: [args.lang],
    createdAt: new Date().toISOString(),
  };

  let ogp: Ogp | undefined;
  if (args.link) {
    console.error(`fetching OGP from ${args.link} ...`);
    ogp = await fetchOgp(args.link);
    console.error(`  title:       ${ogp.title}`);
    console.error(`  description: ${ogp.description.slice(0, 100)}${ogp.description.length > 100 ? "..." : ""}`);
    console.error(`  image:       ${ogp.imageUrl ?? "(none)"}`);
  }

  // Graphemes (Bluesky counts as graphemes; @atproto/api handles this internally for facets)
  console.error(`\ntext (${rt.text.length} chars):`);
  console.error(rt.text.split("\n").map((l) => `  | ${l}`).join("\n"));

  if (args.dryRun) {
    console.error("\n[dry-run] OGP preview:");
    if (ogp) {
      console.error(`  would attach external embed:`);
      console.error(`    uri:         ${args.link}`);
      console.error(`    title:       ${ogp.title}`);
      console.error(`    description: ${ogp.description.slice(0, 100)}${ogp.description.length > 100 ? "..." : ""}`);
      console.error(`    thumb:       ${ogp.imageUrl ? "(would upload)" : "(none)"}`);
    } else {
      console.error("  (no link card)");
    }
    console.error("\n[dry-run] not posting. rerun without --dry-run to publish.");
    return;
  }

  const identifier = requireEnv("BLUESKY_IDENTIFIER");
  const password = requireEnv("BLUESKY_APP_PASSWORD");

  const agent = new AtpAgent({ service });
  console.error(`\nlogging in as ${identifier} at ${service} ...`);
  await agent.login({ identifier, password });

  // Resolve handle mentions / URLs to facets (needs an authed agent to resolve handles)
  await rt.detectFacets(agent);
  payload.text = rt.text;
  payload.facets = rt.facets;

  // External link card with optional thumb
  if (args.link && ogp) {
    let thumb: unknown;
    if (ogp.imageUrl) {
      try {
        const absolute = new URL(ogp.imageUrl, args.link).toString();
        console.error(`uploading link-card thumbnail: ${absolute}`);
        const { bytes, mime } = await fetchImage(absolute);
        const up = await agent.uploadBlob(bytes, { encoding: mime });
        thumb = up.data.blob;
      } catch (err) {
        console.error(`  thumbnail upload failed, continuing without thumb: ${(err as Error).message}`);
      }
    }
    payload.embed = {
      $type: "app.bsky.embed.external",
      external: {
        uri: args.link,
        title: ogp.title,
        description: ogp.description,
        ...(thumb ? { thumb } : {}),
      },
    };
  }

  console.error("\nposting ...");
  const result = await agent.post(payload as Parameters<typeof agent.post>[0]);
  console.error(`\nposted: ${result.uri}`);
  const rkey = result.uri.split("/").pop();
  const handle = identifier.includes(".") ? identifier : `${identifier}.bsky.social`;
  console.error(`view:   https://bsky.app/profile/${handle}/post/${rkey}`);
}

main().catch((err) => {
  console.error(`\nerror: ${(err as Error).message}`);
  process.exit(1);
});
