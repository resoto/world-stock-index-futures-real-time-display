# Cloudflare Pages ビルド設定

Cloudflare Pagesでこのプロジェクトをデプロイする場合、以下の設定を使用してください：

## ビルド設定

- **フレームワークプリセット**: なし（または「その他」）
- **ビルドコマンド**: `npx wrangler deploy`
- **ビルド出力ディレクトリ**: （空欄、または`public`）
- **ルートディレクトリ**: `/`（プロジェクトルート）

## 環境変数

通常、環境変数は不要です。ただし、カスタムドメインやその他の設定が必要な場合は、Cloudflareダッシュボードで設定してください。

## 注意事項

1. Cloudflare PagesでWorkersをデプロイする場合、`wrangler deploy`コマンドを使用します
2. `wrangler versions upload`はWorkers Sitesでは使用できません
3. ビルドコマンドを`npx wrangler deploy`に設定してください

## 代替方法

Cloudflare Pagesの代わりに、直接Cloudflare Workersにデプロイすることもできます：

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

