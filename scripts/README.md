# scripts/

Ad-hoc CEO operations scripts. Not part of the published packages.

## bluesky-post.ts

Post to Bluesky from CLI using `@atproto/api`.

### Setup

1. Install deps at repo root (already added to root `package.json` devDeps):
   ```bash
   pnpm install
   ```

2. Put credentials in an env file **that is never committed**:
   ```bash
   # scripts/.env.local  (gitignored by repo-root .gitignore pattern .env*)
   BLUESKY_IDENTIFIER=kojihq.bsky.social
   BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

   `BLUESKY_IDENTIFIER` switches to `kojihq.com` once custom-domain verification completes. `BLUESKY_APP_PASSWORD` is the Bluesky app-password (NOT the main account password).

### Usage

```bash
# dry-run (no login, previews payload + OGP)
pnpm post:bluesky --dry-run --text "hello bsky" --link "https://github.com/etoryoki/koji-lens"

# real post, text from a file
pnpm post:bluesky --text-file ./scripts/posts/2026-04-24-beta-launch.txt --link "https://github.com/etoryoki/koji-lens"

# inline text, no link card
pnpm post:bluesky --text "リリースノート: v0.1.0-beta.3 公開"
```

Flags:
- `--text <s>` or `--text-file <path>` (one of, required)
- `--link <url>` optional, auto-fetches og:title / og:description / og:image and attaches as an external link card
- `--lang <code>` defaults to `ja`
- `--dry-run` prints the payload and OGP without logging in or posting

### What the script does

- `RichText.detectFacets()` finds URLs / mentions / hashtags in the text and annotates byte-level facets so they render as clickable links in Bluesky clients.
- For `--link`, it fetches the target page, parses `og:title` / `og:description` / `og:image` with a lightweight regex (sufficient for GitHub, npm, Vercel-hosted LPs), downloads the og:image as bytes, uploads it as a Bluesky blob, and attaches `app.bsky.embed.external` pointing at the URL with the uploaded blob as thumbnail.
- Post language is tagged `ja` by default — set `--lang en` for English posts.

### Security notes

- `BLUESKY_APP_PASSWORD` is scoped to posting / profile edits; it is NOT the main password. If leaked, revoke in Bluesky Settings → App Passwords and regenerate.
- `scripts/.env.local` is covered by the repo-root `.env*` gitignore. Do not commit env files.
- Do not paste app passwords into chat / PRs / issues.

## send-support-test.ts

Send a plain-text test email from `support@kojihq.com` via the Resend HTTP API.

Used to verify Resend's outbound path for the support inbox is wired up correctly
(SPF / DKIM / DMARC pass, no spam-folder routing, correct `From` rendering).

### Setup

1. Add the Resend API key to `scripts/.env.local`:
   ```bash
   # scripts/.env.local
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   # optional overrides:
   # RESEND_FROM_EMAIL=support@kojihq.com
   # RESEND_FROM_NAME=Koji Support
   ```

   Reuse the same API key already configured in Vercel (`RESEND_API_KEY`),
   or generate a sending-only key in the Resend dashboard if you want tighter
   scoping. The key must have `emails:send` permission.

2. No additional install needed — the script uses the built-in `fetch`
   (Node 22+) and POSTs straight to `https://api.resend.com/emails`.

### Usage

```bash
# dry-run (no API key required, prints the payload only)
pnpm support:send --to your-personal@gmail.com --dry-run

# real send with the default body / subject
pnpm support:send --to your-personal@gmail.com

# custom subject + inline body
pnpm support:send \
  --to your-personal@gmail.com \
  --subject "[テスト] support 送信確認" \
  --text "短い本文"

# body from a file
pnpm support:send --to your-personal@gmail.com --text-file ./scripts/posts/support-test.txt
```

Flags:
- `--to <email>` required, recipient address
- `--subject <s>` optional, defaults to `[テスト] support@kojihq.com 送信確認`
- `--text <s>` or `--text-file <path>` optional; if neither, a default test body is used
- `--dry-run` prints the resolved payload and exits without calling the API

### What to verify on receipt

- `From` displays as `Koji Support <support@kojihq.com>`
- Lands in the primary inbox, not spam
- In Gmail: open the message → ︙ → "Show original" → confirm `SPF=PASS` /
  `DKIM=PASS` / `DMARC=PASS`
- Resend dashboard `Logs` shows the message with status `delivered`

### Security notes

- `RESEND_API_KEY` grants the ability to send mail on behalf of `kojihq.com`.
  Treat it like a credential. If leaked, revoke in Resend dashboard →
  API Keys → Revoke and rotate everywhere it's used (Vercel env vars, etc).
- Same gitignore protection applies (`scripts/.env.local`).
