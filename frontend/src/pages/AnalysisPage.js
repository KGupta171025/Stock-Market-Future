import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { analyzeStock, getMarketStatus, getStocksList, getIndices, getUSStocksList, getUSIndices } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Newspaper, BarChart3, LogOut, RefreshCw, AlertCircle, Target, ShieldAlert, Cpu, Gauge, Zap, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { createChart, CandlestickSeries, LineSeries, ColorType } from 'lightweight-charts';
import { useAuth } from '../contexts/AuthContext';
import LiveAutoRefreshBar from '../components/LiveAutoRefreshBar';

const sanitizeCandles = (rawData) => {
  if (!rawData || !rawData.length) return [];
  const seenTimes = new Set();
  const sanitizedCandles = [];

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    let timestamp = Math.floor(new Date(item.datetime).getTime() / 1000);
    
    if (isNaN(timestamp) || timestamp <= 0) {
      timestamp = Math.floor(Date.now() / 1000) - ((rawData.length - i) * 86400);
    }

    if (!seenTimes.has(timestamp)) {
      seenTimes.add(timestamp);
      const open = Number(item.open) || Number(item.close);
      const close = Number(item.close);
      const high = Math.max(Number(item.high) || close, open, close);
      const low = Math.min(Number(item.low) || close, open, close);

      sanitizedCandles.push({
        time: timestamp,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        value: parseFloat(close.toFixed(2)),
      });
    }
  }

  sanitizedCandles.sort((a, b) => a.time - b.time);
  return sanitizedCandles;
};

