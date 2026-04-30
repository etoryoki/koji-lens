/**
 * @kojihq/ccsg-poc — Reversible Masker (PoC)
 *
 * Day 45 evaluation PoC for "Claude Code Security Gateway".
 * Validates the technical feasibility of masking sensitive content
 * before sending to Claude API and unmasking it from the response.
 *
 * Scope (PoC, NOT production):
 * - Mask emails, phone numbers, IPs, JP company names (株式会社/有限会社 patterns)
 * - Reversible: mask returns mapping, unmask restores original
 * - Session-scoped namespacing (placeholder uniqueness within a session)
 *
 * Out of scope:
 * - MITM proxy / HTTP interception (separate concern, evaluated at Day 45)
 * - Japanese NER (GiNZA / spaCy integration deferred to Phase 1)
 * - Whitelist / user-defined rules (Phase 1 feature)
 */

export type PlaceholderType =
  | "EMAIL"
  | "PHONE"
  | "IP"
  | "COMPANY_JP"
  | "URL_PRIVATE";

export type Placeholder = {
  type: PlaceholderType;
  index: number; // 1-based, e.g. EMAIL_001
  original: string;
};

export type MaskResult = {
  masked: string;
  mapping: Map<string, string>; // placeholder string -> original
};

const RULES: { type: PlaceholderType; pattern: RegExp }[] = [
  // Emails (RFC 5322 simplified)
  {
    type: "EMAIL",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  // Phone (JP: 03-XXXX-XXXX, 090-XXXX-XXXX, +81-... ; international: +CC ...)
  {
    type: "PHONE",
    pattern: /(?:\+?\d{1,3}[-\s]?)?(?:\(\d{1,4}\)|\d{1,4})[-\s]?\d{1,4}[-\s]?\d{3,4}/g,
  },
  // IP v4
  {
    type: "IP",
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  },
  // JP company names (株式会社X, 有限会社X — naive pattern)
  {
    type: "COMPANY_JP",
    pattern: /(?:株式会社|有限会社|合同会社)[一-龯ぁ-んァ-ヶーA-Za-z0-9]{1,30}/g,
  },
  // Private URLs (192.168.*, 10.*, 172.16-31.*, *.local, internal-*)
  {
    type: "URL_PRIVATE",
    pattern: /https?:\/\/(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[0-1])\.|[a-z0-9-]+\.local|internal-[a-z0-9-]+)[^\s]*/gi,
  },
];

/**
 * Mask sensitive content in text.
 * Returns the masked text + a mapping for reversal.
 */
export function mask(text: string): MaskResult {
  const mapping = new Map<string, string>();
  const counters: Record<PlaceholderType, number> = {
    EMAIL: 0,
    PHONE: 0,
    IP: 0,
    COMPANY_JP: 0,
    URL_PRIVATE: 0,
  };

  let masked = text;
  for (const rule of RULES) {
    masked = masked.replace(rule.pattern, (match) => {
      // Skip if match is too short to be meaningful (avoid false positives like "1.0")
      if (rule.type === "IP" && !isValidIPv4(match)) return match;

      counters[rule.type] += 1;
      const placeholder = `<${rule.type}_${pad3(counters[rule.type])}>`;
      mapping.set(placeholder, match);
      return placeholder;
    });
  }

  return { masked, mapping };
}

/**
 * Restore original content from masked text using the mapping.
 * Sorted by placeholder length (descending) to avoid partial-match collisions.
 */
export function unmask(text: string, mapping: Map<string, string>): string {
  const placeholders = Array.from(mapping.keys()).sort(
    (a, b) => b.length - a.length,
  );

  let restored = text;
  for (const placeholder of placeholders) {
    const original = mapping.get(placeholder);
    if (!original) continue;
    restored = restored.split(placeholder).join(original);
  }
  return restored;
}

/**
 * Stats: count of placeholders by type. Useful for PoC observation.
 */
export function statsOf(mapping: Map<string, string>): Record<PlaceholderType, number> {
  const stats: Record<PlaceholderType, number> = {
    EMAIL: 0,
    PHONE: 0,
    IP: 0,
    COMPANY_JP: 0,
    URL_PRIVATE: 0,
  };
  for (const placeholder of mapping.keys()) {
    const m = placeholder.match(/^<([A-Z_]+)_\d{3}>$/);
    if (!m) continue;
    const type = m[1] as PlaceholderType;
    if (type in stats) stats[type] += 1;
  }
  return stats;
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function isValidIPv4(s: string): boolean {
  const parts = s.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}
