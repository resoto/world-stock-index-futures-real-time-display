# Cloudflare Pages ビルドコマンドの変更方法

現在、Cloudflare Pagesのビルドコマンドが`npx wrangler versions upload`になっているため、エラーが発生しています。

## 解決方法

### 方法1: Cloudflare Pagesダッシュボードでビルドコマンドを変更

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 「Workers & Pages」を選択
3. プロジェクトを選択
4. 「設定」→「ビルドとデプロイ」を開く
5. 「ビルドコマンド」を以下に変更：
   ```
   npx wrangler deploy
   ```
6. 「保存」をクリック
7. 再デプロイを実行

### 方法2: 直接Cloudflare Workersにデプロイ（推奨）

Cloudflare Pagesではなく、直接Cloudflare Workersにデプロイする方が簡単です：

```bash
# ローカルで実行
npm install -g wrangler
wrangler login
wrangler deploy
```

これで、静的ファイルとWorkerが一緒にデプロイされます。

### 方法3: GitHub Actionsを使用（自動デプロイ）

`.github/workflows/deploy.yml`ファイルを使用して、GitHubにプッシュするたびに自動デプロイできます。

1. Cloudflare API Tokenを取得：
   - Cloudflare Dashboard → 「My Profile」→ 「API Tokens」
   - 「Create Token」→ 「Edit Cloudflare Workers」テンプレートを使用
   - 権限を設定してトークンを生成

2. GitHubリポジトリのSecretsに追加：
   - リポジトリ → 「Settings」→ 「Secrets and variables」→ 「Actions」
   - 以下のSecretsを追加：
     - `CLOUDFLARE_API_TOKEN`: 作成したAPIトークン
     - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Dashboardの「Workers & Pages」から取得

3. `.github/workflows/deploy.yml`ファイルを有効化（必要に応じて）

## 現在のエラーについて

エラーメッセージ：
```
Workers Sites does not support uploading versions through `wrangler versions upload`. You must use `wrangler deploy` instead.
```

これは、Cloudflare Pagesのデフォルトのビルドコマンドが`wrangler versions upload`になっているためです。これを`wrangler deploy`に変更する必要があります。

