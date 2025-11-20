// Server-Sent Events接続
let eventSource = null;

// DOM要素
const futuresGrid = document.getElementById('futures-grid');
const connectionStatus = document.getElementById('connection-status');
const lastUpdate = document.getElementById('last-update');
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const favoritesBtn = document.getElementById('favorites-btn');
const darkModeBtn = document.getElementById('dark-mode-btn');
const alertsBtn = document.getElementById('alerts-btn');
const alertModal = document.getElementById('alert-modal');
const alertList = document.getElementById('alert-list');
const addAlertBtn = document.getElementById('add-alert-btn');

// 現在のデータと状態
let currentData = [];
let previousData = [];
let currentFilter = 'all';
let currentSort = 'name';
let showFavoritesOnly = false;
let favorites = JSON.parse(localStorage.getItem('futures-favorites') || '[]');
let alerts = JSON.parse(localStorage.getItem('futures-alerts') || '[]');
let priceHistory = {}; // 各シンボルの価格履歴を保存

// ダークモードの初期化
if (localStorage.getItem('dark-mode') === 'true') {
    document.body.classList.add('dark-mode');
    darkModeBtn.textContent = '☀️';
}

// Server-Sent Events接続を開始
function connectSSE() {
    // APIエンドポイントを取得（Cloudflare Workersまたはローカルサーバー）
    const apiBase = window.location.origin;
    const streamUrl = `${apiBase}/api/futures/stream`;
    
    try {
        eventSource = new EventSource(streamUrl);
        
        eventSource.onopen = () => {
            connectionStatus.textContent = '接続中';
            connectionStatus.classList.remove('disconnected');
            futuresGrid.innerHTML = '<div class="loading">データを読み込み中...</div>';
        };
        
        eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            connectionStatus.textContent = '接続エラー';
            connectionStatus.classList.add('disconnected');
            
            // 再接続を試みる
            if (eventSource.readyState === EventSource.CLOSED) {
                setTimeout(() => {
                    if (eventSource) {
                        eventSource.close();
                    }
                    connectSSE();
                }, 3000);
            }
        };
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                previousData = [...currentData];
                currentData = data;
                
                // 価格履歴を更新
                data.forEach(item => {
                    if (!priceHistory[item.symbol]) {
                        priceHistory[item.symbol] = [];
                    }
                    priceHistory[item.symbol].push({
                        time: Date.now(),
                        price: item.price
                    });
                    // 最新50件のみ保持
                    if (priceHistory[item.symbol].length > 50) {
                        priceHistory[item.symbol].shift();
                    }
                });
                
                // アラートチェック
                checkAlerts(data);
                
                updateDisplay();
                updateLastUpdateTime();
            } catch (error) {
                console.error('Error parsing SSE data:', error);
            }
        };
    } catch (error) {
        console.error('Error creating EventSource:', error);
        connectionStatus.textContent = '接続失敗';
        connectionStatus.classList.add('disconnected');
    }
}

// ページ読み込み時にSSE接続を開始
connectSSE();

// ページを離れる際に接続を閉じる
window.addEventListener('beforeunload', () => {
    if (eventSource) {
        eventSource.close();
    }
});

// フィルターボタンのイベント
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.region;
        updateDisplay();
    });
});

// 検索機能
searchInput.addEventListener('input', (e) => {
    updateDisplay();
});

// ソート機能
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    updateDisplay();
});

// お気に入り機能
favoritesBtn.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    favoritesBtn.classList.toggle('active', showFavoritesOnly);
    updateDisplay();
});

// ダークモード切り替え
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark-mode', isDark);
    darkModeBtn.textContent = isDark ? '☀️' : '🌙';
});

// アラートモーダル
alertsBtn.addEventListener('click', () => {
    alertModal.classList.add('show');
    updateAlertList();
});

const closeModal = alertModal.querySelector('.close');
closeModal.addEventListener('click', () => {
    alertModal.classList.remove('show');
});

window.addEventListener('click', (e) => {
    if (e.target === alertModal) {
        alertModal.classList.remove('show');
    }
});

