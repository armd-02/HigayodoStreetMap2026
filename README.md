# ひがよどストリートマップ2026

ひがよどストリートマップ2025の2026年版を準備するためのリポジトリです。
現在は東淀川区の背景地図のみを表示します。2026年の店舗・施設・イベントデータは未登録です。

公開先: https://armd-02.github.io/HigayodoStreetMap2026/

GitHub Pagesは `main` ブランチのルートディレクトリから配信します。

## 起動

静的サイトのため、ビルドは不要です。このディレクトリで次のコマンドを実行します。

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:8765/` を開いてください。
地図タイル・外部ライブラリの読み込みにはインターネット接続が必要です。

## コピー元

- 最新エンジン: [K-Sakanoshita/expo2025-maniacs](https://github.com/K-Sakanoshita/expo2025-maniacs)
  - コピーしたコミット: `ee80f49fc48183a5b3149f07fcc68fc47f70bcd2`
  - ソース一式をコピーし、`cmapmaker.js`、`lib/`、ローダーなどのプログラムはそのまま使用しています。
  - 元のREADMEは [docs/upstream-expo2025-README.md](docs/upstream-expo2025-README.md) に保存しています。
- 初期表示位置・表示範囲の参考: [armd-02/HigayodoStreetMap2025](https://github.com/armd-02/HigayodoStreetMap2025)
  - 参照コミット: `c3834568c9f82eedc187d19c3ac0ef98ee481904`

## 2026年版の設定

- `index.html`: サイト名、説明、共有用URL、起動画面。
- `data/config-user.jsonc`: 初期位置・表示範囲、読み込み元、メニュー。
- `data/config-system.jsonc`: 万博最終日の背景地図を切り替え候補から非表示。
- `data/glot-custom.jsonc`: サイトの日本語・英語表示。
- `data/higayodo2026.json`: 空のOSM JSON（`elements: []`）。
- `manifest.json`: コピー元のアクセス解析IDを無効化。
- `image/higayodo2026.svg`: 準備中の仮画像。

2025年版の店舗データ・Google Apps Scriptには接続していません。
コピー元の万博データ・公開データページ・画像等はコピーの一部として残していますが、
2026年版の起動時には万博データを読み込まず、メニューにも公開データページを載せていません。
2026年データの取得元が決まってから、読み込み設定とカテゴリ・詳細表示を調整してください。

## ライセンス

ソースコードはコピー元のMITライセンスを継承します（[LICENSE](LICENSE)）。
OpenStreetMapデータ・背景地図・写真・3Dモデル等には各提供元のライセンスが適用されます。
詳細はコピー元READMEおよび各アセットのライセンス表記を参照してください。
