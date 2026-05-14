import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// 5/02 深町 CTO 監査 + queue.md L215 整合: localhost 経由前提の CLI standalone
// server でも必須セキュリティヘッダー 4 件は best practice として追加。
// CSP nonce 戦略は別タスク (koji-lens-lp + koji-lens-pro = Vercel deploy 暴露面
// 優先) として分割、apps/web は CLI 同梱の standalone で攻撃面が極めて限定的
// (ユーザー手元 localhost のみ) のため CSP は省略。
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(currentDir, "../../"),
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // 2026-05-14 (深町 CTO 5/02 監査推奨採用): apps/web で next/image 未使用、
  // sharp + @img (≈ 730KB) を image optimization で含めない設定。
  // CLI 同梱の web-standalone サイズを約 700KB 削減。
  images: { unoptimized: true },
};

export default nextConfig;
