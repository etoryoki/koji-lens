import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 2026-05-11 プロトタイプ実装で検出: serve-e2e.test.ts と statusline-hang.test.ts の並列実行で
    // statusline `--combined` が hang (子プロセス環境 / port 干渉と推測)。
    // 子プロセス spawn 系テストはテストファイル間シリアル実行を強制する。
    fileParallelism: false,
    testTimeout: 35_000,
  },
});
