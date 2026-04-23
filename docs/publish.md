# Publish Playbook

`@kojihq/core` と `@kojihq/lens` を npm に publish する手順。**オーナー実行**が前提（npm 認証が必要）。

## 前提
- npm Organization `@kojihq` を取得済み（2026-04-22）
- オーナーの npm アカウントが `kojihq` Organization の owner / publisher 権限を持つ
- ローカル環境が Node.js >= 22、pnpm 9

## バージョニング方針
- 初版は **`0.1.0-beta.0`** として β 公開（両パッケージ同期）
- `--tag beta` で publish し、`npm i -g @kojihq/lens@beta` でのみ install 可能にする
- 致命バグ: 発見から 72 時間以内なら `npm unpublish`、それ以降は `npm deprecate` + 新 beta を公開
- 1.0 までは beta タグ運用、安定化したら `0.1.0` / `latest` タグへ移行

## 1 回目の publish 手順

### ステップ 1: 環境確認
```bash
cd /path/to/koji-lens
git status                                 # クリーンを確認
git pull origin main
node --version                             # v22.x
pnpm --version                             # 9.x
npm whoami                                 # ログインしているか
# 未ログインなら: npm login
```

### ステップ 2: クリーンビルド
```bash
pnpm install --frozen-lockfile
pnpm --filter @kojihq/core build           # packages/core/dist/ を生成
pnpm --filter @kojihq/web build            # apps/web/.next/standalone + static コピー
pnpm --filter @kojihq/lens build           # tsc + bundle-web-standalone
pnpm -r typecheck                          # 3 プロジェクト全 pass
pnpm test                                  # 25+ tests 全 pass を確認
```

### ステップ 3: Pack で中身とサイズの最終確認

**必ず `pnpm pack` を使う**（`npm pack` は `workspace:^` を絶対バージョンに置換しないため、壊れた tarball ができる）。

```bash
cd apps/cli && pnpm pack | tail -5
# tarball サイズが 10MB 以内であることを確認（現状 ~4.4MB）
# files 欄に web-standalone / dist / README.md / LICENSE が含まれることを確認

# workspace:^ が絶対バージョンに置換されていることを検証
tar -xzOf kojihq-lens-*.tgz package/package.json | grep -A 4 '"dependencies"'
# 期待: "@kojihq/core": "^0.1.0-beta.0"（"workspace:" が残っていたら中止）

# server.js に開発機の絶対パスが焼き込まれていないことを検証
tar -xzOf kojihq-lens-*.tgz package/web-standalone/apps/web/server.js | grep -o '"outputFileTracingRoot":"[^"]*"'
# 期待: "outputFileTracingRoot":"./"（絶対パスが出たら中止）

rm kojihq-lens-*.tgz
cd ../..

cd packages/core && pnpm pack | tail -5
# dist / README.md のみ
rm kojihq-core-*.tgz
cd ../..
```

### ステップ 4: `@kojihq/core` を publish

**必ず `pnpm publish` を使う**（`npm publish` は `workspace:^` が残留するため使用禁止）。

```bash
cd packages/core
pnpm publish --tag beta --access public --no-git-checks
# 成功出力: + @kojihq/core@0.1.0-beta.0
```

### ステップ 5: `@kojihq/lens` を publish
```bash
cd apps/cli
pnpm publish --tag beta --access public --no-git-checks
# 成功出力: + @kojihq/lens@0.1.0-beta.0
```

> `--no-git-checks` は pnpm のデフォルトで有効な「ブランチ = main 必須」チェックを回避するためのフラグ。main からの publish なら付けても付けなくても動くが、トピックブランチから hotfix publish する場合などで必要になる。

### ステップ 6: 公開確認
```bash
npm view @kojihq/core
npm view @kojihq/lens
# version, dist-tags.beta, files 欄を確認
```

### ステップ 7: 別環境（または別ディレクトリ）で install テスト
```bash
mkdir /tmp/koji-lens-smoketest && cd /tmp/koji-lens-smoketest
pnpm add -g @kojihq/lens@beta
koji-lens --version                        # 0.1.0-beta.0
koji-lens summary --since 24h              # 実ログの集計が出る
koji-lens serve --port 3210 &              # バックグラウンドで起動
curl -s http://127.0.0.1:3210/ | head -c 200
kill %1                                    # 停止
```

---

## 2 回目以降（バージョンアップ）

1. コード変更 → **`pnpm install`**（lockfile 同期、← 忘れがちなので注意）→ `pnpm -r typecheck` → `pnpm test`
2. バージョン bump: `packages/core/package.json` と `apps/cli/package.json` の両方を同じ値に
   - 変更なし: そのまま
   - パッチ: `0.1.0-beta.1`（β 継続）
   - マイナー: `0.2.0-beta.0`
   - 1.0 移行: `1.0.0`（`--tag latest` で publish）
3. CLI の `@kojihq/core` 依存バージョンも揃える（`workspace:^0.1.0-beta.1` 等、publish 時に `pnpm publish` が絶対バージョンへ置換する）
4. **version bump 後は必ず `pnpm install` を実行して `pnpm-lock.yaml` を同期し、commit に含める**。忘れると CI（`pnpm install --frozen-lockfile`）で ERR_PNPM_OUTDATED_LOCKFILE
5. クリーンビルド → publish → 公開確認

## Smoke test の原則（2026-04-23 の 3 段階 hotfix から学んだ鉄則）

> **workspace 内で `node dist/index.js` で動いても信頼してはいけない**。pnpm workspace は symlink で解決するため、registry install 時の `.pnpm/<pkg>@<ver>_<hash>/node_modules/<pkg>/` 構造と挙動が異なる。Native module や subpath export のバグは workspace で false positive になる。

