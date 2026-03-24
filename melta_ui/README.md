# melta UI

**人間にも、AIにも、読めるデザインシステム。**

---

デザインシステムは、人間のためだけのものだった。
スタイルガイドを読み、コンポーネントの意図を汲み取り、文脈に合わせて判断する——それはデザイナーとエンジニアの仕事だった。

しかし今、UIを書くのは人間だけではない。

AIがコードを生成し、コンポーネントを選び、レイアウトを組む時代に、
デザインシステムは **「人間が読める」だけでは足りない。**

melta UI は、この問いに対する一つの答えである。

Markdown ドキュメントは人間が読み、JSON トークンは機械が読む。
`CLAUDE.md` を起点とした段階的な読み込み構造は、AI の限られたコンテキストウィンドウに最適化されている。
MCP サーバーを介せば、AI エージェントはトークンの検索からルール検証まで、プログラマティックに実行できる。

**人間の可読性を犠牲にせず、AIの可読性を加える。** 両立こそが、melta UI の設計思想である。

---

## Architecture — 2つの読み手のための構造

```
                    ┌─────────────────────────────┐
                    │         melta UI             │
                    └──────────────┬──────────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                  │
          ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼───────┐
          │  for Human  │  │  for Both   │  │    for AI     │
          └──────┬──────┘  └──────┬──────┘  └───────┬───────┘
                 │                │                  │
        foundations/*.md    CLAUDE.md          tokens.json
        components/*.md    design_philosophy   components.json
        patterns/*.md      index.html          MCP Server
        prohibited.md      Melta-UI.pen        .cursor/rules/
```

| レイヤー | 形式 | 読み手 | 役割 |
|---------|------|--------|------|
| **Markdown ドキュメント** | `.md` 48ファイル | 人間 | 設計意図・使い方・判断基準を自然言語で記述 |
| **CLAUDE.md** | `.md` 1ファイル | 人間 + AI | エントリーポイント。クイックリファレンスとタスク別読み込みガイド |
| **デザイントークン** | `tokens.json` | AI | ~106トークンの機械可読な単一ソース（色・間隔・書体・影・角丸・動き） |
| **コンポーネントメタデータ** | `components.json` | AI | 28コンポーネントのバリアント・サイズ・HTML サンプル・禁止パターン |
| **MCP サーバー** | TypeScript | AI エージェント | トークン検索・コンポーネント取得・ルール検証・全文検索をツールとして公開 |
| **Claude Code スキル** | `skills/` | AI (Claude Code) | デザインレビューの自動実行（クローン後すぐ使用可能） |
| **Cursor ルール** | `.mdc` 3ファイル | AI (Cursor) | カラー・コンポーネント・禁止パターンをエディタ内ルールとして提供 |
| **Pencil デザインファイル** | `.pen` | 人間 + AI | 32コンポーネントをビジュアルデザインツール上で再利用可能な形で収録 |

---

## AI にとっての読みやすさとは何か

多くのデザインシステムは、人間向けの記述に最適化されてきた。
AI にとって、それは「読めるが、構造化されていない」情報だった。

melta UI は以下の設計で AI の可読性を確保している。

### 1. 段階的読み込み — コンテキストを浪費しない

AI のコンテキストウィンドウは有限である。全ファイルを一度に読む必要はない。

| モード | 読むファイル | 用途 |
|--------|------------|------|
| クイック | `CLAUDE.md` のみ | 単体UIの生成（ボタン、カード等） |
| 標準 | + `foundations/theme.md` + 関連コンポーネント md | ページ単位の生成 |
| MCP | MCP ツール（`get_token` / `get_component`） | AI ツール統合 |
| フル | 全ファイル | 新規プロジェクト構築・DS変更 |

`CLAUDE.md` だけで基本的な UI は生成できる。必要に応じて深く読む——人間のドキュメント閲覧と同じ体験を AI に提供している。

### 2. 機械可読データ — 解釈ではなく参照

```jsonc
// tokens.json — AI はこの JSON を直接参照する
{
  "color": {
    "primary": {
      "500": { "value": "#2b70ef", "tailwind": "primary-500" }
    }
  }
}
```

