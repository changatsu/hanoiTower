# ハノイの塔

ブラウザで遊べるハノイの塔パズルです。React + Vite で作られた静的サイトで、データベースやサーバーは使いません。

**遊ぶ:** https://changatsu.github.io/hanoiTower/

## ルール

左の柱（A）に積まれた円盤をすべて右の柱（C）へ移すとクリアです。

- 一度に動かせるのは一番上の円盤 1 枚だけです。
- 小さい円盤の上に大きい円盤は置けません。
- 円盤が n 枚のとき、最少手数は 2ⁿ − 1 手です。

## 遊び方

- 柱をタップ（クリック）して一番上の円盤を持ち上げ、置きたい柱をタップします。
- 円盤をドラッグして別の柱に落としても動かせます。
- キーボードでは Tab で柱を選び、Enter / Space で持ち上げと配置ができます。
- 円盤は 3〜10 枚から選べます。
- 「1手戻す」「最初から」「お手本を見る」（最短手順の自動再生）ボタンがあります。
- 円盤の枚数ごとの自己ベストはブラウザの localStorage に保存されます。

## 開発

Node.js 22 以降を想定しています。

```sh
npm install
npm run dev      # 開発サーバー
npm test         # ゲームロジックのテスト（node:test）
npm run build    # dist/ に静的ファイルを出力
```

## 構成

| ファイル | 内容 |
| --- | --- |
| `src/hanoi.js` | ゲームロジック（移動判定、クリア判定、最短手順）。UI に依存しない純粋関数 |
| `src/App.jsx` | 画面全体と状態管理（手数、履歴、お手本再生、自己ベスト） |
| `src/Board.jsx` | 盤面の描画とタップ／ドラッグ操作 |
| `src/styles.css` | スタイル（ライト／ダーク対応） |
| `test/hanoi.test.js` | ロジックのテスト |

## 公開

`main` ブランチに push すると GitHub Actions（`.github/workflows/deploy.yml`）がテストとビルドを行い、GitHub Pages に公開します。初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にしてください。