// アラート追加
addAlertBtn.addEventListener('click', () => {
    const symbol = prompt('シンボルを入力してください（例: ES=F）:');
    if (!symbol) return;
    
    const threshold = parseFloat(prompt('変動率の閾値を入力してください（例: 2.5）:'));
    if (isNaN(threshold)) return;
    
    const alert = {
        id: Date.now(),
        symbol: symbol,
        threshold: threshold,
        enabled: true
    };
    
    alerts.push(alert);
    localStorage.setItem('futures-alerts', JSON.stringify(alerts));
    updateAlertList();
});

// アラートリストを更新
function updateAlertList() {
    if (alerts.length === 0) {
        alertList.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">アラートが設定されていません</p>';
        return;
    }
    
    alertList.innerHTML = alerts.map(alert => `
        <div class="alert-item">
            <div class="alert-item-info">
                <strong>${alert.symbol}</strong><br>
                <small>変動率: ${alert.threshold > 0 ? '+' : ''}${alert.threshold}%</small>
            </div>
            <div class="alert-item-actions">
                <button onclick="toggleAlert(${alert.id})" style="background: #667eea; color: white;">
                    ${alert.enabled ? '無効' : '有効'}
                </button>
                <button onclick="deleteAlert(${alert.id})" style="background: #ef4444; color: white;">
                    削除
                </button>
            </div>
        </div>
    `).join('');
}

// アラートの有効/無効を切り替え
window.toggleAlert = function(id) {
    const alert = alerts.find(a => a.id === id);
    if (alert) {
        alert.enabled = !alert.enabled;
        localStorage.setItem('futures-alerts', JSON.stringify(alerts));
        updateAlertList();
    }
};

// アラートを削除
window.deleteAlert = function(id) {
    alerts = alerts.filter(a => a.id !== id);
    localStorage.setItem('futures-alerts', JSON.stringify(alerts));
    updateAlertList();
};

// アラートをチェック
function checkAlerts(data) {
    alerts.forEach(alert => {
        if (!alert.enabled) return;
        
        const item = data.find(d => d.symbol === alert.symbol);
        if (!item) return;
        
        if (Math.abs(item.changePercent) >= Math.abs(alert.threshold)) {
            // ブラウザ通知
            if (Notification.permission === 'granted') {
                new Notification(`${item.name} アラート`, {
                    body: `変動率が${item.changePercent.toFixed(2)}%に達しました`,
                    icon: '/favicon.ico'
                });
            }
        }
    });
}

// 通知許可をリクエスト
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// 表示を更新
function updateDisplay() {
    let filteredData = filterData(currentData, currentFilter);
    
    // 検索フィルター
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredData = filteredData.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.symbol.toLowerCase().includes(searchTerm)
        );
    }
    
    // お気に入りフィルター
    if (showFavoritesOnly) {
        filteredData = filteredData.filter(item => favorites.includes(item.symbol));
    }
    
    // ソート
    filteredData = sortData(filteredData, currentSort);
    
    if (filteredData.length === 0) {
        futuresGrid.innerHTML = '<div class="loading">データがありません</div>';
        return;
    }

    futuresGrid.innerHTML = filteredData.map(item => createCard(item)).join('');
    
    // お気に入りボタンのイベントを追加
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const symbol = btn.dataset.symbol;
            toggleFavorite(symbol);
            updateDisplay();
        });
    });
}

// データをフィルタリング
function filterData(data, region) {
    if (region === 'all') return data;
    
    const regionMap = {
        'US': ['US'],
        'JP': ['JP'],
        'EU': ['DE', 'FR', 'UK'],
        'ASIA': ['HK', 'AU', 'SG']
    };

    const regions = regionMap[region] || [];
    return data.filter(item => regions.includes(item.region));
}

// データをソート
function sortData(data, sortBy) {
    const sorted = [...data];
    
    switch(sortBy) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'change':
            sorted.sort((a, b) => b.change - a.change);
            break;
        case 'changePercent':
            sorted.sort((a, b) => b.changePercent - a.changePercent);
            break;
    }
    
    return sorted;
}

// お気に入りを切り替え
function toggleFavorite(symbol) {
    const index = favorites.indexOf(symbol);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(symbol);
    }
    localStorage.setItem('futures-favorites', JSON.stringify(favorites));
}

// 価格が更新されたかチェック
function isPriceUpdated(symbol, newPrice) {
    const previous = previousData.find(d => d.symbol === symbol);
    if (!previous) return false;
    return Math.abs(previous.price - newPrice) > 0.01;
}