```jsonc
// components.json — コンポーネントの仕様を構造化データで宣言
{
  "id": "button",
  "variants": [{ "name": "contained", "tailwind": "inline-flex items-center ..." }],
  "sizes": [{ "name": "medium", "tailwind": "h-10 px-4 text-[1rem]", "height": "40px" }],
  "prohibited": ["py-0.5 (minimum h-8)", "アイコンボタンのaria-label省略"],
  "htmlSample": "<button class=\"inline-flex items-center ...\">"
}
```

Markdown から意図を読み取るのではなく、JSON から値を引く。曖昧さのない参照を可能にしている。

### 3. MCP サーバー — 対話的なアクセス

```
Human: 「ユーザー一覧テーブルを作って」

AI (内部):
  1. get_component("table")   → 仕様・HTMLサンプル取得
  2. get_component("pagination") → ページ送り仕様取得
  3. check_rule("text-black shadow-lg") → 禁止パターン検出
  4. → DS準拠の HTML を生成
```

AI エージェントは MCP ツールを通じて、必要な情報だけをオンデマンドで取得する。

### 4. セマンティックな命名 — 意図が名前に宿る

```html
<!-- AI が文脈を推論できる命名 -->
<div class="bg-surface-primary text-body border-default">

<!-- 推論できない命名 -->
<div class="bg-white text-gray-600 border-gray-200">
```

`surface-primary` は「主要な面」、`text-body` は「本文テキスト」——名前が意図を運ぶ。

---

## 人間にとっての読みやすさ

AI のために人間の体験を犠牲にはしない。

- **自然言語のドキュメント** — 48ファイルの Markdown が設計意図・判断基準・使い方を人間の言葉で記述
- **設計思想の明文化** — 「声を張らずに伝わるUI」という Core Belief から、7つの Design Principles まで
- **インタラクティブなショーケース** — `docs/index.html` で全コンポーネントを動かして確認
- **12のサンプルページ** — EC・SaaS・CMS・HR・物流・医療・行政・学習・金融・予約・ワイヤーフレームなど、幅広いドメインで DS の実用性を検証（`examples/`）
- **禁止パターン** — 76項目の「やってはいけないこと」を明示。迷いを減らす

---

## Quick Start

### Claude Code

1. このリポジトリをプロジェクトルートに配置する
2. Claude Code が `CLAUDE.md` を自動で読み込む
3. UI を指示するだけで DS 準拠のコードが生成される

```
「ユーザー一覧のテーブルを作って」
→ table.md + pagination.md + badge.md を参照し、DS準拠のHTMLを生成
```

#### 同梱スキル — `/design-review`

リポジトリに同梱されたスキルはクローン後すぐに使える（追加設定不要）。

```
/design-review examples/ec-home.html
→ DS準拠チェック → 違反検出・重大度分類 → 修正提案を出力
```

#### 初回セットアップ — `/teach-impeccable`

フォークしたら、まず `/teach-impeccable` を実行してプロジェクトのデザインコンテキストを設定する。

```
/teach-impeccable
```

このコマンドは以下を行う:
1. コードベースを自動調査（トークン・コンポーネント・設計哲学を収集）
2. 対話形式でユーザー層・ブランド・美的方向性をヒアリング
3. `CLAUDE.md` に **Design Context** セクションを永続化

一度実行すれば、以降のすべてのセッションで AI が同じデザイン原則に従って UI を生成する。

