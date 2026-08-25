# 年輪ラインアート / TAIGA ASSOCIATES

ウェブサイトのブロック内で使う、パラメーター駆動のジェネラティブ線画アート。
WebGL1 のみで動作し、外部ライブラリ依存はありません。

## ファイル構成

| ファイル | 役割 | 誰が使うか |
|---|---|---|
| `nenrin-runtime.js` | 描画エンジン本体。設定を渡すと描画し、設定間の遷移も行う | 実装者（本番に配置） |
| `nenrin-lineart-tester.html` | アートを作り込むオーサリングツール。設定の書き出しもここから | デザイナー |
| `nenrin-embed-demo.html` | 組み込み例・遷移の動作確認 | 両方 |

テスターは `nenrin-runtime.js` を読み込んで動くので、**プレビューで見たものが本番で動くものと同一**です。同じフォルダに両方を置いてください。

## 実装者向け：使い方

```html
<div class="art-block" style="position:relative;width:100%;height:100vh">
  <canvas id="art" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
</div>

<script src="nenrin-runtime.js"></script>
<script src="my-arts.js"></script>   <!-- テスターから書き出した設定 -->
<script>
  var art = NenrinArt.create(document.getElementById('art'), artA);

  // 別のアートへシームレスに繋ぐ
  art.transitionTo(artB, { duration: 1400, easing: 'easeInOutCubic' });
</script>
```

canvas は CSS で好きなサイズにしてください。解像度・DPR・リサイズはランタイムが自動追従します。

## アート間の遷移

`transitionTo()` は2つの方式を**自動で使い分け**ます。

- **morph** — 2つの設定で構造パラメータが一致する場合。形状そのものが連続変形します。
- **crossfade** — 構造が異なる場合。両方を同時描画して不透明度で入れ替えます。

どちらの場合も**カメラ（角度・パース・スケール）と色は常に数値補間**されるため、視点が飛ぶことはありません。

事前判定もできます:

```js
NenrinArt.canMorph(artA, artB);   // true なら morph になる
var mode = art.transitionTo(artB, { duration: 1400 });  // 'morph' | 'crossfade'
```

### 構造パラメータ（これが一致すると morph になる）

```
ringCount, segments, baseRadius, spacing,
spacingVarAmt, spacingVarFreq, eccentricity, eccentricityAngle,
spiralBlend, seed
```

これらは頂点バッファに焼き込まれるため補間できません。逆に言えば、**この10項目を揃えたままデザインしたアート同士は、形が溶けるように繋がります**（`NenrinArt.STRUCTURAL_KEYS` で取得可）。

それ以外の42項目（色・線幅・不透明度・揺らぎ・変形・3D回転・形状ターゲット・波紋など）はすべてシェーダーのユニフォームなので自由に補間されます（`NenrinArt.LAYER_NUM_KEYS`）。

> 形状ターゲット（`shapeMode`）だけが違う場合は、いったん年輪の形に戻ってから新しい形状へ折り畳まれます。中間で不正な形が現れることはありません。

## API

```js
var art = NenrinArt.create(canvasEl, config, { onStats: fn });

art.transitionTo(config, {
  duration: 1200,              // ms
  easing: 'easeInOutCubic',    // linear | easeOutCubic | easeInOutQuad | easeInOutCubic | 関数
  onComplete: fn
});                            // -> 'morph' | 'crossfade'

art.setConfig(config);         // 即時切り替え（アニメーションなし）
art.getConfig();               // 現在の設定を複製して取得
art.cancelTransition();
art.isTransitioning();
art.renderNow();               // canvas.toDataURL() の直前に呼ぶ
art.destroy();                 // rAF停止・リスナ解除・GPUバッファ解放
```

`art.state` は生きた設定オブジェクトです。直接書き換えれば次のフレームに反映されます（スクロール連動などに）。ただし構造パラメータを変えた場合は `art.regenAll()` が必要です。

## デザイナー向け：シーンを作って書き出す

テスターの **SCENES** パネルで、複数のアートを保存して切り替え・モーフの確認ができます。

1. `nenrin-lineart-tester.html` をブラウザで開く
2. プリセットやパラメーターで好きな絵を作る
3. シーン名を入れて「＋ 現在を保存」
4. 2〜3 と繰り返して複数シーンを登録
5. シーン名のボタンを押すと、そのシーンへ実際に遷移します

保存したシーンはブラウザに残るので、閉じても消えません。

### 各行の見方

| 表示 | 意味 |
|---|---|
| **M** バッジ | 現在の絵からそのシーンへ **モーフ**で繋がる |
| **×** バッジ | 構造が違うため **クロスフェード**になる |
| **⇄** | そのシーンに構造を揃える（色や形状はそのままにモーフ化） |
| **⟳** | 現在の絵でそのシーンを上書き |
| **×**（右端） | 削除 |

「遷移時間」「イージング」で見え方を調整でき、「▶ 順に再生」で全シーンを自動で巡回します。デモとして見せる場合はこれが使えます。

> **⇄ について**: 構造を揃えるとレイヤー数も相手に合わせるため、レイヤーが増減する場合があります。色・線幅・形状ターゲットなどの表現は保持されます。

### 書き出し

SETTINGS の「現在の設定を表示 / コピー」→「実装用コード」タブ。

- **シーンが保存されている場合** — 全シーンをまとめて書き出します。どのシーン同士がモーフ／クロスフェードになるかの一覧表もコメントで付きます。`NENRIN_SCENES` オブジェクト経由で参照できます。
- **シーンが無い場合** — 画面に出ている絵だけを、指定した名前で書き出します。

書き出したコードを `nenrin-runtime.js` と一緒に実装者へ渡してください。

**繋ぎたいアート同士は構造パラメータ10項目を揃えておく**と morph になります（⇄ ボタンで揃えられます）。揃っていなくてもクロスフェードで繋がるので、まずは自由に作って構いません。
