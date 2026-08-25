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

`transitionTo()` は3つの方式を使い分けます。

| 方式 | 条件 | 見え方 |
|---|---|---|
| **morph** | 構造パラメータが一致 | 形状そのものが連続変形 |
| **forced**（`force: true`） | 構造が異なる | ほぼ全編モーフ。終盤だけ短く実体を入れ替え |
| **crossfade** | 構造が異なり `force` なし | 両方を同時描画して不透明度で入れ替え |

どの場合も**カメラ（角度・パース・スケール）と色は常に数値補間**されるため、視点が飛ぶことはありません。

```js
NenrinArt.canMorph(artA, artB);   // true なら無条件に morph
var mode = art.transitionTo(artB, {
  duration: 1400,
  force: true          // 構造が違ってもモーフで繋ぐ
});                    // -> 'morph' | 'forced' | 'crossfade'
```

### 構造パラメータ（これが一致すると morph になる）

```
ringCount, segments, spiralBlend, spacingVarFreq, seed
```

この5項目だけが頂点バッファに焼き込まれます（`NenrinArt.STRUCTURAL_KEYS`）。`ringCount`／`segments` は頂点数そのもの、`spiralBlend` は同心円か連続螺旋かという構造、`seed`／`spacingVarFreq` はどのノイズを使うか、を決めるためです。

それ以外の**47項目はすべてシェーダーのユニフォーム**で自由に補間されます（`NenrinArt.LAYER_NUM_KEYS`）。基準半径・間隔・粗密量・偏心量・偏心角度も、半径と中心に線形に効くのでシェーダー側で解決しており、補間可能です。色・線幅・不透明度・揺らぎ・変形・3D回転・形状ターゲット・波紋なども同様です。

> 形状ターゲット（`shapeMode`）だけが違う場合は、いったん年輪の形に戻ってから新しい形状へ折り畳まれます。中間で不正な形が現れることはありません。

### 強制モーフ（`force: true`）

構造が違っていても、まず**現在のジオメトリのまま補間可能なパラメータをすべて目標値まで動かし**、最後の約18%で本物の目標へ短くクロスフェードして着地します。その時点では色・半径・間隔・偏心・形状まで一致しているので、入れ替わりはほとんど見えません。

レイヤー数が違う場合も、余るレイヤーは不透明度0へフェードアウトし、足りない分は不透明度0から生えてくるので、開始時に絵が飛ぶことはありません。

最終状態は目標の設定と完全に一致します。

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
| **M** バッジ | 構造が一致していて、そのまま **モーフ**で繋がる |
| **F** バッジ | 構造は違うが **強制モーフ**で繋ぐ（既定でON） |
| **×** バッジ | 強制モーフOFF かつ構造が違うため **クロスフェード**になる |
| **⇄** | そのシーンに構造を揃える（色や形状はそのままに M 化） |
| **⟳** | 現在の絵でそのシーンを上書き |
| **×**（右端） | 削除 |

「遷移時間」「イージング」で見え方を調整でき、「▶ 順に再生」で全シーンを自動で巡回します。デモとして見せる場合はこれが使えます。

**強制モーフ**のチェックを入れておけば、どのシーンの組み合わせでもモーフで繋がります。より完全なモーフにしたい場合だけ **⇄** で構造を揃えて **M** にしてください。

> **⇄ について**: 構造を揃えるとレイヤー数も相手に合わせるため、レイヤーが増減する場合があります。色・線幅・形状ターゲットなどの表現は保持されます。

### 書き出し

SETTINGS の「現在の設定を表示 / コピー」→「実装用コード」タブ。

- **シーンが保存されている場合** — 全シーンをまとめて書き出します。どのシーン同士がモーフ／クロスフェードになるかの一覧表もコメントで付きます。`NENRIN_SCENES` オブジェクト経由で参照できます。
- **シーンが無い場合** — 画面に出ている絵だけを、指定した名前で書き出します。

書き出したコードを `nenrin-runtime.js` と一緒に実装者へ渡してください。

**繋ぎたいアート同士は構造パラメータ10項目を揃えておく**と morph になります（⇄ ボタンで揃えられます）。揃っていなくてもクロスフェードで繋がるので、まずは自由に作って構いません。