以下のいずれかで必ず検証する:

### A. Registry 経由（publish 後）
```bash
mkdir /tmp/smoketest && cd /tmp/smoketest
pnpm init -y
pnpm add @kojihq/lens@beta
./node_modules/.bin/koji-lens --version
./node_modules/.bin/koji-lens summary --since 24h
./node_modules/.bin/koji-lens serve --port 3211 &
sleep 8 && curl -s -w "status=%{http_code}\n" http://127.0.0.1:3211/ | head -c 300
# port 3211 listen してる pid を kill（Windows）
pid=$(netstat -ano | grep ":3211 " | grep LISTEN | awk '{print $5}' | head -1)
[ -n "$pid" ] && taskkill //F //PID $pid
```

### B. Local tarball 経由（publish 前）
registry に未 publish の依存を使う場合は `pnpm.overrides` で local tarball を強制する:
```bash
cd packages/core && pnpm pack
cd ../../apps/cli && pnpm pack

mkdir /tmp/smoketest && cd /tmp/smoketest
cat > package.json <<'EOF'
{
  "name": "smoketest", "private": true, "type": "module",
  "dependencies": {
    "@kojihq/lens": "file:/abs/path/to/kojihq-lens-X.Y.Z.tgz"
  },
  "pnpm": {
    "overrides": {
      "@kojihq/core": "file:/abs/path/to/kojihq-core-X.Y.Z.tgz"
    }
  }
}
EOF
pnpm install
# 以降は A と同じ smoke test
```

**特に `koji-lens serve` は必ず HTTP probe する**。起動ログは問題なく出ても page render で `Cannot find module 'xxx-<hash>'`（Turbopack の external chunk 解決失敗）が起きうる。stderr と HTTP status 両方を確認。

---

## 認証: npm の web auth フロー

アカウントに TOTP 2FA を設定していなくても、最近の npm は **CLI publish 時にブラウザ承認フロー**で通るようになっている（2024-2025 の変更）。

`pnpm publish` を実行すると以下が出る:
```
Authenticate your account at:
https://www.npmjs.com/auth/cli/<uuid>
Press ENTER to open in the browser...
```

Enter キー → ブラウザで承認 → publish 続行。authenticator アプリも granular access token も不要。

ただし **`npm deprecate` や `npm dist-tag add` は OTP が必要**（web auth フロー非対応、2026-04 現在）。こちらは:
- Authenticator アプリに npm の TOTP を登録、または
- `--otp=<6桁>` を付けて実行（30 秒以内）

TOTP 未登録の場合は https://www.npmjs.com/settings/<username>/profile で 2FA を enable しておく。

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `ERR_PNPM_OUTDATED_LOCKFILE` | `pnpm install` で lockfile を同期して commit。version bump 後の定番 |
| `403 Forbidden — 2FA or bypass token required` | `pnpm publish` → Enter で web 認証フロー。OTP が必要な操作（deprecate/dist-tag）なら authenticator app を設定 |
| `E402 Payment Required` | Private パッケージの設定。`--access public` を付ける |
| `EPUBLISHCONFLICT` | 同じバージョンが既に publish 済。version を bump |
| `E413 Payload Too Large` | Tarball が大きすぎる。`.npmignore` / `files` 見直し |
| `Cannot find module 'xxx-<hash>'` (standalone serve で) | Turbopack が native module を external chunk 化。`apps/web/next.config.ts` の `serverExternalPackages` に該当 package を追加 |
| `Cannot find module 'next'` (standalone serve で) | `bundle-web-standalone.mjs` の `.pnpm` flatten 処理が動いているか確認。top-level `web-standalone/node_modules/next/` が必要 |
| publish 後に致命バグ | 72 時間以内: `npm unpublish @kojihq/lens@X.Y.Z` <br> 以降: `npm deprecate @kojihq/lens@X.Y.Z "reason"` + 新 beta 公開 + `npm dist-tag add @kojihq/lens@<new> latest` |

## CI での自動 publish（将来）
Day 46+ で Automation Token を発行し、GitHub Actions の `release` workflow に組み込む。当面は手動で。

## チェックリスト

- [ ] `git status` クリーン、`git pull` 済み
- [ ] version bump 後に `pnpm install` で lockfile 同期、commit 済み
- [ ] `pnpm -r typecheck` 全 pass
- [ ] `pnpm test` 全 pass
- [ ] クリーンビルド（`rm -rf apps/web/.next apps/cli/{dist,web-standalone} packages/core/dist` してから `pnpm -r build`）
- [ ] `pnpm pack` でサイズ / files 確認
- [ ] tarball の package.json で `"@kojihq/core": "^X.Y.Z"`（`workspace:` が残っていない）
- [ ] tarball の `server.js` で `"outputFileTracingRoot":"./"`（開発機の絶対パスが残っていない）
- [ ] tarball に `web-standalone/node_modules/next/package.json` が **top-level** にある（`.pnpm/` 配下のみは NG）
- [ ] **Local tarball で smoke test 実施**（Smoke test 原則の B 項参照）。特に `serve` は HTTP 200 応答を curl で確認
- [ ] `@kojihq/core` を `pnpm publish --tag beta --access public --no-git-checks`
- [ ] `@kojihq/lens` を `pnpm publish --tag beta --access public --no-git-checks`
- [ ] 別環境で `pnpm add @kojihq/lens@beta` が成功し、**registry 経由でも serve が HTTP 200** を返すことを確認
- [ ] 初回 publish で `latest` が β を指した場合、1.0 到達までは放置 OK。β 内で致命バグ fix 時は旧版を `npm deprecate` して新版に `npm dist-tag add ... latest`
- [ ] 公開を瀬尾 CEO に報告 → `company/assets.md` 更新 → ジャーナルに追記
