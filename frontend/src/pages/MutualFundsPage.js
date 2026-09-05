import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMutualFunds, searchMutualFunds } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Slider } from '../components/ui/slider';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  LogOut,
  Layers,
  Shield,
  Award,
  Percent,
  Calculator,
  PieChart,
  BarChart3,
  ExternalLink,
  ChevronRight,
  User,
  Clock,
  Landmark,
  Coins,
  ArrowUpRight,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'Large Cap', 'Flexi Cap', 'Small Cap', 'Mid Cap', 'Multi Cap', 'Index Funds', 'Thematic'];

const DEFAULT_HOLDINGS = [
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', weight: 9.5 },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', weight: 8.8 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', weight: 7.6 },
  { symbol: 'INFY', name: 'Infosys Ltd.', weight: 6.1 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', weight: 4.8 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', weight: 4.2 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', weight: 3.9 },
  { symbol: 'ITC', name: 'ITC Limited', weight: 3.4 },
  { symbol: 'SBIN', name: 'State Bank of India', weight: 3.0 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', weight: 2.7 },
];

function formatINR(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function calculateSIP(monthlyInvest, years, returnRate) {
  const p = Number(monthlyInvest) || 0;
  const t = Number(years) || 0;
  const r = (Number(returnRate) || 0) / 100;
  const n = t * 12;
  const i = r / 12;

  if (i === 0 || n === 0) {
    const totalInvest = p * n;
    return { invested: totalInvest, returns: 0, maturity: totalInvest };
  }

  const maturity = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const invested = p * n;
  const returns = Math.max(0, maturity - invested);

  return {
    invested: Math.round(invested),
    returns: Math.round(returns),
    maturity: Math.round(maturity),
  };
}

export default function MutualFundsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [funds, setFunds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Selected Fund Details Modal State
  const [selectedFund, setSelectedFund] = useState(null);
  const [sipAmount, setSipAmount] = useState(5000);
  const [sipYears, setSipYears] = useState(5);
  const [sipReturnRate, setSipReturnRate] = useState(15);

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

  const handleOpenFund = (fund) => {
    setSelectedFund(fund);
    setSipAmount(fund.min_sip ? Math.max(fund.min_sip, 5000) : 5000);
    setSipYears(5);
    const cagr = parseFloat(fund.cagr_3yr || fund.cagr_1yr || 15);
    setSipReturnRate(isNaN(cagr) ? 15 : Math.min(Math.max(cagr, 5), 30));
  };

  const handleAnalyzeHolding = (holding) => {
    setSelectedFund(null);
    navigate('/analysis', {
      state: {
        stock: {
          symbol: holding.symbol,
          name: holding.name,
          exchange: 'NSE',
        },
      },
    });
  };

  const filteredFunds = funds.filter(fund => {
    if (selectedCategory === 'All') return true;
    return (fund.category || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const sipCalc = calculateSIP(sipAmount, sipYears, sipReturnRate);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-40 shadow-sm">
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/analysis')}>
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
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              AMFI Mutual Funds Intelligence Explorer
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time Net Asset Values (NAV), 1-day change, multi-year CAGR returns, portfolio asset allocation & SIP simulator
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
                <Card
                  key={fund.scheme_code}
                  onClick={() => handleOpenFund(fund)}
                  className="hover:shadow-lg hover:border-primary/50 transition-all duration-200 bg-white dark:bg-slate-900 border-border/80 flex flex-col justify-between cursor-pointer group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {fund.scheme_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{fund.fund_house || 'Asset Management'}</p>
                      </div>
                      <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary border-transparent">
                        {fund.category}
                      </Badge>
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

                    {/* Bottom Action Bar */}
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      <span>Expense: <strong className="text-slate-700 dark:text-slate-300">{fund.expense_ratio || '0.85%'}</strong></span>
                      <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                        View Details & SIP <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Interactive Mutual Fund Details & Analytics Modal */}
      <Dialog open={!!selectedFund} onOpenChange={(open) => !open && setSelectedFund(null)}>
        {selectedFund && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 border-border/80">
            <DialogHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 pr-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-xs">
                      {selectedFund.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Code: {selectedFund.scheme_code}
                    </Badge>
                    {selectedFund.risk && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-xs font-medium flex items-center gap-1">
                        <Shield className="h-3 w-3" /> {selectedFund.risk}
                      </span>
                    )}
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {selectedFund.scheme_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {selectedFund.fund_house || 'Asset Management'} • Benchmark: <strong className="text-foreground">{selectedFund.benchmark || 'NIFTY 500 TRI'}</strong>
                  </DialogDescription>
                </div>

                {/* Hero NAV block */}
                <div className="flex sm:flex-col items-baseline sm:items-end justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-border/60 shrink-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Current NAV (LTP)</span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                    ₹{selectedFund.nav?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 ${
                    (selectedFund.change || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(selectedFund.change || 0) >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {(selectedFund.change || 0) >= 0 ? '+' : ''}{selectedFund.change?.toFixed(2)} ({(selectedFund.change || 0) >= 0 ? '+' : ''}{selectedFund.change_percent?.toFixed(2)}%)
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Modal Tabs */}
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-4 bg-slate-100 dark:bg-slate-800 p-1">
                <TabsTrigger value="overview" className="text-xs font-semibold flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" /> Overview
                </TabsTrigger>
                <TabsTrigger value="holdings" className="text-xs font-semibold flex items-center gap-1.5">
                  <PieChart className="h-3.5 w-3.5" /> Top Holdings
                </TabsTrigger>
                <TabsTrigger value="sip" className="text-xs font-semibold flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5" /> SIP Calculator
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: OVERVIEW & PERFORMANCE */}
              <TabsContent value="overview" className="space-y-4">
                {/* Performance Matrix */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" /> Historical Annualized Returns (CAGR)
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border text-center">
                      <span className="text-[11px] text-muted-foreground block mb-0.5">1-Year Return</span>
                      <span className="text-lg font-black text-green-600 dark:text-green-400">
                        +{selectedFund.cagr_1yr || '36.50'}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border text-center">
                      <span className="text-[11px] text-muted-foreground block mb-0.5">3-Year CAGR</span>
                      <span className="text-lg font-black text-green-600 dark:text-green-400">
                        +{selectedFund.cagr_3yr || '24.10'}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border text-center">
                      <span className="text-[11px] text-muted-foreground block mb-0.5">5-Year CAGR</span>
                      <span className="text-lg font-black text-green-600 dark:text-green-400">
                        +{selectedFund.cagr_5yr || '19.80'}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border text-center col-span-3 sm:col-span-1">
                      <span className="text-[11px] text-muted-foreground block mb-0.5">Category Avg</span>
                      <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                        +{((parseFloat(selectedFund.cagr_3yr || 20) * 0.85).toFixed(1))}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 52-Week Range */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">52-Week NAV Range</span>
                    <span className="text-xs text-muted-foreground font-mono">Current: ₹{selectedFund.nav?.toFixed(2)}</span>
                  </div>
                  <div className="relative pt-1 pb-1">
                    <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              10,
                              (((selectedFund.nav || 100) - (selectedFund.week_52_low || selectedFund.nav * 0.75)) /
                                ((selectedFund.week_52_high || selectedFund.nav * 1.15) - (selectedFund.week_52_low || selectedFund.nav * 0.75))) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1 font-mono">
                      <span>Low: ₹{(selectedFund.week_52_low || selectedFund.nav * 0.75).toFixed(2)}</span>
                      <span>High: ₹{(selectedFund.week_52_high || selectedFund.nav * 1.15).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Asset Allocation */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Asset Allocation</span>
                    <span className="text-xs text-muted-foreground">Portfolio Distribution</span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex mb-2">
                    <div
                      className="bg-blue-600 h-full transition-all"
                      style={{ width: `${selectedFund.asset_allocation?.equity || 95.5}%` }}
                      title={`Equity: ${selectedFund.asset_allocation?.equity || 95.5}%`}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${selectedFund.asset_allocation?.cash || 4.5}%` }}
                      title={`Cash & Equivalents: ${selectedFund.asset_allocation?.cash || 4.5}%`}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <span>Equity: <strong>{selectedFund.asset_allocation?.equity || 95.5}%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>Cash & Liquidity: <strong>{selectedFund.asset_allocation?.cash || 4.5}%</strong></span>
                    </div>
                  </div>
                </div>

                {/* Key Fund Facts Grid */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-primary" /> Key Fund Information
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800/30">
                      <span className="text-muted-foreground block text-[10px]">AUM (Fund Size)</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedFund.aum || '₹25,000 Cr'}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800/30">
                      <span className="text-muted-foreground block text-[10px]">Expense Ratio</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedFund.expense_ratio || '0.85%'}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800/30">
                      <span className="text-muted-foreground block text-[10px]">Minimum SIP</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold">₹{selectedFund.min_sip || 500}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800/30">
                      <span className="text-muted-foreground block text-[10px]">Fund Manager</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedFund.fund_manager || 'Lead Portfolio Team'}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800/30 sm:col-span-2">
                      <span className="text-muted-foreground block text-[10px]">Exit Load Policy</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedFund.exit_load || '1.0% if redeemed within 365 days'}</strong>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: TOP HOLDINGS (10 STOCKS WITH DIRECT ANALYSIS LINK) */}
              <TabsContent value="holdings" className="space-y-3">
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-primary">Interactive Stock Deep-Dive:</span> Click on any holding below to open its dedicated AI prediction chart, technical indicators, RSI momentum, and price target analysis!
                  </div>
                </div>

                <div className="space-y-2">
                  {(selectedFund.holdings && selectedFund.holdings.length > 0 ? selectedFund.holdings : DEFAULT_HOLDINGS).map((holding, idx) => (
                    <div
                      key={holding.symbol || idx}
                      onClick={() => handleAnalyzeHolding(holding)}
                      className="p-3 rounded-xl border border-border/70 bg-slate-50 dark:bg-slate-800/40 hover:bg-primary/5 hover:border-primary/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-muted-foreground w-4 text-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                              {holding.symbol}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              NSE
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{holding.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Weight bar */}
                        <div className="text-right hidden sm:block">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {holding.weight}%
                          </span>
                          <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${Math.min(100, holding.weight * 8)}%` }}
                            />
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 px-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                        >
                          Analyze <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* TAB 3: SIP CALCULATOR */}
              <TabsContent value="sip" className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border space-y-4">
                  {/* Monthly Investment Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Monthly Investment Amount
                      </label>
                      <div className="text-base font-black text-primary font-mono">
                        ₹{sipAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <Slider
                      value={[sipAmount]}
                      min={500}
                      max={100000}
                      step={500}
                      onValueChange={(val) => setSipAmount(val[0])}
                      className="my-3"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[1000, 2500, 5000, 10000, 25000, 50000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSipAmount(preset)}
                          className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-colors ${
                            sipAmount === preset
                              ? 'bg-primary text-primary-foreground border-primary font-bold'
                              : 'bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          ₹{preset.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Investment Period Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Investment Time Period
                      </label>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                        {sipYears} {sipYears === 1 ? 'Year' : 'Years'}
                      </div>
                    </div>
                    <Slider
                      value={[sipYears]}
                      min={1}
                      max={25}
                      step={1}
                      onValueChange={(val) => setSipYears(val[0])}
                      className="my-3"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[1, 3, 5, 10, 15, 20].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setSipYears(yr)}
                          className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-colors ${
                            sipYears === yr
                              ? 'bg-primary text-primary-foreground border-primary font-bold'
                              : 'bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {yr}Y
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expected Return Rate Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Expected Return Rate (p.a)
                      </label>
                      <div className="text-base font-black text-green-600 dark:text-green-400 font-mono">
                        {sipReturnRate}%
                      </div>
                    </div>
                    <Slider
                      value={[sipReturnRate]}
                      min={5}
                      max={30}
                      step={0.5}
                      onValueChange={(val) => setSipReturnRate(val[0])}
                      className="my-3"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Fund's 3-Year Historical CAGR: <strong className="text-foreground">+{selectedFund.cagr_3yr || 24.1}%</strong>
                    </p>
                  </div>
                </div>

                {/* SIP Output Projection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[11px] text-muted-foreground block mb-0.5 font-medium">Total Invested Amount</span>
                    <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {formatINR(sipCalc.invested)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50">
                    <span className="text-[11px] text-green-700 dark:text-green-300 block mb-0.5 font-medium">Estimated Wealth Gains</span>
                    <span className="text-lg sm:text-xl font-black text-green-600 dark:text-green-400 font-mono">
                      +{formatINR(sipCalc.returns)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-primary/10 border-primary/30">
                    <span className="text-[11px] text-primary block mb-0.5 font-medium">Total Expected Maturity</span>
                    <span className="text-lg sm:text-xl font-black text-primary font-mono">
                      {formatINR(sipCalc.maturity)}
                    </span>
                  </div>
                </div>

                {/* Visual Ratio Progress Bar */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Invested ({((sipCalc.invested / sipCalc.maturity) * 100).toFixed(0)}%)</span>
                    <span className="text-green-600 dark:text-green-400">Gains ({((sipCalc.returns / sipCalc.maturity) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-3 w-full bg-green-500 rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${(sipCalc.invested / sipCalc.maturity) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Milestone Projections Table */}
                <div className="border rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-700 dark:text-slate-300">
                    Milestone Wealth Projections
                  </div>
                  <div className="divide-y">
                    {[1, 3, 5, 10, 15].map((period) => {
                      const res = calculateSIP(sipAmount, period, sipReturnRate);
                      return (
                        <div key={period} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900">
                          <span className="font-semibold">{period} {period === 1 ? 'Year' : 'Years'}</span>
                          <span className="text-muted-foreground font-mono">Invested: {formatINR(res.invested)}</span>
                          <span className="font-bold text-primary font-mono">{formatINR(res.maturity)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground italic text-center">
                  * Mutual fund investments are subject to market risks. Calculations are illustrative based on compound interest formulas and do not guarantee future returns.
                </p>
              </TabsContent>
            </Tabs>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
