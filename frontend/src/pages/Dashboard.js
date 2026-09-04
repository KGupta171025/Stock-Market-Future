import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getIndices, getMarketStatus, getStocksList } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, TrendingDown, LogOut, Search, BarChart3 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export default function Dashboard() {
  const [indices, setIndices] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [indicesData, statusData, stocksData] = await Promise.all([
        getIndices(),
        getMarketStatus(),
        getStocksList()
      ]);
      setIndices(indicesData.indices || []);
      setMarketStatus(statusData);
      setStocks(stocksData.stocks || []);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      console.error(error);
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

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Stock Market Future</h1>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/mutual-funds')}>
                Mutual Funds
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/mutual-funds')}>
              Explore Mutual Funds
            </Button>
            {marketStatus && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div className={`w-2 h-2 rounded-full ${marketStatus.is_open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-medium">
                  Market {marketStatus.is_open ? 'Open' : 'Closed'}
                </span>
              </div>
            )}
            <span className="text-xs text-muted-foreground hidden lg:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8" data-testid="dashboard-container">
        {/* Market Indices */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Market Indices</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click any index to view live chart, technical indicators & AI predictions</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {indices.map((index) => (
              <Card 
                key={index.symbol} 
                className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 group border-border/80"
                onClick={() => handleStockSelect({
                  symbol: index.symbol,
                  name: index.name || index.symbol,
                  exchange: index.exchange || 'INDEX'
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
                  <Button size="sm" variant="ghost" className="opacity-70 group-hover:opacity-100 group-hover:bg-primary/10 transition-all">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-3xl font-bold">₹{index.price?.toLocaleString('en-IN')}</p>
                      <div className={`flex items-center gap-1 mt-1 ${index.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {index.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span className="font-semibold">
                          {index.change >= 0 ? '+' : ''}{index.change} ({index.change_percent?.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 flex justify-between items-center text-xs text-muted-foreground">
                    <span>H: ₹{index.high?.toLocaleString('en-IN')}  L: ₹{index.low?.toLocaleString('en-IN')}</span>
                    <span className="text-primary font-medium group-hover:underline">Analyze →</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Stock Search & List */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Stocks</h2>
          </div>
          
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search stocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="stock-search-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStocks.map((stock) => (
              <Card 
                key={stock.symbol} 
                className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-1"
                onClick={() => handleStockSelect(stock)}
                data-testid={`stock-card-${stock.symbol}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                      <p className="text-sm text-muted-foreground">{stock.name}</p>
                    </div>
                    <Button size="sm" variant="ghost" data-testid={`analyze-btn-${stock.symbol}`}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{stock.exchange}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
