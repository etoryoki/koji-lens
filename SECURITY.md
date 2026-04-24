# Security Policy

## Supported Versions

`@kojihq/lens` and `@kojihq/core` are currently in public beta. The latest `@beta` tag on npm is the only supported version.

| Package | Version | Supported |
|---|---|---|
| `@kojihq/lens` | `0.1.0-beta.2` (latest beta) | ✅ |
| `@kojihq/core` | `0.1.0-beta.2` (latest beta) | ✅ |
| Older beta tags (`beta.0`, `beta.1`) | — | ❌ (deprecated on npm, upgrade to `@beta`) |

A stable `1.0` release is planned. Once it ships, the previous minor will receive security patches for at least 90 days.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, email: **support@kojihq.com**.

Include:

- Description of the vulnerability
- Steps to reproduce (a minimal example is ideal)
- Impact assessment (what an attacker could do)
- Your preferred credit line if you'd like acknowledgement in the fix notes

## Response Timeline

| Stage | Target |
|---|---|
| Acknowledgement of your report | within **3 business days** |
| Initial severity assessment | within **5 business days** |
| Patch release for critical issues | as soon as a safe fix is available |

We are a small team and operate in JST (UTC+9). Response time outside business hours may be slower.

## Scope

In-scope:

- CLI (`@kojihq/lens`) and core library (`@kojihq/core`) published on npm
- Bundled local web dashboard (`koji-lens serve`)
- Landing page at `https://lens.kojihq.com` (when live) and `https://koji-lens-lp.vercel.app`
- Cloud sync backend (planned, scope to expand once Pro launches)

Out of scope:

- Issues in third-party dependencies that are already tracked upstream (please report to the upstream project)
- Social engineering, phishing, or physical attacks
- Denial-of-service via resource exhaustion on local machines (the CLI is designed to run against your own log files)

## Bug Bounty

We do not currently run a bug bounty program. We may offer credit in release notes and, at our discretion, swag or a free Pro lifetime seat once Pro launches, for verified high-impact reports.

## Public Disclosure

Coordinated disclosure is preferred. Please give us a reasonable window (typically 30–90 days, depending on severity) to ship a fix before public disclosure. We will work with you on timing.

---

Last updated: 2026-04-24
