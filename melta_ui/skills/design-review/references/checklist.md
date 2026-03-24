# デザインレビュー チェックリスト

> SKILL.md Step 3 の詳細。カテゴリ順にHTMLを走査し、違反を検出する。

---

## 3-1. カラー

- `text-black` → `text-slate-900`
- `text-gray-400` を本文・ラベルに使用 → `text-body` または `text-slate-500`
- `bg-green-*` → `bg-emerald-*`
- `bg-yellow-*` → `bg-amber-*`
- `bg-rose-*` → `bg-red-*`
- `text-blue-*` for links → `text-primary-500`
- `bg-primary-400` → `bg-primary-500`
- `bg-gray-300` 以上の暗い背景 → `bg-gray-50` 〜 `bg-gray-200`
- サイドバーに暗い背景色（`bg-slate-800` 等）→ `bg-white` + ボーダー

## 3-2. スペーシング・レイアウト

- `rounded-none` on cards → `rounded-xl`
- `shadow-lg` / `shadow-2xl`（hover含む）→ `shadow-sm` 〜 `shadow-md`
- `p-0` 〜 `p-4` on cards（p-5未満）→ `p-5` 以上
- `py-0.5` on buttons → `py-1.5` 以上
- `gap-0` between sections → `gap-6` 以上
- サイドバー幅 `w-60` 等の非標準値 → `w-64` or `w-16`
- ナビアイテムの `rounded-xl` → `rounded-lg`
- ナビアイコン `w-6 h-6` 以上 → `w-5 h-5`（サイドバー内のアイコンも含む。SVG要素の `class` 属性を確認すること）

## 3-3. タイポグラフィ

- `tracking-tight` → `tracking-normal` 以上
- `text-xs` for body text → `text-base`（ただし `text-xs` はバッジ・メタ情報・補助ラベル・カードラベルの正規サイズ。違反として報告するのは本文段落 `<p>` または主要見出し `<h1>`〜`<h4>` に使用されている場合のみ）
- `font-light`（300）→ `font-normal`（400）以上

## 3-4. モーション

- `duration-500` 以上 → `duration-300` 以下

## 3-5. ボーダー

- `border-gray-100` → `border-slate-200`

## 3-6. フォーム

- `<select>` に `appearance-none` なし → `appearance-none` + `pr-10` + カスタムSVGシェブロン（`<div class="relative">` で囲む）
- `<label>` なしの入力欄（プレースホルダーのみ）→ `<label>` を `for` で関連付け。検索欄等で視覚的に非表示にする場合は `sr-only` クラスまたは `aria-label` を使用
- チェックボックス・ラジオのグループに `<fieldset>` / `<legend>` なし → 必ず使用
- `focus:outline-none` で ring なし → `focus:ring-2 focus:ring-primary-500/50`
- `<fieldset>` がカード（`border` + `rounded-xl` 等）の直下にある場合 → `<legend>` のブラウザデフォルト描画がカードのボーダーと干渉し、視覚的に破綻する。カードレベルのセクション見出しには `<div>` + `<h2>` を使用する（`<fieldset>` / `<legend>` はカード内部のフォームコントロールグループに限定）
- 日付セレクト（年月日）が均等幅（`grid-cols-3` 等）→ 年は `w-28`、月・日は `w-20` で `flex` レイアウトに。年/月/日のサフィックスラベル付与を推奨

## 3-7. アクセシビリティ

- `<nav>` に `aria-label` なし → **navの数にかかわらず必ず付与する**（1つしかない場合でも `aria-label="メインナビゲーション"` 等を付与。将来的にnavが増えた場合の後方互換性を確保するため）
- Active ナビアイテムに `aria-current="page"` なし → 必ず付与
- `<th>` に `scope` なし → `scope="col"` or `scope="row"` を付与
- アイコンボタンに `aria-label` なし → 操作内容を `aria-label` で明示
- Drawer にフォーカストラップなし → Tab/Shift+Tab が Drawer 内を循環
