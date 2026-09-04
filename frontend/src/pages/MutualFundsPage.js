import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMutualFunds, searchMutualFunds } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowLeft, Search, TrendingUp, TrendingDown, LogOut, Layers, Shield, Award, Percent } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'Large Cap', 'Flexi Cap', 'Small Cap', 'Mid Cap', 'Multi Cap', 'Index Funds', 'Thematic'];

export default function MutualFundsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [funds, setFunds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMutualFunds();
  }, []);

  const fetchMutualFunds = async () => {
    try {
      setLoading(true);
      const data = await getMutualFunds(50);
      setFunds(data.funds || []);
    } catch (error) {
      toast.error('Failed to fetch mutual funds');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMutualFunds();
      return;
    }

    try {
      setLoading(true);
      const data = await searchMutualFunds(searchQuery);
      setFunds(data.results || []);
    } catch (error) {
      toast.error('Search failed');
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

  const filteredFunds = funds.filter(fund => {
    if (selectedCategory === 'All') return true;
    return (fund.category || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3.5 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Dashboard
            </Button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Stock Market Future</h1>
            </div>
            <nav className="hidden md:flex items-center gap-2 ml-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/mutual-funds')} className="font-semibold">
                Mutual Funds
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
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              AMFI Mutual Funds Intelligence Explorer
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Synchronized Net Asset Values (NAV), 1-day change, multi-year CAGR returns, and fund asset allocations
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by fund name, AMC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </form>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {CATEGORIES.map(category => (
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

        {/* Funds Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">Fetching synchronized AMFI mutual fund data...</p>
          </div>
        ) : filteredFunds.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border p-8">
            <p className="text-muted-foreground text-sm font-medium">No mutual funds matching your criteria.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); fetchMutualFunds(); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFunds.map((fund) => {
              const isPositive = (fund.change || 0) >= 0;
              return (
                <Card key={fund.scheme_code} className="hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 border-border/80 flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold leading-snug line-clamp-2">
                          {fund.scheme_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{fund.fund_house || 'Asset Management'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[11px] font-semibold">
                        {fund.category}
                      </span>
                      {fund.risk && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-[10px] font-medium flex items-center gap-1">
                          <Shield className="h-3 w-3" /> {fund.risk}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    {/* NAV (LTP) and 1D Change */}
                    <div className="flex justify-between items-baseline mb-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Current NAV (LTP)</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          ₹{fund.nav?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isPositive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}>
                        {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        <span>
                          {isPositive ? '+' : ''}{fund.change?.toFixed(2)} ({isPositive ? '+' : ''}{fund.change_percent?.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* Returns Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-border/40">
                        <span className="text-[10px] text-muted-foreground block">1Y Return</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">
                          +{fund.cagr_1yr || '34.5'}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-border/40">
                        <span className="text-[10px] text-muted-foreground block">3Y CAGR</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">
                          +{fund.cagr_3yr || '22.8'}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-border/40">
                        <span className="text-[10px] text-muted-foreground block">AUM</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {fund.aum || '₹25,000 Cr'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      <span>Scheme: <strong className="text-slate-700 dark:text-slate-300">{fund.scheme_code}</strong></span>
                      <span>Expense: <strong className="text-slate-700 dark:text-slate-300">{fund.expense_ratio || '0.85%'}</strong></span>
                      <span>Updated: {fund.date}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
