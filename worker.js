// Cloudflare Workers用のメインコード

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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const chartData = data.chart.result[0];
    const quote = chartData.meta;
    const previousClose = quote.previousClose;
    const currentPrice = quote.regularMarketPrice || quote.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    // 価格履歴データを取得（チャート用）
    const timestamps = chartData.timestamp || [];
    const prices = chartData.indicators.quote[0].close || [];
    const priceHistory = timestamps.slice(-20).map((ts, idx) => {
      const priceIdx = timestamps.length - 20 + idx;
      return {
        time: ts * 1000,
        price: prices[priceIdx] || currentPrice
      };
    });

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

// Server-Sent Events用のストリームを作成
function createSSEStream() {
  const encoder = new TextEncoder();
  let intervalId;
  let isActive = true;
  
  const stream = new ReadableStream({
    async start(controller) {
      // 初回データ送信
      try {
        const initialData = await fetchAllFuturesData();
        const message = `data: ${JSON.stringify(initialData)}\n\n`;
        controller.enqueue(encoder.encode(message));
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
      
      // 定期的にデータを更新（2秒ごと）
      const sendUpdate = async () => {
        if (!isActive) return;
        
        try {
          const data = await fetchAllFuturesData();
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error in SSE update:', error);
          // エラーが発生してもストリームを維持
        }
      };
      
      // 2秒ごとに更新を送信
      // WorkersではsetIntervalの代わりに、再帰的なsetTimeoutを使用
      const scheduleNext = () => {
        if (!isActive) return;
        setTimeout(async () => {
          if (isActive) {
            await sendUpdate();
            scheduleNext();
          }
        }, 2000);
      };
      
      scheduleNext();
    },
    
    cancel() {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  });
  
  return stream;
}

// メインのリクエストハンドラー
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORSヘッダー
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // OPTIONSリクエストの処理
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Server-Sent Eventsエンドポイント
    if (path === '/api/futures/stream') {
      const stream = createSSEStream();
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // REST APIエンドポイント
    if (path === '/api/futures') {
      try {
        const data = await fetchAllFuturesData();
        return new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch futures data' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
    }

    // 静的ファイルの提供（Workers Assetsを使用）
    // Workers Assetsが有効な場合、env.ASSETSを使用
    if (env && env.ASSETS) {
      try {
        return await env.ASSETS.fetch(request);
      } catch (e) {
        // フォールバック
      }
    }

    // 404
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

