import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { analyzeStock, getMarketStatus, getStocksList } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Newspaper, BarChart3, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { createChart } from 'lightweight-charts';
import { useAuth } from '../contexts/AuthContext';

export default function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
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
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, chartType]);

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
    if (!chartContainerRef.current || !analysis) return;

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        borderColor: '#cccccc',
      },
    });

    chartRef.current = chart;

    // Prepare data
    const chartData = analysis.chart_data.map(d => ({
      time: new Date(d.datetime).getTime() / 1000,
      value: d.close,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    // Add series based on chart type
    let series;
    if (chartType === 'line') {
      series = chart.addLineSeries({
        color: '#10B981',
        lineWidth: 2,
      });
      series.setData(chartData.map(d => ({ time: d.time, value: d.value })));
    } else if (chartType === 'candlestick') {
      series = chart.addCandlestickSeries({
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });
      series.setData(chartData);
    }

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
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
                <SelectTrigger className="w-48 font-bold text-base">
                  <SelectValue placeholder="Select Stock" />
                </SelectTrigger>
                <SelectContent>
                  {stockList.map(s => (
                    <SelectItem key={s.symbol} value={s.symbol}>
                      {s.symbol} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {stock?.exchange || 'NSE'}
              </span>
            </div>

            {analysis && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-2xl font-bold">
                    {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'}
                    {analysis.current_price?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  analysis.prediction.trend === 'UP' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {analysis.prediction.trend === 'UP' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span>{analysis.prediction.trend}</span>
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
              {loading ? 'Analyzing...' : 'Re-Analyze'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={chartContainerRef} className="w-full" data-testid="chart-container" />
              </CardContent>
            </Card>
          </div>

          {/* Prediction & Info */}
          <div className="space-y-4">
            {analysis && (
              <>
                {/* Prediction Card */}
                <Card data-testid="prediction-card">
                  <CardHeader>
                    <CardTitle>Prediction</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Signal</p>
                      <p className={`text-2xl font-bold ${analysis.prediction.signal === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                        {analysis.prediction.signal}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-lg font-semibold">{(analysis.prediction.confidence * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Predicted Price</p>
                      <p className="text-lg font-semibold">₹{analysis.prediction.predicted_price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Entry Range</p>
                      <p className="text-sm">₹{analysis.prediction.entry[0]} - ₹{analysis.prediction.entry[1]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="text-sm text-green-600">₹{analysis.prediction.target[0]} - ₹{analysis.prediction.target[1]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stop Loss</p>
                      <p className="text-sm text-red-600">₹{analysis.prediction.stop_loss}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* News Sentiment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Newspaper className="h-5 w-5" />
                      News Sentiment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className={`text-xl font-bold ${
                        analysis.sentiment.sentiment_label === 'Positive' ? 'text-green-600' :
                        analysis.sentiment.sentiment_label === 'Negative' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {analysis.sentiment.sentiment_label}
                      </p>
                      <p className="text-sm text-muted-foreground">Score: {analysis.sentiment.overall_sentiment}</p>
                    </div>
                    <div className="space-y-2">
                      {analysis.news?.map((item, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-900 rounded text-sm">
                          <p className="font-medium">{item.title}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-muted-foreground">{item.source}</p>
                            <Clock className="h-3 w-3 text-muted-foreground" />
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
