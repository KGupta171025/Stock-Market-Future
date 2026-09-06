import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getIndices, getMarketStatus, getStocksList } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, TrendingDown, LogOut, Search, BarChart3, Layers, Sparkles, Activity } from 'lucide-react';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import LiveAutoRefreshBar from '../components/LiveAutoRefreshBar';
import { TelemetryBadge } from '../components/TelemetryBadgeBar';

const SECTOR_CATEGORIES = ['All', 'Upcoming IPOs', 'Banking', 'IT', 'Energy', 'FMCG', 'Auto', 'ETFs', 'Large Cap'];

export default function Dashboard() {
  const [indices, setIndices] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2s Fast Auto-reload
  const [isPaused, setIsPaused] = useState(false);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [priceFlash, setPriceFlash] = useState({});
  const prevPricesRef = useRef({});
  const isFetchingRef = useRef(false);

  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Initial load
  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  // Continuous Auto-reload Interval
  useEffect(() => {
    if (isPaused || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchDashboardData(true);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, isPaused]);

  const fetchDashboardData = async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (!isSilent) setLoading(true);
      else setIsSilentRefreshing(true);

      const [indicesData, statusData, stocksData] = await Promise.all([
        getIndices(),
        getMarketStatus(),
        getStocksList()
      ]);

      const newIndices = indicesData.indices || [];
      const newStocks = stocksData.stocks || [];

      // Calculate micro price flashes
      const newFlashes = {};
      newStocks.forEach((s) => {
        const prevPrice = prevPricesRef.current[s.symbol];
        if (prevPrice !== undefined && prevPrice !== s.price) {
          newFlashes[s.symbol] = s.price > prevPrice ? 'up' : 'down';
        }
        prevPricesRef.current[s.symbol] = s.price;
      });

      newIndices.forEach((idx) => {
        const prevPrice = prevPricesRef.current[idx.symbol];
        if (prevPrice !== undefined && prevPrice !== idx.price) {
          newFlashes[idx.symbol] = idx.price > prevPrice ? 'up' : 'down';
        }
        prevPricesRef.current[idx.symbol] = idx.price;
      });

      if (Object.keys(newFlashes).length > 0) {
        setPriceFlash(newFlashes);
        setTimeout(() => setPriceFlash({}), 700);
      }

      setIndices(newIndices);
      setMarketStatus(statusData);
      setStocks(newStocks);
      setLastUpdated(Date.now());
    } catch (error) {
      if (!isSilent) {
        toast.error('Failed to fetch dashboard data');
      }
      console.error(error);
    } finally {
      if (!isSilent) setLoading(false);
      setIsSilentRefreshing(false);
      isFetchingRef.current = false;
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

  const handleStockSelect = (stock) => {
    navigate('/analysis', { state: { stock } });
  };

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = 
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stock.sector && stock.sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (stock.category && stock.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Upcoming IPOs') {
      return stock.category === 'Upcoming IPO' || stock.ipo_status || (stock.exchange && stock.exchange.includes('Upcoming'));
    }
    if (selectedCategory === 'Large Cap') return stock.category === 'Large Cap' || !stock.category;
    return (stock.category || '').toLowerCase() === selectedCategory.toLowerCase() ||
           (stock.sector || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3.5 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight leading-tight">Stock Market Future</h1>
                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">AI-Powered Global Equity & Fund Intelligence</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1.5 ml-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')} className="font-semibold">
                🇮🇳 IND Stocks
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/us-stocks')} className="text-muted-foreground hover:text-foreground">
                🇺🇸 US Stocks
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/mutual-funds')} className="text-muted-foreground hover:text-foreground">
                <Layers className="h-4 w-4 mr-1.5" />
                Mutual Funds
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/analysis')} className="text-muted-foreground hover:text-foreground">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Stock Analysis
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {marketStatus && (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-border/50">
                <div className={`w-2 h-2 rounded-full ${marketStatus.is_open ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-xs font-semibold">
                  {marketStatus.is_open ? 'NSE/BSE Open' : 'Market Closed'}
                </span>
              </div>
            )}

            <span className="text-xs text-muted-foreground hidden lg:inline font-mono">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6" data-testid="dashboard-container">
        {/* Market Benchmark Indices Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-3.5 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Indian Benchmark Indices
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time benchmark levels with Last Traded Price (LTP), intraday range, and continuous live data streaming
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <LiveAutoRefreshBar
                interval={refreshInterval}
                onIntervalChange={setRefreshInterval}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused((prev) => !prev)}
                onManualRefresh={() => fetchDashboardData(false)}
                lastUpdated={lastUpdated}
                isRefreshing={isSilentRefreshing}
              />

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-xs px-3 py-1 rounded-lg bg-white dark:bg-slate-900 text-foreground font-bold shadow-sm transition-colors"
                >
                  🇮🇳 IND Market
                </button>
                <button
                  onClick={() => navigate('/us-stocks')}
                  className="text-xs px-3 py-1 rounded-lg text-muted-foreground hover:text-foreground font-semibold transition-colors"
                >
                  🇺🇸 US Market
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {indices.map((index) => {
              const isPositive = index.change >= 0;
              const flash = priceFlash[index.symbol];
              return (
                <Card 
                  key={index.symbol} 
                  className={`hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 group border-border/80 bg-white dark:bg-slate-900 ${
                    flash === 'up' ? 'ring-2 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30' : flash === 'down' ? 'ring-2 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30' : ''
                  }`}
                  onClick={() => handleStockSelect({
                    symbol: index.symbol,
                    name: index.name || index.symbol,
                    exchange: index.exchange || 'INDEX',
                    price: index.price,
                    change: index.change,
                    change_percent: index.change_percent,
                    high: index.high,
                    low: index.low,
                    prev_close: index.prev_close,
                    volume: index.volume
                  })}
                  data-testid={`index-card-${index.symbol}`}
                >
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                        {index.symbol}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{index.name || 'Benchmark Index'}</p>
                    </div>
                    <TelemetryBadge source={index.data_source || 'Exchange Real-Time Feed'} status={index.status || (marketStatus?.is_open ? 'Live' : 'Market Closed')} />
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-baseline mb-2">
                      <p className={`text-3xl font-extrabold tracking-tight transition-colors duration-300 ${
                        flash === 'up' ? 'text-emerald-600 dark:text-emerald-400' : flash === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50'
                      }`}>
                        ₹{index.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isPositive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}>
                        {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        <span>
                          {isPositive ? '+' : ''}{index.change?.toFixed(2)} ({isPositive ? '+' : ''}{index.change_percent?.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                      <span>High: ₹{index.high?.toLocaleString('en-IN')}</span>
                      <span>Low: ₹{index.low?.toLocaleString('en-IN')}</span>
                      <span className="text-primary font-semibold group-hover:underline flex items-center gap-0.5">
                        Analyze <BarChart3 className="h-3 w-3 inline ml-0.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Stocks Explorer Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Live Equities Watchlist & LTP Details
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Accurate Last Traded Price (LTP), daily price changes, volumes, and direct AI predictive signals
              </p>
            </div>

            {/* Search Box */}
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search stocks by symbol, name, sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-900 text-sm"
                data-testid="stock-search-input"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {SECTOR_CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="text-xs h-8 px-3 rounded-full"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Stocks Cards Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Syncing live market data...</p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border p-8">
              <p className="text-muted-foreground text-sm font-medium">No stocks found matching "{searchQuery}"</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
                Reset Search
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStocks.map((stock) => {
                const isPositive = stock.change >= 0;
                const high = stock.high || stock.price * 1.01;
                const low = stock.low || stock.price * 0.99;
                const rangePercent = Math.max(0, Math.min(100, ((stock.price - low) / (high - low || 1)) * 100));
                const flash = priceFlash[stock.symbol];

                return (
                  <Card 
                    key={stock.symbol} 
                    className={`hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1 group bg-white dark:bg-slate-900 border-border/80 flex flex-col justify-between ${
                      flash === 'up' ? 'ring-2 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30' : flash === 'down' ? 'ring-2 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30' : ''
                    }`}
                    onClick={() => handleStockSelect(stock)}
                    data-testid={`stock-card-${stock.symbol}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                              {stock.symbol}
                            </CardTitle>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              stock.category === 'Upcoming IPO' 
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {stock.category === 'Upcoming IPO' ? '🚀 Upcoming IPO' : (stock.exchange || 'NSE')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{stock.name}</p>
                        </div>
                        <TelemetryBadge source={stock.category === 'Upcoming IPO' ? 'Official IPO Prospectus' : (stock.data_source || 'Exchange Real-Time Feed')} status={stock.status || (marketStatus?.is_open ? 'Live' : 'Market Closed')} />
                      </div>
                    </CardHeader>

                    <CardContent className="pt-1">
                      {/* LTP & Price Change */}
                      <div className="flex justify-between items-baseline mb-3">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                            {stock.category === 'Upcoming IPO' ? 'Expected Listing / Cap' : 'Last Traded Price'}
                          </span>
                          <span className={`text-2xl font-bold transition-colors duration-300 ${
                            flash === 'up' ? 'text-emerald-600 dark:text-emerald-400' : flash === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            ₹{stock.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          stock.category === 'Upcoming IPO'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : isPositive 
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        }`}>
                          {stock.category === 'Upcoming IPO' ? <Sparkles className="h-3.5 w-3.5" /> : isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          <span>
                            {stock.category === 'Upcoming IPO' 
                              ? `GMP ${stock.gmp || `+${stock.change_percent}%`}`
                              : `${isPositive ? '+' : ''}${stock.change?.toFixed(2)} (${isPositive ? '+' : ''}${stock.change_percent?.toFixed(2)}%)`
                            }
                          </span>
                        </div>
                      </div>

                      {/* Day / Issue Range Bar */}
                      <div className="space-y-1 mb-3 bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-border/40">
                        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                          <span>{stock.category === 'Upcoming IPO' ? `Band Min: ₹${low}` : `Low: ₹${low?.toLocaleString('en-IN')}`}</span>
                          <span>{stock.category === 'Upcoming IPO' ? `Band Max: ₹${high}` : `High: ₹${high?.toLocaleString('en-IN')}`}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                          <div 
                            className={`h-full rounded-full ${stock.category === 'Upcoming IPO' ? 'bg-purple-500' : isPositive ? 'bg-green-500' : 'bg-red-500'}`} 
                            style={{ width: `${rangePercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom stats row */}
                      <div className="pt-2 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                        {stock.category === 'Upcoming IPO' ? (
                          <>
                            <span>Lot Size: <strong className="text-purple-600 dark:text-purple-400 font-semibold">{stock.lot_size || 15} shares</strong></span>
                            <span>Est M-Cap: <strong className="text-slate-700 dark:text-slate-300">{stock.market_cap || '₹25,000 Cr'}</strong></span>
                          </>
                        ) : (
                          <>
                            <span>Vol: <strong className="text-slate-700 dark:text-slate-300">{stock.volume || '5.2M'}</strong></span>
                            <span>M-Cap: <strong className="text-slate-700 dark:text-slate-300">{stock.market_cap || 'Large Cap'}</strong></span>
                          </>
                        )}
                        <span className="text-primary font-semibold group-hover:underline flex items-center gap-0.5">
                          Analyze →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
