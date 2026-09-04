import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { analyzeStock, getMarketStatus, getStocksList } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Newspaper, BarChart3, LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createChart, CandlestickSeries, LineSeries, ColorType } from 'lightweight-charts';
import { useAuth } from '../contexts/AuthContext';

export default function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  
  const defaultStock = { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE' };
  const [stockList, setStockList] = useState([defaultStock]);
  const [stock, setStock] = useState(location.state?.stock || defaultStock);
  const [timeframe, setTimeframe] = useState('1day');
  const [realtime, setRealtime] = useState(false);
  const [chartType, setChartType] = useState('candlestick');
  const [currency, setCurrency] = useState('INR');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);
  const [chartError, setChartError] = useState(null);

  useEffect(() => {
    fetchMarketStatus();
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      const data = await getStocksList();
      if (data?.stocks?.length) {
        setStockList(data.stocks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (stock) {
      handleAnalyze(stock, timeframe, currency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, timeframe, currency]);

  useEffect(() => {
    if (analysis && chartContainerRef.current) {
      renderChart();
    }
    return () => {
      cleanupChart();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, chartType]);

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
    }
  };

  const fetchMarketStatus = async () => {
    try {
      const status = await getMarketStatus();
      setMarketStatus(status);
      if (!status.is_open) {
        setRealtime(false);
      }
    } catch (error) {
      console.error('Failed to fetch market status:', error);
    }
  };

  const handleAnalyze = async (selectedStock = stock, selectedTimeframe = timeframe, selectedCurrency = currency) => {
    if (!selectedStock) {
      toast.error('Please select a stock');
      return;
    }

    try {
      setLoading(true);
      setChartError(null);
      const request = {
        symbol: selectedStock.symbol,
        exchange: selectedStock.exchange || 'NSE',
        timeframe: selectedTimeframe,
        realtime: realtime && marketStatus?.is_open,
        currency: selectedCurrency,
      };
      
      const result = await analyzeStock(request);
      setAnalysis(result);
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (symbol) => {
    const found = stockList.find(s => s.symbol === symbol) || { symbol, name: symbol, exchange: 'NSE' };
    setStock(found);
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
        height: 480,
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
        },
        timeScale: {
          borderColor: '#e2e8f0',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // Deduplicate, sort and sanitize candle data for Lightweight Charts
      const rawData = analysis.chart_data;
      const seenTimes = new Set();
      const sanitizedCandles = [];

      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        let timestamp = Math.floor(new Date(item.datetime).getTime() / 1000);
        
        // Ensure valid positive number
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

      // Sort strictly in ascending order
      sanitizedCandles.sort((a, b) => a.time - b.time);

      if (sanitizedCandles.length === 0) {
        throw new Error('No valid price points available to render');
      }

      // Add series using v5 addSeries API
      if (chartType === 'line') {
        const lineSeries = chart.addSeries(LineSeries, {
          color: '#10B981',
          lineWidth: 2,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.05,
          },
        });
        lineSeries.setData(sanitizedCandles.map(d => ({ time: d.time, value: d.value })));
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

  if (!stock) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Stock Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} data-testid="back-button">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <div className="p-2 bg-primary/10 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold tracking-tight hidden sm:inline">Stock Market Future</h1>
              </div>

              <nav className="hidden md:flex items-center gap-2 ml-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/mutual-funds')}>
                  Mutual Funds
                </Button>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden lg:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Stock Info & Switcher Bar */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-border/40 flex-wrap">
            <div className="flex items-center gap-3">
              <Select value={stock?.symbol || 'RELIANCE'} onValueChange={handleStockChange}>
                <SelectTrigger className="w-56 font-bold text-base">
                  <SelectValue placeholder="Select Stock / Index" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {stockList.map(s => (
                    <SelectItem key={s.symbol} value={s.symbol}>
                      {s.symbol} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-muted-foreground">
                {stock?.exchange || 'NSE'}
              </span>
            </div>

            {analysis && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {currencySymbol}{analysis.current_price?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  analysis.prediction?.trend === 'UP' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {analysis.prediction?.trend === 'UP' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span>{analysis.prediction?.trend || 'NEUTRAL'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Timeframe:</span>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-32" data-testid="timeframe-selector">
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

            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md">
              <Switch
                checked={realtime}
                onCheckedChange={setRealtime}
                disabled={!marketStatus?.is_open}
                data-testid="realtime-toggle"
              />
              <span className="text-xs">Real-Time</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Chart:</span>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-36" data-testid="chart-type-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Currency:</span>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" onClick={() => handleAnalyze(stock, timeframe, currency)} disabled={loading} data-testid="analyze-button">
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Re-Analyze'
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Price Action Chart ({chartType === 'candlestick' ? 'Candlestick' : 'Line'})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stock.name} ({stock.symbol}) • {timeframe} Timeframe
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {chartError ? (
                  <div className="h-[480px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg p-6 text-center border border-dashed">
                    <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Chart Display Notice</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">{chartError}</p>
                    <Button size="sm" onClick={() => renderChart()}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Retry Chart Render
                    </Button>
                  </div>
                ) : (
                  <div ref={chartContainerRef} className="w-full h-[480px] rounded-lg overflow-hidden bg-white" data-testid="chart-container" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Prediction & Sentiment Info */}
          <div className="space-y-6">
            {analysis && (
              <>
                {/* AI Prediction Card */}
                <Card data-testid="prediction-card" className="shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg font-bold flex items-center justify-between">
                      <span>AI Model Prediction</span>
                      <span className="text-xs font-normal px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {analysis.prediction?.model || 'Ensemble Model'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <div>
                        <p className="text-xs text-muted-foreground">Signal Recommendation</p>
                        <p className={`text-2xl font-black tracking-wide ${analysis.prediction?.signal === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                          {analysis.prediction?.signal}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {((analysis.prediction?.confidence || 0.85) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Predicted Target Price:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {currencySymbol}{analysis.prediction?.predicted_price?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Entry Range:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {currencySymbol}{analysis.prediction?.entry?.[0]?.toLocaleString('en-IN')} - {currencySymbol}{analysis.prediction?.entry?.[1]?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Target Range:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {currencySymbol}{analysis.prediction?.target?.[0]?.toLocaleString('en-IN')} - {currencySymbol}{analysis.prediction?.target?.[1]?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Stop Loss:</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {currencySymbol}{analysis.prediction?.stop_loss?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* News Sentiment */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Newspaper className="h-5 w-5 text-primary" />
                      Market Sentiment & News
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Sentiment Bias</p>
                        <p className={`text-lg font-bold ${
                          analysis.sentiment?.sentiment_label === 'Positive' ? 'text-green-600' :
                          analysis.sentiment?.sentiment_label === 'Negative' ? 'text-red-600' :
                          'text-amber-600'
                        }`}>
                          {analysis.sentiment?.sentiment_label || 'Neutral'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Sentiment Score</p>
                        <p className="text-sm font-semibold">{analysis.sentiment?.overall_sentiment || 0.75} / 1.0</p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {analysis.news?.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md text-xs border border-border/40 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                          <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{item.title}</p>
                          <div className="flex justify-between items-center mt-2 text-muted-foreground">
                            <span>{item.source}</span>
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
      </div>
    </div>
  );
}
