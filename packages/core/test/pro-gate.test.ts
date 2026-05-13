import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isProAccessGranted, readIsBetaPeriod } from "../src/pro-gate.js";

// 5/13 β 期間 Pro 無料化決裁 (`ceo/decisions/2026-05-13-pro-free-during-beta.md`)
// 整合の Pro 機能アクセス権限判定テスト。

describe("isProAccessGranted", () => {
  describe("β 期間中 (isBetaPeriod=true)", () => {
    it("role=free でも true (β 期間中は全員 Pro 機能アクセス可)", () => {
      expect(
        isProAccessGranted({ isBetaPeriod: true, userRole: "free" }),
      ).toBe(true);
    });

    it("role=pro でも true", () => {
      expect(
        isProAccessGranted({ isBetaPeriod: true, userRole: "pro" }),
      ).toBe(true);
    });

    it("role=admin でも true", () => {
      expect(
        isProAccessGranted({ isBetaPeriod: true, userRole: "admin" }),
      ).toBe(true);
    });
  });

  describe("GA 後 (isBetaPeriod=false)", () => {
    it("role=free は false (GA 後は有料化、案 B 採用)", () => {
      expect(
        isProAccessGranted({ isBetaPeriod: false, userRole: "free" }),
      ).toBe(false);
    });

    it("role=pro は true", () => {
      expect(
        isProAccessGranted({ isBetaPeriod: false, userRole: "pro" }),
      ).toBe(true);
    });

    it("role=admin は true", () => {
      expect(
        isProAccessGranted({ isBetaPeriod: false, userRole: "admin" }),
      ).toBe(true);
    });
  });
});

describe("readIsBetaPeriod", () => {
  const originalEnv = process.env.IS_BETA_PERIOD;

  beforeEach(() => {
    delete process.env.IS_BETA_PERIOD;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.IS_BETA_PERIOD;
    } else {
      process.env.IS_BETA_PERIOD = originalEnv;
    }
  });

  it("環境変数未設定なら false", () => {
    expect(readIsBetaPeriod()).toBe(false);
  });

  it("'true' (小文字) なら true", () => {
    process.env.IS_BETA_PERIOD = "true";
    expect(readIsBetaPeriod()).toBe(true);
  });

  it("'TRUE' (大文字) なら true (case-insensitive)", () => {
    process.env.IS_BETA_PERIOD = "TRUE";
    expect(readIsBetaPeriod()).toBe(true);
  });

  it("'True' (mixed case) なら true", () => {
    process.env.IS_BETA_PERIOD = "True";
    expect(readIsBetaPeriod()).toBe(true);
  });

  it("'false' なら false", () => {
    process.env.IS_BETA_PERIOD = "false";
    expect(readIsBetaPeriod()).toBe(false);
  });

  it("'1' なら false (truthy 文字列でも 'true' でなければ false)", () => {
    process.env.IS_BETA_PERIOD = "1";
    expect(readIsBetaPeriod()).toBe(false);
  });

  it("空文字なら false", () => {
    process.env.IS_BETA_PERIOD = "";
    expect(readIsBetaPeriod()).toBe(false);
  });
});
