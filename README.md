# 世界株価指数先物リアルタイム表示アプリ

世界中の主要な株価指数先物をリアルタイムで表示するWebアプリケーションです。

## 機能

- 🌍 世界中の主要な株価指数先物をリアルタイム表示
- 📊 価格、変動率、高値・安値などの詳細情報を表示
- 🔄 WebSocketを使用したリアルタイム更新（30秒間隔）
- 🎯 地域別フィルター機能（米国、日本、欧州、アジア）
- 📱 レスポンシブデザイン対応

## 表示される指数先物

- **米国**: S&P 500, NASDAQ 100, Dow Jones
- **日本**: Nikkei 225
- **欧州**: DAX, FTSE 100, CAC 40
- **アジア**: Hang Seng, ASX 200, STI

## セットアップ

### 必要な環境

- Node.js (v14以上)
- npm または yarn

### インストール手順

1. 依存関係をインストール:
```bash
npm install
```

2. サーバーを起動:
```bash
npm start
```

開発モード（自動リロード）で起動する場合:
```bash
npm run dev
```

3. ブラウザでアクセス:
```
http://localhost:3000
```

## 技術スタック

- **バックエンド**: Node.js + Express
- **リアルタイム通信**: Socket.io
- **フロントエンド**: HTML, CSS, JavaScript (Vanilla)
- **データソース**: Yahoo Finance API

## プロジェクト構造

```
kabu/
├── server.js          # ExpressサーバーとSocket.io設定
├── package.json       # 依存関係とスクリプト
├── public/            # フロントエンドファイル
│   ├── index.html     # メインHTML
│   ├── styles.css     # スタイルシート
│   └── app.js         # クライアント側JavaScript
└── README.md          # このファイル
```

## 使用方法

1. アプリを起動すると、自動的に最新の株価データが表示されます
2. 上部のフィルターボタンで地域別に表示を絞り込めます
3. データは30秒ごとに自動更新されます
4. 接続状態はヘッダーで確認できます

## 注意事項

- データはYahoo Finance APIから取得しています
- リアルタイム更新は30秒間隔で行われます
- 市場が閉まっている時間帯は、前日の終値が表示されます

## ライセンス

MIT

# world-stock-index-futures-real-time-display
