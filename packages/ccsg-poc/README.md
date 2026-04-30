# @kojihq/ccsg-poc

> **PoC ONLY — Day 45 evaluation. NOT for production.**

Proof-of-concept for **Claude Code Security Gateway (CCSG)**, the second-product candidate currently under evaluation as part of Koji's Day 45 (2026-06-05) integrated session.

This package validates the **reversible masking layer** — the technical core of CCSG. The full product would also need:

- HTTP interception (MITM proxy or wrapper CLI), evaluated separately at Day 45
- Japanese NER (GiNZA / spaCy), planned for Phase 1
- User-defined whitelist / custom rules, planned for Phase 1
- Multi-session placeholder reuse, design TBD at Day 45

**Background**: CEO strategy doc `ceo/strategy/2026-04-30-second-product-evaluation-prep-v0.1.md` (in the `ai-company` repo).

## Scope

- ✅ Mask emails, phone numbers, IPv4, JP company names (株式会社/有限会社/合同会社), private URLs
- ✅ Reversible: `mask` returns a mapping, `unmask` restores the original
- ✅ Session-scoped placeholder uniqueness (`<EMAIL_001>`, `<COMPANY_JP_002>`, etc.)
- ✅ Stats helper for PoC observability

## Out of scope (deferred)

- MITM proxy / HTTP interception
- Japanese NER beyond regex patterns (GiNZA / spaCy integration)
- Whitelist / user-defined rules
- Persistence layer (SQLite integration)
- Multi-session placeholder reuse

## Usage

```ts
import { mask, statsOf, unmask } from "@kojihq/ccsg-poc";

const text = "Contact us at support@kojihq.com from 192.168.1.42.";

const { masked, mapping } = mask(text);
// masked  → "Contact us at <EMAIL_001> from <IP_001>."
// mapping → Map { "<EMAIL_001>" => "support@kojihq.com", "<IP_001>" => "192.168.1.42" }

console.log(statsOf(mapping));
// { EMAIL: 1, PHONE: 0, IP: 1, COMPANY_JP: 0, URL_PRIVATE: 0 }

const restored = unmask(masked, mapping);
// restored === text (round-trip exact)
```

## Test

```bash
cd packages/ccsg-poc
pnpm install
pnpm test
```

Expect 10 tests covering: round-trip mask/unmask for each rule, mixed-content scenarios, edge cases (empty mapping, no-op unmask), and placeholder ordering safety.

## Day 45 evaluation findings

(To be filled by CEO after PoC review during the 6/05 integrated session.)

| Question | Finding |
|---|---|
| **深町 1**: HTTP プロキシ vs hook 実装感 | TBD (separate PoC: MITM prototype) |
| **深町 2**: 日本語 NER 精度（regex のみで実用域に到達するか） | TBD (current regex-only baseline; GiNZA addition needed for production) |
| **深町 3**: 可逆マスクのプレースホルダー管理 | ✅ 実装可、Map ベースで衝突なし。長さ順ソートで部分一致防止 |
| **鷹野 A**: ターゲット層 | TBD (research email signal needed) |
| **鷹野 B**: koji-lens 統合 vs 独立 | TBD (Day 45 board decision) |
| **鷹野 C**: ブランド整合性 | TBD (Designer 諮問予定) |

## Status

- **2026-04-30**: Initial PoC implementation — masker.ts + 10 tests + README
- **Next**: Day 45 (2026-06-05) integrated evaluation session

## License

Internal PoC — not yet published. Eventual production release will inherit the OSS strategy decided at Day 45 (Pro Team feature in koji-lens monorepo, separate Pro repo, or rejected entirely).
