import { describe, expect, it } from "vitest";
import { mask, statsOf, unmask } from "../masker.js";

describe("mask + unmask (round-trip)", () => {
  it("masks email and restores it", () => {
    const text = "Contact me at user@example.com for details.";
    const { masked, mapping } = mask(text);
    expect(masked).toContain("<EMAIL_001>");
    expect(masked).not.toContain("user@example.com");
    expect(unmask(masked, mapping)).toBe(text);
  });

  it("masks multiple emails with unique placeholders", () => {
    const text = "From: a@x.com. CC: b@y.com, c@z.com.";
    const { masked, mapping } = mask(text);
    expect(masked).toContain("<EMAIL_001>");
    expect(masked).toContain("<EMAIL_002>");
    expect(masked).toContain("<EMAIL_003>");
    expect(unmask(masked, mapping)).toBe(text);
  });

  it("masks IPv4 addresses", () => {
    const text = "Server at 192.168.1.42 responded to 8.8.8.8.";
    const { masked, mapping } = mask(text);
    expect(masked).toContain("<IP_001>");
    expect(masked).toContain("<IP_002>");
    expect(unmask(masked, mapping)).toBe(text);
  });

  it("does not mask version-like patterns (1.0.0.1) as IPv4 if invalid", () => {
    const text = "Version 1.0.0.1 was released.";
    const { masked } = mask(text);
    // 1.0.0.1 is technically a valid IPv4, so it WILL be masked.
    // This test documents the false-positive behavior for the PoC.
    expect(masked).toContain("<IP_001>");
  });

  it("masks JP company names (株式会社/有限会社)", () => {
    const text = "本日は株式会社サンプルにて打ち合わせ。有限会社テストも参加。";
    const { masked, mapping } = mask(text);
    expect(masked).toContain("<COMPANY_JP_001>");
    expect(masked).toContain("<COMPANY_JP_002>");
    expect(unmask(masked, mapping)).toBe(text);
  });

  it("masks private URLs (192.168.*, *.local)", () => {
    const text = "Check http://192.168.1.10:8080/api and https://server.local/health";
    const { masked, mapping } = mask(text);
    const stats = statsOf(mapping);
    // private URL pattern subsumes the IP, so URL_PRIVATE may match first
    expect(stats.URL_PRIVATE).toBeGreaterThanOrEqual(1);
    expect(unmask(masked, mapping)).toBe(text);
  });

  it("handles mixed content with multiple rule types", () => {
    const text = `
      お疲れ様です。株式会社サンプルの担当です。
      サーバ障害の件、user@kojihq.com まで連絡をお願いします。
      影響範囲: 192.168.1.0/24 のクライアント、約 03-1234-5678 件の問い合わせ想定。
    `.trim();
    const { masked, mapping } = mask(text);
    const stats = statsOf(mapping);

    expect(stats.COMPANY_JP).toBe(1);
    expect(stats.EMAIL).toBe(1);
    expect(stats.IP).toBeGreaterThanOrEqual(1);
    // Round-trip exact
    expect(unmask(masked, mapping)).toBe(text);
  });

  it("returns empty mapping for text with no sensitive content", () => {
    const text = "Hello world. This is a public string.";
    const { masked, mapping } = mask(text);
    expect(masked).toBe(text);
    expect(mapping.size).toBe(0);
  });

  it("unmask is no-op for text without placeholders", () => {
    const text = "Plain text.";
    const mapping = new Map<string, string>();
    expect(unmask(text, mapping)).toBe(text);
  });

  it("statsOf counts placeholder types correctly", () => {
    const text = "a@b.com, c@d.com, 192.168.1.1";
    const { mapping } = mask(text);
    const stats = statsOf(mapping);
    expect(stats.EMAIL).toBe(2);
    // 192.168.1.1 may be matched by URL_PRIVATE rule depending on order; test loose
    expect(stats.IP + stats.URL_PRIVATE).toBeGreaterThanOrEqual(1);
  });
});

describe("placeholder ordering safety", () => {
  it("unmask sorts placeholders by length descending to avoid partial-match collision", () => {
    // Construct a contrived case where <EMAIL_001> could be a prefix of <EMAIL_0010> etc.
    // PoC version uses 3-digit padding so this is mostly hypothetical, but ensure correctness.
    const mapping = new Map<string, string>();
    mapping.set("<EMAIL_001>", "alice@x.com");
    mapping.set("<EMAIL_010>", "bob@y.com");
    const masked = "From <EMAIL_001> to <EMAIL_010>";
    const restored = unmask(masked, mapping);
    expect(restored).toBe("From alice@x.com to bob@y.com");
  });
});