> **前提**: [impeccable](https://github.com/pbakaus/impeccable) スキルのインストールが必要。
> ```bash
> claude skills add pbakaus/impeccable
> ```

#### デザイン品質スキル

impeccable には `/teach-impeccable` 以外にも、UI の品質を高めるスキルが含まれている:

| スキル | 用途 |
|--------|------|
| `/critique` | UX観点のデザイン評価 |
| `/polish` | 出荷前の最終品質チェック |
| `/audit` | アクセシビリティ・パフォーマンスの総合監査 |
| `/distill` | 不要な複雑さの除去 |
| `/harden` | エラーハンドリング・i18n・エッジケース強化 |
| `/animate` | 目的のあるアニメーション追加 |
| `/clarify` | UXコピー・ラベル・エラーメッセージの改善 |
| `/bolder` / `/quieter` | ビジュアルの強弱調整 |
| `/colorize` | 戦略的な配色追加 |
| `/adapt` | レスポンシブ・マルチデバイス対応 |
| `/normalize` | デザインシステムへの正規化 |
| `/extract` | 再利用可能コンポーネントの抽出 |
| `/ban-pattern` | AIっぽいUIパターンを禁止ルールに登録 |

### MCP サーバー（Claude Code / Cursor）

```bash
npm install && npm run build
claude mcp add melta-ui node ./dist/index.js
```

| ツール | 説明 | 入力例 |
|--------|------|--------|
| `get_token` | トークン検索 | `{ "path": "color.primary.600" }` |
| `get_component` | コンポーネント仕様取得 | `{ "id": "button" }` |
| `check_rule` | 禁止パターンチェック | `{ "classes": "text-black shadow-2xl" }` |
| `search` | 全文検索 | `{ "query": "card" }` |

### Cursor

`.cursor/rules/` に 3 つのルールファイルを同梱:
- `melta-ui.mdc` — DS 全体ルール
- `color-system.mdc` — カラートークン一覧
- `components.mdc` — 28 コンポーネントの Tailwind クラス一覧

### Pencil

`docs/Melta-UI.pen` に全 32 コンポーネントを `reusable: true` で収録。

```
「Melta-UI.pen にダッシュボード画面を作って」
→ Card, Table, Badge, Avatar 等の ref を組み合わせて画面を自動構成
```

### 手動

1. Tailwind CSS 4 をプロジェクトに導入
2. `foundations/theme.md` の CSS 変数をプロジェクトに追加
3. 各コンポーネントの `.md` を参照してクラスを適用

---

## Design Principles

1. **Layered** — Background → Surface → Text/Object の3層でUIを構成する
2. **Contrast** — テキストは背景に対して WCAG 2.1 準拠（4.5:1 以上）
3. **Semantic** — 色は用途で指定する（`bg-surface-primary` ≠ 生の `bg-white`）
4. **Minimal** — 1つの View に使う色は3色まで（背景・アクセント・テキスト）
5. **Grid** — スペーシングは4の倍数を基本、8の倍数を推奨

> 詳細は `foundations/design_philosophy.md` を参照。

---

## Components

28 コンポーネント + 10 ファウンデーション + 5 パターン + 1 スキル。

| カテゴリ | コンポーネント |
|---------|--------------|
| **入力** | Button, TextField, Select, Checkbox, Radio, Toggle, Date Picker |
| **ナビゲーション** | Sidebar, Tabs, Breadcrumb, Pagination |
| **データ表示** | Card, Table, List, Badge, Tag, Avatar, Progress |
| **フィードバック** | Modal, Toast, Alert, Tooltip, Skeleton, Copy Button |
| **構造** | Accordion, Dropdown, Divider, Stepper |

---

## Directory

```
melta/
├── CLAUDE.md                 # AI 向けエントリーポイント
├── tokens/tokens.json        # デザイントークン SSOT（~106トークン）
├── metadata/components.json  # 28 コンポーネントメタデータ
├── src/                      # MCP サーバー（TypeScript）
├── foundations/              # 基盤定義（13ファイル）
│   ├── design_philosophy.md  #   設計思想
│   ├── theme.md              #   テーマ・CSS変数・ダークモード
│   ├── prohibited.md         #   禁止パターン（76項目）
│   └── color, typography, spacing, elevation, radius,
│       motion, z-index, icons, accessibility, emotional-feedback
├── components/               # コンポーネント仕様（28ファイル）
├── patterns/                 # パターン（5ファイル）
│   └── layout, form, navigation, interaction-states, responsive
├── docs/
│   ├── index.html            # 全コンポーネントショーケース
│   └── Melta-UI.pen          # Pencil デザインファイル（32コンポーネント）
├── skills/                  # Claude Code スキル
│   └── design-review/       #   DSレビュー自動化（クローン後すぐ使用可能）
├── examples/                 # 12のサンプルページ（EC・SaaS・CMS・行政・医療等）
├── assets/icons/             # Charcoal 207 + Lucide 15
├── scripts/                  # ランタイム CSS/JS
├── tools/                    # ビルドスクリプト
├── .mcp.json                 # Claude Code MCP 登録
└── .cursor/rules/            # Cursor 用ルール
```

---

## License

MIT License — [LICENSE](./LICENSE)

同梱アイコンのライセンスは [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md) を参照。

### Acknowledgments

- [Charcoal Icons](https://github.com/pixiv/charcoal)（pixiv Inc.）— Apache License 2.0
- [Lucide Icons](https://github.com/lucide-icons/lucide) — ISC License
- [Tailwind CSS](https://tailwindcss.com/)
