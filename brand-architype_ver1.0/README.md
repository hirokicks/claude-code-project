# ブランドアーキタイプ ワークショップツール

Carl Gustav Jung の「元型」理論をもとに、企業・ブランドを12種類の人格になぞらえてブランドの本質とアイデンティティを発見するワークショップツールです。

## 使い方（ブラウザから）

**▶ [ツールを開く](https://hirokicks.github.io/claude-code-project/brand-architype_ver1.0/)**

ブラウザで開いたら：
1. 「ワークショップを開始する」をクリック
2. 4ステップの質問に回答（所要時間：約15〜30分）
3. APIキーを入力して診断スタート
4. 結果・レポートを確認・印刷

---

## APIキーについて

本ツールは **Google Gemini** または **Anthropic Claude** のAPIキーに対応しています。
入力したキーのプレフィックスで自動判別されます。

| プロバイダー | キーの形式 | 取得先 | 費用 |
|---|---|---|---|
| **Google Gemini**（推奨） | `AIza...` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | 無料・カード不要 |
| **Anthropic Claude** | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com) | 要クレジット登録 |

> APIキーはブラウザのセッション中のみ使用され、外部への送信・保存は一切行いません。

---

## 12のアーキタイプ

| 動機軸 | アーキタイプ |
|---|---|
| 安定 / 制御 | 創造者・援助者・統治者 |
| 帰属 / 楽しみ | 道化師・一般大衆・恋人 |
| 支配 / リスク | 英雄・無法者・魔術師 |
| 自立 / 自己実現 | 幼子・探検家・賢者 |

---

## ローカルで使う場合

`index.html` を単体でダウンロードしてブラウザで開くだけで動作します。インストール不要・インターネット接続はAPIキー使用時のみ必要です。

---

## GitHub Pages の設定方法

1. リポジトリの **Settings** → **Pages** を開く
2. **Source** を `Deploy from a branch` に設定
3. **Branch** を `main` / `/(root)` に設定して **Save**
4. 数分後に `https://ユーザー名.github.io/リポジトリ名/brand-architype_ver1.0/` で公開されます

---

## 注意事項

- 診断結果はAIによる提案であり、最終的なブランド判断はデザイナー・クライアントが行ってください
- APIの利用料金は各プロバイダーの規約に従います（Gemini無料枠：1,500リクエスト/日）
