import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUSIndices, getUSMarketStatus, getUSStocksList } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  LogOut,
  Search,
  BarChart3,
  Layers,
  Sparkles,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

const US_SECTOR_CATEGORIES = ['All', 'Mega-Tech', 'Semiconductors', 'Finance', 'EV & Auto', 'Consumer & Retail', 'ETFs'];

export default function USStocksPage() {
  const [indices, setIndices] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUSDashboardData();
  }, []);

  const fetchUSDashboardData = async () => {
    try {
      setLoading(true);
      const [indicesData, statusData, stocksData] = await Promise.all([
        getUSIndices(),
        getUSMarketStatus(),
        getUSStocksList()
      ]);
      setIndices(indicesData.indices || []);
      setMarketStatus(statusData);
      setStocks(stocksData.stocks || []);
    } catch (error) {
      toast.error('Failed to fetch US market data');
      console.error(error);
    } finally {
      setLoading(false);
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
    navigate('/analysis', {
      state: {
        stock: {
          ...stock,
          currency: 'USD',
        },
      },
    });
  };

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stock.sector && stock.sector.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedCategory === 'All') return true;
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground">
                🇮🇳 IND Stocks
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/us-stocks')} className="font-semibold">
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
                  {marketStatus.is_open ? 'NYSE/NASDAQ Open' : 'US Market Closed'}
                </span>
                <span className="text-[10px] text-muted-foreground hidden xl:inline">({marketStatus.current_time_est})</span>
              </div>
            )}

            <span className="text-xs text-muted-foreground hidden lg:inline font-mono">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* US Benchmark Indices Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200">
                  🇺🇸 Wall Street & Tech Indices
                </Badge>
              </div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 mt-1">
                <Activity className="h-5 w-5 text-primary" />
                US Benchmark Indices
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time Wall Street benchmark levels with Last Traded Price (LTP in USD $), intraday range, and predictive analytics
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground font-semibold transition-colors"
              >
                🇮🇳 IND Market
              </button>
              <button
                onClick={() => navigate('/us-stocks')}
                className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-foreground font-bold shadow-sm transition-colors"
              >
                🇺🇸 US Market
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {indices.map((index) => {
              const isPositive = index.change >= 0;
              return (
                <Card
                  key={index.symbol}
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1 group border-border/80 bg-white dark:bg-slate-900"
                  onClick={() => handleStockSelect({
                    symbol: index.symbol,
                    name: index.name || index.symbol,
                    exchange: index.exchange || 'US Index',
                    price: index.price,
                    change: index.change,
                    change_percent: index.change_percent,
                    currency: 'USD',
                  })}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                          {index.symbol}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{index.name}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {index.exchange}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                        ${index.price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                        isPositive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}>
                        {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        <span>{isPositive ? '+' : ''}{index.change?.toFixed(2)} ({isPositive ? '+' : ''}{index.change_percent?.toFixed(2)}%)</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border/40 font-mono">
                      <span>Low: ${index.low?.toLocaleString('en-US')}</span>
                      <span>High: ${index.high?.toLocaleString('en-US')}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Live Equities Watchlist & LTP Details */}
        <section>
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                US Equities Watchlist & Wall Street LTP Details
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time NASDAQ & NYSE stock prices with daily movements, market caps in USD, and direct AI predictive signals
              </p>
            </div>

            <div className="w-full md:w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search US stocks (AAPL, NVDA, TSLA)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {US_SECTOR_CATEGORIES.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs h-8 px-3 rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Fetching synchronized US equities and NASDAQ quotes...</p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border p-8">
              <p className="text-muted-foreground text-sm font-medium">No US stocks matching your search.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStocks.map((stock) => {
                const isPositive = (stock.change || 0) >= 0;
                const rangePercent = Math.min(
                  100,
                  Math.max(
                    0,
                    (((stock.price || 100) - (stock.low || stock.price * 0.98)) /
                      ((stock.high || stock.price * 1.02) - (stock.low || stock.price * 0.98))) *
                      100
                  )
                );

                return (
                  <Card
                    key={stock.symbol}
                    onClick={() => handleStockSelect(stock)}
                    className="hover:shadow-lg hover:border-primary/50 transition-all duration-200 bg-white dark:bg-slate-900 border-border/80 flex flex-col justify-between cursor-pointer group"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                              {stock.symbol}
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {stock.exchange || 'NASDAQ'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{stock.name}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-transparent">
                          {stock.category || stock.sector}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-2">
                      <div className="flex justify-between items-baseline mb-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-border/40">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Last Traded Price</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                            ${stock.price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isPositive 
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        }`}>
                          {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          <span>
                            {isPositive ? '+' : ''}{stock.change?.toFixed(2)} ({isPositive ? '+' : ''}{stock.change_percent?.toFixed(2)}%)
                          </span>
                        </div>
                      </div>

                      {/* Day Intraday Range Meter */}
                      <div className="mb-3 space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>Low: ${stock.low || (stock.price * 0.985).toFixed(2)}</span>
                          <span>High: ${stock.high || (stock.price * 1.015).toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${rangePercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                        <span>Vol: <strong className="text-slate-800 dark:text-slate-200">{stock.volume || '15.4M'}</strong></span>
                        <span>M-Cap: <strong className="text-slate-800 dark:text-slate-200">{stock.market_cap || '$1.2T'}</strong></span>
                        <span className="text-primary font-semibold flex items-center gap-0.5 group-hover:underline">
                          Analyze <ArrowUpRight className="h-3.5 w-3.5" />
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
