# Cloudflare Workers デプロイ手順

このアプリケーションをCloudflare Workersにデプロイする手順です。

## 前提条件

1. Cloudflareアカウントを持っていること
2. Node.js (v18以上) がインストールされていること
3. npm または yarn がインストールされていること

## セットアップ

### 1. Wrangler CLIをインストール

```bash
npm install -g wrangler
# または
npm install wrangler --save-dev
```

### 2. Cloudflareにログイン

```bash
wrangler login
```

ブラウザが開き、Cloudflareアカウントでログインします。

### 3. 依存関係をインストール

```bash
npm install
```

## デプロイ

### 開発環境でテスト

```bash
npm run dev:worker
```

または

```bash
wrangler dev
```

これで `http://localhost:8787` でローカル開発サーバーが起動します。

### 本番環境にデプロイ

```bash
npm run deploy
```

または

```bash
wrangler publish
```

## 設定のカスタマイズ

`wrangler.toml` ファイルで設定を変更できます：

- `name`: Worker名を変更
- `compatibility_date`: 互換性日付を変更
- `[site]`: 静的ファイルのディレクトリを変更

## 注意事項

1. **Workers Assets**: 静的ファイル（HTML、CSS、JS）は `public` ディレクトリから自動的に配信されます
2. **APIエンドポイント**: 
   - `/api/futures` - REST API（一度だけデータ取得）
   - `/api/futures/stream` - Server-Sent Events（リアルタイム更新）
3. **CORS**: すべてのエンドポイントでCORSが有効になっています
4. **制限**: Cloudflare Workersの無料プランでは、1日あたり100,000リクエストまで

## トラブルシューティング

### デプロイエラーが発生する場合

1. `wrangler.toml` の設定を確認
2. Cloudflareアカウントの制限を確認
3. ログを確認: `wrangler tail`

### 静的ファイルが表示されない場合

1. `wrangler.toml` の `[site]` セクションを確認
2. `public` ディレクトリにファイルが存在することを確認

### SSE接続が失敗する場合

1. ブラウザのコンソールでエラーを確認
2. Networkタブで `/api/futures/stream` のリクエストを確認
3. CORS設定を確認

## ローカル開発（従来のNode.jsサーバー）

Cloudflare Workersではなく、従来のNode.jsサーバーで開発したい場合：

```bash
npm start
```

これで `http://localhost:3000` で起動します（Socket.ioを使用）。

