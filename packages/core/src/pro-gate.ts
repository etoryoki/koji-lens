/**
 * Pro 機能アクセス権限判定
 *
 * 5/13 β 期間 Pro 無料化決裁 (`ceo/decisions/2026-05-13-pro-free-during-beta.md`)
 * 整合: β 期間中は全ユーザー (role=free 含む) で Pro 機能アクセス可、GA 後は
 * role='pro' or 'admin' のみアクセス可。
 *
 * 深町 CTO 諮問 (`ceo/strategy/2026-05-13-pro-free-during-beta-v0.2.md` §2.2)
 * 推奨実装案: `IS_BETA_PERIOD` 環境変数で制御、GA 切替は Vercel ダッシュボードで
 * 変数を `false` に変更 + Redeploy のみで全パッケージに伝播 (ハードコード案より
 * 切替コスト最小)。
 */

/**
 * users.role の取りうる値域 (core-pg の USER_ROLES と同期)。
 *
 * 深町 Nit 採用: `'beta'` ロールは追加しない方針確定 (β 識別は
 * `IS_BETA_PERIOD` env で行い、role は GA 後の課金状態のみを表す)。
 */
export type UserRole = "free" | "pro" | "admin";

export interface ProAccessOptions {
  isBetaPeriod: boolean;
  userRole: UserRole;
}

/**
 * Pro 機能アクセス権限を判定する。
 *
 * - `isBetaPeriod === true` (β 期間中): すべての role で `true` を返す
 *   (鷹野 COO 最大反論「案 B (有料化)」採用整合、β 期間中は全機能無料)
 * - `isBetaPeriod === false` (GA 後): `role === 'pro' | 'admin'` のみ `true`
 */
export function isProAccessGranted(opts: ProAccessOptions): boolean {
  if (opts.isBetaPeriod) return true;
  return opts.userRole === "pro" || opts.userRole === "admin";
}

/**
 * `IS_BETA_PERIOD` 環境変数を読み込んで boolean に変換。
 *
 * 値の解釈:
 * - `"true"` (大文字小文字区別なし、ただし lowercase 推奨) → `true`
 * - 未設定 / `"false"` / その他 → `false`
 *
 * 深町 Warning 2 採用: Next.js Edge Runtime 環境では `process.env` アクセスに
 * 制限がある場合があり、middleware 等で参照する場合は `runtime = 'nodejs'`
 * 明示 or `@vercel/edge-config` 検討。CLI / Node.js Server Component / API
 * Route 等は直接参照可能。
 */
export function readIsBetaPeriod(): boolean {
  return process.env.IS_BETA_PERIOD?.toLowerCase() === "true";
}
