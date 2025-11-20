const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// 主要な株価指数先物のシンボル
const FUTURES_SYMBOLS = [
  { symbol: 'ES=F', name: 'S&P 500', region: 'US', exchange: 'CME' },
  { symbol: 'NQ=F', name: 'NASDAQ 100', region: 'US', exchange: 'CME' },
  { symbol: 'YM=F', name: 'Dow Jones', region: 'US', exchange: 'CBOT' },
  { symbol: '^N225', name: 'Nikkei 225', region: 'JP', exchange: 'OSE' },
  { symbol: '^GDAXI', name: 'DAX', region: 'DE', exchange: 'EUREX' },
  { symbol: '^FTSE', name: 'FTSE 100', region: 'UK', exchange: 'ICE' },
  { symbol: '^HSI', name: 'Hang Seng', region: 'HK', exchange: 'HKEX' },
  { symbol: '^AXJO', name: 'ASX 200', region: 'AU', exchange: 'ASX' },
  { symbol: '^FCHI', name: 'CAC 40', region: 'FR', exchange: 'EURONEXT' },
  { symbol: '^STI', name: 'STI', region: 'SG', exchange: 'SGX' },
];

// 株価データを取得する関数
async function fetchStockData(symbol) {
  try {
    // Yahoo Finance APIを使用（無料）
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = response.data.chart.result[0];
    const quote = data.meta;
    const previousClose = quote.previousClose;
    const currentPrice = quote.regularMarketPrice || quote.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    // 価格履歴データを取得（チャート用）
    const timestamps = data.timestamp || [];
    const prices = data.indicators.quote[0].close || [];
    const priceHistory = timestamps.slice(-20).map((ts, idx) => ({
      time: ts * 1000,
      price: prices[timestamps.length - 20 + idx] || currentPrice
    }));

    return {
      symbol: symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      previousClose: previousClose,
      timestamp: new Date().toISOString(),
      volume: quote.regularMarketVolume || 0,
      high: quote.regularMarketDayHigh || currentPrice,
      low: quote.regularMarketDayLow || currentPrice,
      open: quote.regularMarketOpen || previousClose,
      priceHistory: priceHistory
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    return null;
  }
}

// 全シンボルのデータを取得
async function fetchAllFuturesData() {
  const promises = FUTURES_SYMBOLS.map(async (future) => {
    const data = await fetchStockData(future.symbol);
    if (data) {
      return {
        ...data,
        name: future.name,
        region: future.region,
        exchange: future.exchange
      };
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter(item => item !== null);
}

// WebSocket接続処理
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 初回データ送信
  fetchAllFuturesData().then(data => {
    socket.emit('futures-data', data);
  });

  // 定期的にデータを更新（2秒ごと）
  const interval = setInterval(async () => {
    const data = await fetchAllFuturesData();
    socket.emit('futures-data', data);
  }, 2000);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(interval);
  });
});

// REST APIエンドポイント
app.get('/api/futures', async (req, res) => {
  try {
    const data = await fetchAllFuturesData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch futures data' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