export default function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const chartTypeRef = useRef('candlestick');
  const resizeHandlerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const prevPriceRef = useRef(null);
  
  const defaultStock = { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE' };
  const [stockList, setStockList] = useState([defaultStock]);
  const [stock, setStock] = useState(location.state?.stock || defaultStock);
  const [timeframe, setTimeframe] = useState('1day');
  const [chartType, setChartType] = useState('candlestick');
  const [currency, setCurrency] = useState(
    location.state?.stock?.currency ||
    (location.state?.stock?.exchange === 'NASDAQ' || location.state?.stock?.exchange === 'NYSE' ? 'USD' : 'INR')
  );
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);
  const [chartError, setChartError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2s Fast Auto-reload
  const [isPaused, setIsPaused] = useState(false);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [priceFlash, setPriceFlash] = useState(null);

  useEffect(() => {
    fetchMarketStatus();
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      const [stocksData, indicesData, usStocksData, usIndicesData] = await Promise.all([
        getStocksList(),
        getIndices(),
        getUSStocksList(),
        getUSIndices()
      ]);
      const combined = [
        ...(indicesData?.indices || []),
        ...(stocksData?.stocks || []),
        ...(usIndicesData?.indices || []),
        ...(usStocksData?.stocks || [])
      ];
      if (combined.length) {
        setStockList(combined);
      }
    } catch (e) {
      console.error('Failed to load stock list:', e);
    }
  };

  const handleAnalyze = useCallback(async (selectedStock = stock, selectedTimeframe = timeframe, selectedCurrency = currency, isSilent = false) => {
    if (!selectedStock) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (!isSilent) {
        setLoading(true);
        setChartError(null);
      } else {
        setIsSilentRefreshing(true);
      }

      const request = {
        symbol: selectedStock.symbol,
        exchange: selectedStock.exchange || 'NSE',
        timeframe: selectedTimeframe,
        realtime: true,
        currency: selectedCurrency,
      };
      
      const result = await analyzeStock(request);
      
      // Calculate price flash
      if (prevPriceRef.current !== null && prevPriceRef.current !== result.current_price) {
        const direction = result.current_price > prevPriceRef.current ? 'up' : 'down';
        setPriceFlash(direction);
        setTimeout(() => setPriceFlash(null), 700);
      }
      prevPriceRef.current = result.current_price;

      setAnalysis(result);
      setLastUpdated(Date.now());

      // If chart is already mounted, smoothly update series data
      if (seriesRef.current && chartRef.current && isSilent && result.chart_data) {
        const sanitized = sanitizeCandles(result.chart_data);
        if (sanitized.length > 0) {
          if (chartTypeRef.current === 'line') {
            seriesRef.current.setData(sanitized.map(d => ({ time: d.time, value: d.value })));
          } else {
            seriesRef.current.setData(sanitized);
          }
        }
      }
    } catch (error) {
      if (!isSilent) {
        toast.error('Analysis failed: ' + error.message);
      }
      console.error(error);
    } finally {
      if (!isSilent) setLoading(false);
      setIsSilentRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [stock, timeframe, currency]);

  // Initial & Dependency-Triggered Full Analysis
  useEffect(() => {
    if (stock) {
      handleAnalyze(stock, timeframe, currency, false);
    }
  }, [stock, timeframe, currency, handleAnalyze]);

  // Continuous Auto-Reload Interval
  useEffect(() => {
    if (isPaused || refreshInterval <= 0 || !stock) return;

    const intervalId = setInterval(() => {
      handleAnalyze(stock, timeframe, currency, true);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, isPaused, stock, timeframe, currency, handleAnalyze]);

  useEffect(() => {
    if (analysis && chartContainerRef.current) {
      renderChart();
    }
    return () => {
      cleanupChart();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.symbol, timeframe, chartType]);

  const cleanupChart = () => {
    if (resizeHandlerRef.current) {
      window.removeEventListener('resize', resizeHandlerRef.current);
      resizeHandlerRef.current = null;
    }
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.warn('Error removing chart instance:', e);
      }
      chartRef.current = null;
      seriesRef.current = null;
    }
  };

  const fetchMarketStatus = async () => {
    try {
      const status = await getMarketStatus();
      setMarketStatus(status);
    } catch (error) {
      console.error('Failed to fetch market status:', error);
    }
  };

  const handleStockChange = (symbol) => {
    const found = stockList.find(s => s.symbol === symbol) || { symbol, name: symbol, exchange: 'NSE' };
    setStock(found);
    if (found.currency === 'USD' || found.exchange === 'NASDAQ' || found.exchange === 'NYSE') {
      setCurrency('USD');
    } else if (found.currency === 'INR' || found.exchange === 'NSE' || found.exchange === 'BSE') {
      setCurrency('INR');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const renderChart = () => {
    if (!chartContainerRef.current || !analysis?.chart_data?.length) return;

    cleanupChart();
    setChartError(null);

    try {
      const container = chartContainerRef.current;
      const width = container.clientWidth || 600;

      // Create new chart instance with v5 configuration
      const chart = createChart(container, {
        width: width,
        height: 500,
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#334155',
        },
        grid: {
          vertLines: { color: '#f1f5f9' },
          horzLines: { color: '#f1f5f9' },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: '#e2e8f0',
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: '#e2e8f0',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;
      chartTypeRef.current = chartType;

      const sanitizedCandles = sanitizeCandles(analysis.chart_data);

      if (sanitizedCandles.length === 0) {
        throw new Error('No valid price points available to render');
      }

      // Add series using v5 addSeries API
      if (chartType === 'line') {
        const lineSeries = chart.addSeries(LineSeries, {
          color: '#10B981',
          lineWidth: 2.5,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.05,
          },
        });
        lineSeries.setData(sanitizedCandles.map(d => ({ time: d.time, value: d.value })));
        seriesRef.current = lineSeries;
      } else {
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10B981',
          downColor: '#EF4444',
          borderVisible: false,
          wickUpColor: '#10B981',
          wickDownColor: '#EF4444',
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.05,
          },
        });
        candleSeries.setData(sanitizedCandles);
        seriesRef.current = candleSeries;
      }

      chart.timeScale().fitContent();

      // Handle dynamic window resizing
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth || 600,
          });
        }
      };
      resizeHandlerRef.current = handleResize;
      window.addEventListener('resize', handleResize);

    } catch (err) {
      console.error('Failed to render Lightweight Charts v5:', err);
      setChartError(err.message || 'Error initializing interactive chart');
    }
  };

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  const isPositive = (analysis?.change || 0) >= 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} data-testid="back-button">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Dashboard
              </Button>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-lg font-bold tracking-tight hidden sm:inline">Stock Market Future</h1>
              </div>

              <nav className="hidden md:flex items-center gap-1.5 ml-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground">
                  🇮🇳 IND Stocks
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/us-stocks')} className="text-muted-foreground hover:text-foreground">
                  🇺🇸 US Stocks
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/mutual-funds')} className="text-muted-foreground hover:text-foreground">
                  <Layers className="h-4 w-4 mr-1.5" />
                  Mutual Funds
                </Button>
                <Button variant="secondary" size="sm" className="font-semibold" onClick={() => navigate('/analysis')}>
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                  Stock Analysis
                </Button>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden lg:inline font-mono">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1.5" />
                Logout
              </Button>
            </div>
          </div>

          {/* Stock Info Bar with LTP, Change, High, Low, & Volume */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-border/40 flex-wrap">
            <div className="flex items-center gap-3">
              <Select value={stock?.symbol || 'RELIANCE'} onValueChange={handleStockChange}>
                <SelectTrigger className="w-72 font-bold text-base bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Select Stock / Index" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {stockList.map(s => (
                    <SelectItem key={`${s.exchange || ''}-${s.symbol}`} value={s.symbol}>
                      <span className="font-semibold">{s.symbol}</span> - <span className="text-xs text-muted-foreground">{s.name} ({s.exchange || 'NSE'})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">
                {stock?.exchange || 'NSE'}
              </span>
              <span className="text-xs text-muted-foreground hidden md:inline">
                {stock?.sector || 'Equities'}
              </span>
            </div>

            {analysis && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block font-medium">LTP (Last Traded Price)</span>
                  <span className={`text-2xl font-extrabold transition-colors duration-300 ${
                    priceFlash === 'up' ? 'text-emerald-600 dark:text-emerald-400' : priceFlash === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {currencySymbol}{analysis.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
                  isPositive 
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                    : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                }`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>
                    {isPositive ? '+' : ''}{analysis.change?.toFixed(2)} ({isPositive ? '+' : ''}{analysis.change_percent?.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Intraday Summary Metrics Bar */}
          {analysis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 py-2 border-t border-border/40 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded">
                <span className="text-muted-foreground block">Day High</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{currencySymbol}{analysis.high?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded">
                <span className="text-muted-foreground block">Day Low</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{currencySymbol}{analysis.low?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded">
                <span className="text-muted-foreground block">Prev Close</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{currencySymbol}{analysis.prev_close?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded">
                <span className="text-muted-foreground block">Volume</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{analysis.volume || '5.2M'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded hidden sm:block">
                <span className="text-muted-foreground block">52W Range</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{currencySymbol}{analysis.week_52_low} - {currencySymbol}{analysis.week_52_high}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded hidden sm:block">
                <span className="text-muted-foreground block">P/E Ratio</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{analysis.pe_ratio || '24.5'}</span>
              </div>
            </div>
          )}

          {/* Control Bar */}
          <div className="flex flex-wrap gap-3 items-center justify-between pt-2.5 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Timeframe:</span>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-32 h-8 text-xs bg-white dark:bg-slate-800" data-testid="timeframe-selector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1min">1 Minute</SelectItem>
                    <SelectItem value="5min">5 Minutes</SelectItem>
                    <SelectItem value="15min">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="1day">1 Day</SelectItem>
                    <SelectItem value="1week">1 Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Chart:</span>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-36 h-8 text-xs bg-white dark:bg-slate-800" data-testid="chart-type-selector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candlestick">Candlestick</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Currency:</span>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-28 h-8 text-xs bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">₹ INR</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <LiveAutoRefreshBar
                interval={refreshInterval}
                onIntervalChange={setRefreshInterval}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused((prev) => !prev)}
                onManualRefresh={() => handleAnalyze(stock, timeframe, currency, false)}
                lastUpdated={lastUpdated}
                isRefreshing={isSilentRefreshing}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Chart:</span>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-36 h-8 text-xs bg-white dark:bg-slate-800" data-testid="chart-type-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Currency:</span>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-28 h-8 text-xs bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" onClick={() => handleAnalyze(stock, timeframe, currency)} disabled={loading} className="h-8 text-xs" data-testid="analyze-button">
              {loading ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Re-Analyze'
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm bg-white dark:bg-slate-900 border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Price Action Chart ({chartType === 'candlestick' ? 'Candlestick' : 'Line'})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stock.name} ({stock.symbol}) • {timeframe} timeframe • Live synchronized candles
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {chartError ? (
                  <div className="h-[500px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg p-6 text-center border border-dashed">
                    <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Chart Display Notice</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">{chartError}</p>
                    <Button size="sm" onClick={() => renderChart()}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Retry Chart Render
                    </Button>
                  </div>
                ) : (
                  <div ref={chartContainerRef} className="w-full h-[500px] rounded-lg overflow-hidden bg-white" data-testid="chart-container" />
                )}
              </CardContent>
            </Card>

            {/* Technical Analysis Matrix for Multi-Factor Research */}
            {analysis?.technical_indicators && (
              <Card className="shadow-sm bg-white dark:bg-slate-900 border-border/80">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-primary" />
                    Multi-Factor Technical Indicators & Pivot Levels
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-border/50">
                      <span className="text-xs text-muted-foreground block font-medium">RSI (14-Period)</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {analysis.technical_indicators.rsi_14}
                      </span>
                      <span className={`text-[10px] font-semibold block mt-0.5 ${
                        analysis.technical_indicators.rsi_14 > 70 ? 'text-amber-600' :
                        analysis.technical_indicators.rsi_14 < 30 ? 'text-green-600' : 'text-slate-500'
                      }`}>
                        {analysis.technical_indicators.rsi_14 > 70 ? 'Overbought Zone' :
                         analysis.technical_indicators.rsi_14 < 30 ? 'Oversold / Value' : 'Neutral Momentum'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-border/50">
                      <span className="text-xs text-muted-foreground block font-medium">20 EMA / 50 EMA</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                        {currencySymbol}{analysis.technical_indicators.ema_20}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {currencySymbol}{analysis.technical_indicators.ema_50}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-border/50">
                      <span className="text-xs text-muted-foreground block font-medium">Resistance (R1 / R2)</span>
                      <span className="text-sm font-bold text-red-600 block">
                        {currencySymbol}{analysis.technical_indicators.resistance_1}
                      </span>
                      <span className="text-xs text-red-500">
                        {currencySymbol}{analysis.technical_indicators.resistance_2}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-border/50">
                      <span className="text-xs text-muted-foreground block font-medium">Support (S1 / S2)</span>
                      <span className="text-sm font-bold text-green-600 block">
                        {currencySymbol}{analysis.technical_indicators.support_1}
                      </span>
                      <span className="text-xs text-green-500">
                        {currencySymbol}{analysis.technical_indicators.support_2}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Predictions & Sentiment Column */}
          <div className="space-y-6">
            {analysis && (
              <>
                {/* AI Prediction & Action Card */}
                <Card data-testid="prediction-card" className="shadow-sm bg-white dark:bg-slate-900 border-border/80">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-primary" />
                        AI Prediction & Targets
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        Ensemble
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {/* Signal & Confidence */}
                    <div className="flex items-center justify-between pb-3 border-b border-border/50">
                      <div>
                        <span className="text-xs text-muted-foreground font-medium block">Signal Action</span>
                        <span className={`text-2xl font-extrabold tracking-wide ${
                          analysis.prediction?.signal === 'BUY' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {analysis.prediction?.signal}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground font-medium block">Model Confidence</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {((analysis.prediction?.confidence || 0.85) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Calculated Price Levels */}
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-border/40">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <Target className="h-4 w-4 text-emerald-600" />
                          Target 1 (Primary)
                        </span>
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {currencySymbol}{analysis.prediction?.target?.[0]?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-border/40">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <Zap className="h-4 w-4 text-emerald-500" />
                          Target 2 (Extended)
                        </span>
                        <span className="font-bold text-sm text-emerald-500">
                          {currencySymbol}{analysis.prediction?.target?.[1]?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-border/40">
                        <span className="text-muted-foreground font-medium">Optimal Entry Range</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {currencySymbol}{analysis.prediction?.entry?.[0]?.toLocaleString('en-IN')} - {currencySymbol}{analysis.prediction?.entry?.[1]?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-border/40">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                          Strict Stop Loss
                        </span>
                        <span className="font-bold text-sm text-red-600 dark:text-red-400">
                          {currencySymbol}{analysis.prediction?.stop_loss?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 px-1 text-muted-foreground">
                        <span>Risk : Reward Ratio</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {analysis.prediction?.risk_reward_ratio || '1 : 2.4'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* News Sentiment & Catalysts */}
                <Card className="shadow-sm bg-white dark:bg-slate-900 border-border/80">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Newspaper className="h-5 w-5 text-primary" />
                      News Catalysts & Market Sentiment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="mb-3.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg flex items-center justify-between border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Sentiment Bias</span>
                        <span className={`text-base font-bold ${
                          analysis.sentiment?.sentiment_label === 'Positive' ? 'text-green-600' :
                          analysis.sentiment?.sentiment_label === 'Negative' ? 'text-red-600' :
                          'text-amber-600'
                        }`}>
                          {analysis.sentiment?.sentiment_label || 'Neutral'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Score</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {analysis.sentiment?.overall_sentiment || 0.75} / 1.0
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {analysis.news?.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md text-xs border border-border/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{item.title}</p>
                          <div className="flex justify-between items-center mt-2 text-muted-foreground">
                            <span className="font-medium">{item.source}</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{item.published_at || 'Recent'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
