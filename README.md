# DDDA Stat Tuner

Dragon's Dogma: Dark Arisen の育成経路を組み立て、ステータスを確認するブラウザーアプリです。バックエンドを使わない静的 SPA として開発しています。

現在は画面遷移と開発環境の土台まで実装しています。計算・編集・共有機能は [Phase 1 リメイク計画](docs/phase1-remake-plan.md) に沿って追加します。

## 必要な環境

- Node.js 24.21.0（`.tool-versions` に固定）
- npm 11

## 開発

```sh
npm ci
npm run dev
```

Vite が表示する URL を開いてください。画面の経路にはハッシュ形式（`#/chart` など）を使用します。

## 確認コマンド

```sh
npm run check       # 型検査、lint、整形検査、単体テスト、ビルド
npm run test:e2e    # ブラウザーテスト
```

ブラウザーテストの初回実行前に `npx playwright install chromium` で Chromium を用意してください。

## 静的ファイルの生成

```sh
npm run build
npm run preview
```

生成物は `dist/` です。公開先がサブパスの場合は、ビルド時に末尾の `/` を含む `APP_BASE_PATH` を設定します。例: `APP_BASE_PATH=/stat-tuner/ npm run build`。公開先では、そのパスで `index.html` とアセットを配信してください。

共有 URL の復元機能は後続 PR で実装します。公開先の変更時には既存の共有 URL の到達先も確認します。
