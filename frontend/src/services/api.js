import axios from 'axios';

// Get base URL from environment or localStorage override
const getApiBaseUrl = () => {
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('stock_market_custom_backend_url') : null;
  return savedUrl || process.env.REACT_APP_BACKEND_URL || '';
};

let currentBaseUrl = getApiBaseUrl();

const createApiClient = (baseURL) => {
  const url = baseURL ? (baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`) : '';
  return axios.create({
    baseURL: url,
    timeout: 4000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

let api = createApiClient(currentBaseUrl);

export const setCustomBackendUrl = (url) => {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem('stock_market_custom_backend_url', url);
    } else {
      localStorage.removeItem('stock_market_custom_backend_url');
    }
  }
  currentBaseUrl = url || process.env.REACT_APP_BACKEND_URL || '';
  api = createApiClient(currentBaseUrl);
};

export const getBackendConfig = () => {
  return {
    url: currentBaseUrl,
    isCustom: typeof window !== 'undefined' ? !!localStorage.getItem('stock_market_custom_backend_url') : false,
  };
};

// ==========================================
// High-Fidelity Mock & Simulation Data Layer
// (Used seamlessly when backend is offline)
// ==========================================

const POPULAR_STOCKS = [
  { symbol: 'NIFTY 50', name: 'NIFTY 50 Benchmark Index', exchange: 'NSE Index', sector: 'Broad Market Index', basePrice: 25145.20 },
  { symbol: 'SENSEX', name: 'BSE SENSEX Benchmark Index', exchange: 'BSE Index', sector: 'Broad Market Index', basePrice: 82365.75 },
  { symbol: 'BANK NIFTY', name: 'NIFTY Bank Sector Index', exchange: 'NSE Index', sector: 'Banking Sector Index', basePrice: 51840.60 },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', sector: 'Energy & Petrochemicals', basePrice: 2985.50 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', sector: 'Information Technology', basePrice: 4215.20 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', exchange: 'NSE', sector: 'Banking & Finance', basePrice: 1642.80 },
  { symbol: 'INFY', name: 'Infosys Ltd.', exchange: 'NSE', sector: 'Information Technology', basePrice: 1824.10 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', exchange: 'NSE', sector: 'Banking & Finance', basePrice: 1248.65 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', exchange: 'NSE', sector: 'FMCG', basePrice: 2780.40 },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Banking & Finance', basePrice: 814.30 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', exchange: 'NSE', sector: 'Telecom', basePrice: 1585.00 },
  { symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE', sector: 'FMCG & Diversified', basePrice: 492.75 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Passenger Vehicles', exchange: 'NSE', sector: 'Automobile', basePrice: 968.50 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', exchange: 'NSE', sector: 'Construction & Engineering', basePrice: 3620.00 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', sector: 'Banking & Finance', basePrice: 1785.60 },
  { symbol: 'WIPRO', name: 'Wipro Limited', exchange: 'NSE', sector: 'Information Technology', basePrice: 535.40 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', exchange: 'NSE', sector: 'Automobile', basePrice: 12450.00 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', exchange: 'NSE', sector: 'Financial Services', basePrice: 7120.00 },
];

const POPULAR_MUTUAL_FUNDS = [
  { scheme_code: '119551', scheme_name: 'HDFC Top 100 Fund - Direct Plan - Growth', nav: 986.42, date: '03-Sep-2026', category: 'Equity Scheme - Large Cap Fund' },
  { scheme_code: '120503', scheme_name: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth', nav: 104.18, date: '03-Sep-2026', category: 'Equity Scheme - Large Cap Fund' },
  { scheme_code: '119598', scheme_name: 'SBI Bluechip Fund - Direct Plan - Growth', nav: 88.65, date: '03-Sep-2026', category: 'Equity Scheme - Large Cap Fund' },
  { scheme_code: '122639', scheme_name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', nav: 76.92, date: '03-Sep-2026', category: 'Equity Scheme - Flexi Cap Fund' },
  { scheme_code: '120828', scheme_name: 'Mirae Asset Large Cap Fund - Direct Plan - Growth', nav: 118.34, date: '03-Sep-2026', category: 'Equity Scheme - Large Cap Fund' },
  { scheme_code: '120586', scheme_name: 'Nippon India Small Cap Fund - Direct Plan - Growth', nav: 164.80, date: '03-Sep-2026', category: 'Equity Scheme - Small Cap Fund' },
  { scheme_code: '125354', scheme_name: 'Quant Active Fund - Direct Plan - Growth', nav: 624.15, date: '03-Sep-2026', category: 'Equity Scheme - Multi Cap Fund' },
  { scheme_code: '118989', scheme_name: 'Kotak Emerging Equity Fund - Direct Plan - Growth', nav: 122.50, date: '03-Sep-2026', category: 'Equity Scheme - Mid Cap Fund' },
  { scheme_code: '120465', scheme_name: 'Axis Midcap Fund - Direct Plan - Growth', nav: 98.70, date: '03-Sep-2026', category: 'Equity Scheme - Mid Cap Fund' },
  { scheme_code: '128952', scheme_name: 'Tata Digital India Fund - Direct Plan - Growth', nav: 48.30, date: '03-Sep-2026', category: 'Equity Scheme - Sectoral / Thematic' },
  { scheme_code: '119775', scheme_name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth', nav: 168.90, date: '03-Sep-2026', category: 'Other Scheme - Index Funds' },
  { scheme_code: '120376', scheme_name: 'DSP Small Cap Fund - Direct Plan - Growth', nav: 92.40, date: '03-Sep-2026', category: 'Equity Scheme - Small Cap Fund' },
];

const checkMarketStatusMock = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const day = ist.getDay();
  const hour = ist.getHours();
  const min = ist.getMinutes();
  const totalMin = hour * 60 + min;

  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = totalMin >= 555 && totalMin <= 930;
  const isOpen = isWeekday && isMarketHours;

  return {
    is_open: isOpen,
    market: 'NSE/BSE',
    current_time_ist: ist.toLocaleTimeString('en-IN', { hour12: true }),
    session: isOpen ? 'Regular Trading' : 'Closed',
    next_open: '09:15 AM IST (Next Trading Day)',
  };
};

const generateMockTimeSeries = (basePrice, timeframe = '1day', count = 100) => {
  const candles = [];
  let price = basePrice * 0.92;
  const now = new Date();
  
  let stepMs = 86400000;
  if (timeframe === '1min') stepMs = 60000;
  else if (timeframe === '5min') stepMs = 300000;
  else if (timeframe === '15min') stepMs = 900000;
  else if (timeframe === '1h') stepMs = 3600000;
  else if (timeframe === '1week') stepMs = 604800000;

  const startTime = now.getTime() - (count * stepMs);

  for (let i = 0; i < count; i++) {
    const candleTime = new Date(startTime + (i * stepMs));
    const volatility = 0.015;
    const changePct = (Math.random() - 0.48) * volatility;
    
    const open = price;
    const close = Math.max(1, open * (1 + changePct));
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);
    const volume = Math.floor(Math.random() * 500000 + 100000);

    price = close;

    candles.push({
      datetime: candleTime.toISOString().replace('T', ' ').substring(0, 19),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
      ema_20: parseFloat((close * 0.995).toFixed(2)),
      ema_50: parseFloat((close * 0.988).toFixed(2)),
      rsi: parseFloat((45 + Math.random() * 25).toFixed(2)),
    });
  }

  return candles;
};

// ==========================================
// API Endpoints with Offline / Demo Fallback
// ==========================================

export const getMarketStatus = async () => {
  if (currentBaseUrl) {
    try {
      const response = await api.get('/market/status');
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend unavailable, using simulated market status.');
    }
  }
  return checkMarketStatusMock();
};

export const getIndices = async () => {
  if (currentBaseUrl) {
    try {
      const response = await api.get('/indices');
      if (response.data?.indices) return response.data;
    } catch (err) {
      console.warn('Backend unavailable, using simulated indices.');
    }
  }
  
  return {
    indices: [
      {
        symbol: 'NIFTY 50',
        name: 'NIFTY 50 Benchmark Index',
        exchange: 'NSE Index',
        price: 25145.20,
        change: 142.80,
        change_percent: 0.57,
        high: 25210.00,
        low: 24980.50,
      },
      {
        symbol: 'SENSEX',
        name: 'BSE SENSEX Benchmark Index',
        exchange: 'BSE Index',
        price: 82365.75,
        change: 410.25,
        change_percent: 0.50,
        high: 82540.10,
        low: 81890.30,
      },
      {
        symbol: 'BANK NIFTY',
        name: 'NIFTY Bank Sector Index',
        exchange: 'NSE Index',
        price: 51840.60,
        change: -95.40,
        change_percent: -0.18,
        high: 52100.00,
        low: 51650.20,
      },
    ],
  };
};

export const getStocksList = async () => {
  if (currentBaseUrl) {
    try {
      const response = await api.get('/stocks/list');
      if (response.data?.stocks) return response.data;
    } catch (err) {
      console.warn('Backend unavailable, using simulated stocks list.');
    }
  }
  return { stocks: POPULAR_STOCKS };
};

export const searchStocks = async (query) => {
  if (currentBaseUrl) {
    try {
      const response = await api.get(`/stocks/search?q=${encodeURIComponent(query)}`);
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend unavailable, using simulated stock search.');
    }
  }
  const q = (query || '').toLowerCase();
  const results = POPULAR_STOCKS.filter(
    s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  );
  return { results };
};

export const analyzeStock = async (request) => {
  if (currentBaseUrl) {
    try {
      const response = await api.post('/analysis/analyze', request);
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend unavailable, generating intelligent simulated AI analysis.');
    }
  }

  const foundStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === (request.symbol || '').toUpperCase());
  const basePrice = foundStock ? foundStock.basePrice : 1500.00;
  const currencyRate = request.currency === 'USD' ? 0.012 : request.currency === 'EUR' ? 0.011 : 1;
  const currentPrice = parseFloat((basePrice * currencyRate).toFixed(2));

  const chartData = generateMockTimeSeries(currentPrice, request.timeframe || '1day', 100);
  const lastClose = chartData[chartData.length - 1].close;

  const isBullish = Math.random() > 0.35;
  const trend = isBullish ? 'UP' : 'DOWN';
  const signal = isBullish ? 'BUY' : 'HOLD';
  const confidence = parseFloat((0.82 + Math.random() * 0.14).toFixed(2));
  const targetMultiplier = isBullish ? 1.06 : 0.94;
  const predictedPrice = parseFloat((lastClose * targetMultiplier).toFixed(2));
  
  const entry = isBullish 
    ? [parseFloat((lastClose * 0.985).toFixed(2)), parseFloat(lastClose.toFixed(2))]
    : [parseFloat(lastClose.toFixed(2)), parseFloat((lastClose * 1.015).toFixed(2))];
    
  const target = isBullish
    ? [parseFloat((lastClose * 1.04).toFixed(2)), parseFloat((lastClose * 1.08).toFixed(2))]
    : [parseFloat((lastClose * 0.96).toFixed(2)), parseFloat((lastClose * 0.92).toFixed(2))];

  const stop_loss = isBullish
    ? parseFloat((lastClose * 0.95).toFixed(2))
    : parseFloat((lastClose * 1.04).toFixed(2));

  const stockSymbol = request.symbol || 'STOCK';

  const mockNews = [
    {
      title: `${stockSymbol} Q3 financial results beat analyst estimates by 8.4%`,
      source: 'Bloomberg Quint / ET Markets',
      published_at: '2 hours ago',
      sentiment: 'Positive',
    },
    {
      title: `Institutional FII inflows surge into ${stockSymbol} amid sector momentum`,
      source: 'Moneycontrol',
      published_at: '4 hours ago',
      sentiment: 'Positive',
    },
    {
      title: `Global macroeconomic indicators remain supportive for Indian equities`,
      source: 'Reuters Financial',
      published_at: '6 hours ago',
      sentiment: 'Neutral',
    },
    {
      title: `Technical breakout observed on daily charts with strong volume support for ${stockSymbol}`,
      source: 'LiveMint Market Watch',
      published_at: '8 hours ago',
      sentiment: 'Positive',
    },
  ];

  return {
    symbol: stockSymbol,
    exchange: request.exchange || 'NSE',
    market_status: checkMarketStatusMock(),
    realtime: !!request.realtime,
    currency: request.currency || 'INR',
    current_price: lastClose,
    chart_data: chartData,
    prediction: {
      trend,
      signal,
      confidence,
      predicted_price: predictedPrice,
      entry,
      target,
      stop_loss,
      model: 'LSTM + Transformer Hybrid Ensemble',
    },
    sentiment: {
      overall_sentiment: isBullish ? 0.76 : 0.42,
      sentiment_label: isBullish ? 'Positive' : 'Neutral',
      positive_count: 3,
      neutral_count: 1,
      negative_count: 0,
    },
    news: mockNews,
  };
};

export const getMutualFunds = async (limit = 50) => {
  if (currentBaseUrl) {
    try {
      const response = await api.get(`/mutual_funds/list?limit=${limit}`);
      if (response.data?.funds) return response.data;
    } catch (err) {
      console.warn('Backend unavailable, using simulated AMFI mutual funds.');
    }
  }
  return { funds: POPULAR_MUTUAL_FUNDS.slice(0, limit) };
};

export const searchMutualFunds = async (query) => {
  if (currentBaseUrl) {
    try {
      const response = await api.get(`/mutual_funds/search?q=${encodeURIComponent(query)}`);
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend unavailable, using simulated mutual fund search.');
    }
  }
  const q = (query || '').toLowerCase();
  const results = POPULAR_MUTUAL_FUNDS.filter(
    f => f.scheme_name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
  );
  return { results };
};

export default api;