// カードを作成
function createCard(item) {
    const changeClass = item.change >= 0 ? 'positive' : 'negative';
    const changeIcon = item.change >= 0 ? '▲' : '▼';
    const changeSign = item.change >= 0 ? '+' : '';
    const isFavorite = favorites.includes(item.symbol);
    const priceUpdated = isPriceUpdated(item.symbol, item.price);
    
    // ミニチャート用のSVGを生成
    const chartSvg = generateMiniChart(item.symbol, item.priceHistory || priceHistory[item.symbol] || [], changeClass);
    
    return `
        <div class="futures-card ${changeClass} ${priceUpdated ? 'price-updated' : ''}" data-symbol="${item.symbol}">
            <div class="card-header">
                <div class="card-title">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-symbol="${item.symbol}" title="お気に入り">
                        ${isFavorite ? '⭐' : '☆'}
                    </button>
                    <div>
                        <div class="card-name">${item.name}</div>
                        <div class="card-symbol">${item.symbol}</div>
                    </div>
                </div>
                <div class="card-region">${getRegionName(item.region)}</div>
            </div>
            <div class="card-price">${formatPrice(item.price)}</div>
            <div class="card-change ${changeClass}">
                <span class="card-change-icon">${changeIcon}</span>
                <span>${changeSign}${formatPrice(item.change)} (${changeSign}${item.changePercent.toFixed(2)}%)</span>
            </div>
            ${chartSvg}
            <div class="card-details">
                <div class="card-detail-item">
                    <div class="card-detail-label">前日終値</div>
                    <div class="card-detail-value">${formatPrice(item.previousClose)}</div>
                </div>
                <div class="card-detail-item">
                    <div class="card-detail-label">高値</div>
                    <div class="card-detail-value">${formatPrice(item.high)}</div>
                </div>
                <div class="card-detail-item">
                    <div class="card-detail-label">安値</div>
                    <div class="card-detail-value">${formatPrice(item.low)}</div>
                </div>
                <div class="card-detail-item">
                    <div class="card-detail-label">始値</div>
                    <div class="card-detail-value">${formatPrice(item.open)}</div>
                </div>
            </div>
            <div class="card-exchange">取引所: ${item.exchange}</div>
        </div>
    `;
}

// ミニチャートを生成
function generateMiniChart(symbol, history, changeClass) {
    if (!history || history.length < 2) {
        return '<div class="mini-chart"></div>';
    }
    
    const width = 280;
    const height = 60;
    const padding = 5;
    
    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const points = history.map((h, idx) => {
        const x = padding + (idx / (history.length - 1)) * (width - padding * 2);
        const y = height - padding - ((h.price - minPrice) / priceRange) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');
    
    return `
        <div class="mini-chart">
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <polyline
                    class="chart-line ${changeClass}"
                    points="${points}"
                    fill="none"
                    stroke-width="2"
                />
            </svg>
        </div>
    `;
}

// 価格をフォーマット
function formatPrice(price) {
    if (price === null || price === undefined) return 'N/A';
    return new Intl.NumberFormat('ja-JP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
}

// 地域名を取得
function getRegionName(region) {
    const regionNames = {
        'US': '🇺🇸 米国',
        'JP': '🇯🇵 日本',
        'DE': '🇩🇪 ドイツ',
        'UK': '🇬🇧 英国',
        'FR': '🇫🇷 フランス',
        'HK': '🇭🇰 香港',
        'AU': '🇦🇺 オーストラリア',
        'SG': '🇸🇬 シンガポール'
    };
    return regionNames[region] || region;
}

// 最終更新時刻を更新
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    lastUpdate.textContent = `最終更新: ${timeString}`;
}

// 初回データ取得（REST API）
async function fetchInitialData() {
    try {
        const response = await fetch('/api/futures');
        const data = await response.json();
        currentData = data;
        
        // 価格履歴を初期化
        data.forEach(item => {
            if (item.priceHistory) {
                priceHistory[item.symbol] = item.priceHistory;
            }
        });
        
        updateDisplay();
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error fetching initial data:', error);
        futuresGrid.innerHTML = '<div class="loading">データの取得に失敗しました</div>';
    }
}

// ページ読み込み時に初期データを取得
fetchInitialData();
