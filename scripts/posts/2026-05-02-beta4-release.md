# GitHub Release v0.1.0-beta.4 — release notes draft

> 2026-05-02 GW セッションでの机上起案。オーナーは npm publish 完遂後に GitHub Releases > Draft a new release で本ファイル内容をペースト。

---

## Title

```
v0.1.0-beta.4 — statusline (3-axis at-a-glance signal) + compare command
```

## Tag

```
v0.1.0-beta.4
```

## Target

```
main
```

## Release notes body

```markdown
β 期間の機能拡張リリース。Claude Code statusLine 統合と、節約効果ダッシュの基盤コマンド `compare` を追加しました。

## 🆕 New: `koji-lens statusline`

Claude Code の [`statusLine` 設定](https://docs.claude.com/en/docs/claude-code/settings#status-line) と統合する、1 行の signal 出力コマンド。Claude Code 画面の常時表示エリアに「節約できているか」「効率よく使えているか」「いま動いているか」を at-a-glance で出します。

3 つの独立 signal 軸:

| 軸 | アイコン | 意味 |
|---|---|---|
| **Spend trend** | 💚 / 💛 / 🚨 / ⚪ | 今月の支出 vs 先月（>10% 削減 / ±10% / >10% 増加 / データ不足）|
| **Cache efficiency** | 💎 / 🧊 / 💧 | prompt cache hit rate（≥70% / 30-70% / <30%）— **koji-lens 独自軸** |
| **Agent state** | ⚡ / 💤 / 🛑 | 動作中 / 待機中 / 承認待ち（hooks 設定で有効化）|

3 段階の表示密度:

```bash
koji-lens statusline                    # ⚡ 💚 -40% 💎 78%               (default = normal)
koji-lens statusline --mode minimal     # ⚡ 💚 💎                         (icons only)
koji-lens statusline --mode detailed    # ⚡ 💚 -40% vs last month | $40 saved | 💎 78% cache
```

### Setup (`~/.claude/settings.json`)

```json
{
  "statusLine": {
    "type": "command",
    "command": "koji-lens statusline",
    "padding": 0,
    "refreshInterval": 1
  }
}
```

agent state icon を有効化する hooks 設定例は [README — agent state icon](https://github.com/etoryoki/koji-lens#optional-agent-state-icon---) を参照（PowerShell helper script `set-state.ps1` 同梱）。

### ccusage との関係

ccusage は「いくら使っているか」の raw な数値を、koji-lens は「その傾向は健全か」の signal を出します。並行運用前提で設計済（`statusline` は `--mode minimal` で隣接時のフットプリント最小化）。cache hit rate 軸は ccusage が未対応の koji-lens 独自シグナルです。

## 🆕 New: `koji-lens compare`

任意の 2 期間を比較し、コスト・モデル mix・ツール per-session 利用率の差分を出力。Sonnet 移行や運用変更の効果測定に。

```bash
koji-lens compare --before 2026-04-01..2026-04-15 --after 2026-04-16..2026-04-30
```

ルールベースの Insights（Opus → Sonnet 移行検出 / 年換算節約額予測 / daily average 急減検出 / tool 利用率変化）も同時表示。

## 🌐 LP / Web

- LP 英語版公開: https://lens.kojihq.com/en
- LP Hero に live `summary` example 統合
- Web ダッシュ UX 大幅改善（subagent 親集計 / プロジェクトフィルタ / 期間切替 / 折れ線+モデル別 area / EN/JA i18n）

## 💰 価格確定

- Pro Monthly: **$7/month**（旧 $8）
- Pro Annual: **$70/year**（旧 $80）

## 📚 Changelog

詳細は [CHANGELOG.md](https://github.com/etoryoki/koji-lens/blob/main/CHANGELOG.md#010-beta4--2026-05-02) を参照してください。

## Install

```bash
npm install -g @kojihq/lens@beta
```

## Discussion

- フィードバック / 機能要望: https://github.com/etoryoki/koji-lens/discussions/9
- バグ報告: https://github.com/etoryoki/koji-lens/issues

## Follow

- X: [@kojihq_jp](https://x.com/kojihq_jp)
- Bluesky: [@kojihq.com](https://bsky.app/profile/kojihq.com)
```

---

## チェックリスト（オーナー実行）

- [ ] npm publish 3 件完了
- [ ] `npm view @kojihq/lens@beta version` で `0.1.0-beta.4` 確認
- [ ] GitHub Releases > Draft a new release
- [ ] Tag: `v0.1.0-beta.4` を選択（または新規作成）
- [ ] Title / Body を本ファイルから貼り付け
- [ ] Target: `main`
- [ ] Set as a pre-release ✅（β リリースなので）
- [ ] Publish release
- [ ] Release URL を CEO に共有 → SNS 告知文案に組み込み
