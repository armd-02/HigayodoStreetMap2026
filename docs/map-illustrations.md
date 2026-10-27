# 地図の装飾イラスト

`data/config-user.jsonc` の `mapIllustrations` で設定する。
8枚のイラストと`higayodo.png`のロゴを固定座標に配置する。通常は全画像を表示し、画面外の部分は地図でクリップする。
座標は `[経度, 緯度]`。掲載地点の少ない場所を初期候補として設定している。
実際の会場・投稿としては扱わず、検索・一覧・サムネイルには追加しない。

| 項目 | 意味 |
| --- | --- |
| `use` | 全体の表示切替。省略時は無効 |
| `autoHide` | 重なり・画面端・枚数での自動非表示。通常は`false`。省略時も無効 |
| `minZoom`, `maxZoom` | 表示ズーム。`minZoom` 以上、`maxZoom` 未満 |
| `referenceZoom` | 画像の大きさを決める基準ズーム。初期値15 |
| `widthPx`, `mobileWidthPx` | 基準ズーム・傾きなしでのPC・画面幅640px以下での幅。縦横比は画像から取得 |
| `maxVisible.desktop`, `maxVisible.mobile` | `autoHide: true`の場合の画面内の表示枚数の上限 |
| `avoidPaddingPx` | `autoHide: true`の場合のPOIのアイコン・名称、操作部品、画面端との余白 |
| `illustrationGapPx` | `autoHide: true`の場合のイラスト同士の最小間隔 |
| `items` | 個別イラストの設定配列 |

個別設定では `id`、`image`、`coordinates`、`priority` を指定する。
`priority` は小さい値から優先し、同じ値なら配列順。
個別に `use: false` を指定すると無効になる。
`coordinates` が未設定・不正な画像は表示しない。
`widthPx`、`mobileWidthPx`、`referenceZoom`、`minZoom`、`maxZoom` は個別にも上書きできる。

通常は、重なり・画面端・枚数によって画像全体を隠すことはしない。
初期設定のズーム範囲は0以上24未満で、地図の操作可能範囲全体を含む。
`autoHide: true`を明示した場合のみ、地図の移動・POI更新・操作部品の変更時に
画面上の重なりを判定し、優先度順で表示する画像を選ぶ。
画像の四隅を緯度経度で固定したMapLibreの画像ソースとして描画する。
地図と一緒に回転・傾斜・拡大縮小し、ズームが1増えると地図上の幅は約2倍になる。
操作を遮らず、読み上げ対象にも含めない。背景地図の切替時は画像レイヤーを復元する。

確認: `node tests/map-illustrations.cjs`
